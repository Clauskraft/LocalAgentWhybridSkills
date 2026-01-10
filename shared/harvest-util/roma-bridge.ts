/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                    ROMA HARVEST BRIDGE                                                                  ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  Udvider ROMA-motoren med harvest-planlægning og caching                                               ║
 * ║  Gør det muligt for ROMA at bruge WidgeTDC harvest-værktøjer som skills                                ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { RomaEngine, PlanningStrategy, RomaContext } from '../../apps/desktop/src/roma/RomaEngine';
import { HarvestMcpClient } from '../../packages/mcp-client/src/HarvestMcpClient';
import { 
  HARVEST_SKILL_REGISTRY, 
  getSkillsForRomaContext, 
  getSkillByMcpTool,
  HarvestSkill 
} from './skill-registry';
import { createRateLimiter, RateLimitConfig } from './index';

// ============================================================================
// CACHE LAYER
// ============================================================================

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttlMs: number;
  key: string;
}

class HarvestCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private maxSize: number = 100;
  private defaultTtlMs: number = 5 * 60 * 1000; // 5 minutes

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    // LRU eviction
    if (this.cache.size >= this.maxSize) {
      const oldest = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      if (oldest) this.cache.delete(oldest[0]);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttlMs: ttlMs || this.defaultTtlMs,
      key
    });
  }

  generateKey(tool: string, params: Record<string, unknown>): string {
    return `${tool}:${JSON.stringify(params)}`;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; maxSize: number } {
    return { size: this.cache.size, maxSize: this.maxSize };
  }
}

// ============================================================================
// ROMA HARVEST BRIDGE
// ============================================================================

export interface HarvestPlanStep {
  stepNumber: number;
  skill: HarvestSkill;
  parameters: Record<string, unknown>;
  estimatedDuration: string;
  rationale: string;
  dependsOn?: number[];
}

export interface HarvestPlan {
  goal: string;
  strategy: PlanningStrategy;
  steps: HarvestPlanStep[];
  totalEstimatedDuration: string;
  budgetEstimate: {
    apiCalls: number;
    estimatedTokens: number;
    costLevel: 'low' | 'medium' | 'high';
  };
  meta: {
    createdAt: string;
    engine: string;
  };
}

export interface HarvestExecutionResult {
  planId: string;
  success: boolean;
  results: Array<{
    stepNumber: number;
    tool: string;
    success: boolean;
    data?: unknown;
    error?: string;
    durationMs: number;
    cached: boolean;
  }>;
  totalDurationMs: number;
  cacheHits: number;
  cacheMisses: number;
}

export class RomaHarvestBridge {
  private romaEngine: RomaEngine;
  private harvestClient: HarvestMcpClient;
  private cache: HarvestCache;
  private rateLimiters: Map<string, ReturnType<typeof createRateLimiter>> = new Map();

  constructor(
    chatFn: (messages: { role: string; content: string }[]) => Promise<string>,
    widgetdcUrl?: string
  ) {
    this.romaEngine = new RomaEngine(chatFn);
    this.harvestClient = new HarvestMcpClient({ baseUrl: widgetdcUrl });
    this.cache = new HarvestCache();
  }

  /**
   * Plan a harvest mission using ROMA
   */
  async planHarvest(goal: string, strategy: PlanningStrategy = 'react'): Promise<HarvestPlan> {
    // Build context with available harvest skills
    const context: RomaContext = {
      availableSkills: getSkillsForRomaContext(),
      skillRegistry: HARVEST_SKILL_REGISTRY.map(s => ({
        id: s.id,
        name: s.name,
        mcpTool: s.mcpTool,
        category: s.category,
        costLevel: s.costLevel,
        requiresAuth: s.requiresAuth
      })),
      instructions: `
You have access to harvest skills that can collect data from various sources.
Each skill has a cost level (low/medium/high) and may require authentication.
Plan efficiently: use caching, avoid redundant calls, start with low-cost operations.
For each step, specify the skill ID, parameters, and rationale.
      `.trim()
    };

    const rawPlan = await this.romaEngine.plan(goal, strategy, context);

    // Transform to HarvestPlan
    const steps: HarvestPlanStep[] = [];
    
    if (rawPlan.plan && Array.isArray(rawPlan.plan)) {
      for (const step of rawPlan.plan) {
        const skillHint = step.tool_hint || step.skill_id || '';
        const skill = this.findMatchingSkill(skillHint);
        
        if (skill) {
          steps.push({
            stepNumber: step.step || steps.length + 1,
            skill,
            parameters: step.parameters || {},
            estimatedDuration: skill.estimatedDuration || 'unknown',
            rationale: step.description || step.rationale || '',
            dependsOn: step.depends_on
          });
        }
      }
    }

    // Estimate budget
    const apiCalls = steps.length;
    const estimatedTokens = apiCalls * 500; // Rough estimate
    const highCostSteps = steps.filter(s => s.skill.costLevel === 'high').length;
    const costLevel = highCostSteps > 2 ? 'high' : highCostSteps > 0 ? 'medium' : 'low';

    return {
      goal,
      strategy,
      steps,
      totalEstimatedDuration: this.estimateTotalDuration(steps),
      budgetEstimate: {
        apiCalls,
        estimatedTokens,
        costLevel
      },
      meta: {
        createdAt: new Date().toISOString(),
        engine: 'ROMA + HarvestBridge'
      }
    };
  }

  /**
   * Execute a harvest plan
   */
  async executeHarvest(plan: HarvestPlan): Promise<HarvestExecutionResult> {
    const planId = `harvest-${Date.now()}`;
    const results: HarvestExecutionResult['results'] = [];
    const startTime = Date.now();
    let cacheHits = 0;
    let cacheMisses = 0;

    for (const step of plan.steps) {
      // Check dependencies
      if (step.dependsOn) {
        const depsFailed = step.dependsOn.some(
          depIdx => !results.find(r => r.stepNumber === depIdx)?.success
        );
        if (depsFailed) {
          results.push({
            stepNumber: step.stepNumber,
            tool: step.skill.mcpTool,
            success: false,
            error: 'Dependency failed',
            durationMs: 0,
            cached: false
          });
          continue;
        }
      }

      const stepStart = Date.now();
      const cacheKey = this.cache.generateKey(step.skill.mcpTool, step.parameters);

      // Check cache
      const cached = this.cache.get(cacheKey);
      if (cached) {
        cacheHits++;
        results.push({
          stepNumber: step.stepNumber,
          tool: step.skill.mcpTool,
          success: true,
          data: cached,
          durationMs: Date.now() - stepStart,
          cached: true
        });
        continue;
      }

      cacheMisses++;

      // Rate limit check
      await this.checkRateLimit(step.skill);

      // Execute via MCP
      try {
        const data = await this.executeMcpTool(step.skill.mcpTool, step.parameters);
        
        // Cache result
        this.cache.set(cacheKey, data);

        results.push({
          stepNumber: step.stepNumber,
          tool: step.skill.mcpTool,
          success: true,
          data,
          durationMs: Date.now() - stepStart,
          cached: false
        });
      } catch (error) {
        results.push({
          stepNumber: step.stepNumber,
          tool: step.skill.mcpTool,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          durationMs: Date.now() - stepStart,
          cached: false
        });
      }
    }

    return {
      planId,
      success: results.every(r => r.success),
      results,
      totalDurationMs: Date.now() - startTime,
      cacheHits,
      cacheMisses
    };
  }

  /**
   * Get schemas for ROMA plan/act
   */
  getPlanSchema(): object {
    return {
      name: 'roma.harvest.plan',
      description: 'Plan a data harvest mission using available skills',
      inputSchema: {
        type: 'object',
        properties: {
          goal: { type: 'string', description: 'Harvest goal description' },
          strategy: { type: 'string', enum: ['react', 'cot'], description: 'Planning strategy' },
          constraints: {
            type: 'object',
            properties: {
              maxSteps: { type: 'number' },
              maxCostLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
              timeoutMs: { type: 'number' }
            }
          }
        },
        required: ['goal']
      }
    };
  }

  getActSchema(): object {
    return {
      name: 'roma.harvest.act',
      description: 'Execute a harvest plan or single harvest tool',
      inputSchema: {
        type: 'object',
        properties: {
          planId: { type: 'string', description: 'Plan ID to execute' },
          tool: { type: 'string', description: 'Single tool to execute' },
          parameters: { type: 'object', description: 'Tool parameters' }
        }
      }
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private findMatchingSkill(hint: string): HarvestSkill | undefined {
    // Try exact match first
    let skill = getSkillByMcpTool(hint);
    if (skill) return skill;

    // Try partial match
    const hintLower = hint.toLowerCase();
    return HARVEST_SKILL_REGISTRY.find(s => 
      s.id.includes(hintLower) || 
      s.name.toLowerCase().includes(hintLower) ||
      s.mcpTool.includes(hintLower)
    );
  }

  private async checkRateLimit(skill: HarvestSkill): Promise<void> {
    if (!skill.rateLimit) return;

    let limiter = this.rateLimiters.get(skill.id);
    if (!limiter) {
      limiter = createRateLimiter(skill.rateLimit);
      this.rateLimiters.set(skill.id, limiter);
    }

    await limiter.check();
  }

  private async executeMcpTool(tool: string, params: Record<string, unknown>): Promise<unknown> {
    // Map tool names to HarvestMcpClient methods
    switch (tool) {
      case 'harvest.web.crawl':
        return this.harvestClient.crawlWeb(params as { url: string; depth?: number });
      case 'harvest.web.scrape':
        return this.harvestClient.scrapeWeb(params as { url: string; selector?: string });
      case 'harvest.docs.showpad':
        return this.harvestClient.harvestShowpad(params as { maxDocuments?: number });
      case 'harvest.docs.scribd':
        return this.harvestClient.harvestScribd(params as { maxDocuments?: number });
      case 'harvest.docs.slideshare':
        return this.harvestClient.harvestSlideShare(params as { maxDocuments?: number });
      case 'harvest.cloud.m365':
        return this.harvestClient.harvestM365(params as { tenantId: string });
      case 'harvest.intel.email':
        return this.harvestClient.harvestEmailIntel(params as { mailbox: string });
      case 'harvest.intel.osint':
        return this.harvestClient.runOsint(params as { target: string });
      case 'harvest.intel.domain':
        return this.harvestClient.scanDomain(params as { domain: string });
      case 'harvest.repo.github':
        return this.harvestClient.harvestGitHub(params as { owner: string; repo: string });
      case 'harvest.gov.folketinget':
        return this.harvestClient.harvestFolketinget(params as { query?: string });
      default:
        throw new Error(`Unknown harvest tool: ${tool}`);
    }
  }

  private estimateTotalDuration(steps: HarvestPlanStep[]): string {
    // Simple estimation based on step count and cost levels
    const lowCost = steps.filter(s => s.skill.costLevel === 'low').length;
    const medCost = steps.filter(s => s.skill.costLevel === 'medium').length;
    const highCost = steps.filter(s => s.skill.costLevel === 'high').length;
    
    const minSeconds = lowCost * 10 + medCost * 60 + highCost * 180;
    const maxSeconds = lowCost * 30 + medCost * 300 + highCost * 600;
    
    return `${Math.round(minSeconds / 60)}-${Math.round(maxSeconds / 60)} minutes`;
  }
}

export function createRomaHarvestBridge(
  chatFn: (messages: { role: string; content: string }[]) => Promise<string>,
  widgetdcUrl?: string
): RomaHarvestBridge {
  return new RomaHarvestBridge(chatFn, widgetdcUrl);
}
