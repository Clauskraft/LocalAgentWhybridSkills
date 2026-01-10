/**
 * 🎯 ROMA MISSION LIBRARY
 * ========================
 * Samling af avancerede missioner til ROMA + WidgeTDC integration
 * 
 * Usage: tsx scripts/missions/<mission-name>.ts
 */

// ============================================================================
// MISSION TYPES
// ============================================================================

export interface MissionConfig {
  id: string;
  name: string;
  description: string;
  category: 'security' | 'osint' | 'monitoring' | 'ci' | 'testing' | 'reporting';
  strategy: 'react' | 'cot';
  budget: {
    maxSteps: number;
    maxTimeMs: number;
    maxTokens?: number;
  };
  inputs: Record<string, unknown>;
  outputs: string[];
}

export interface MissionResult {
  missionId: string;
  success: boolean;
  startTime: Date;
  endTime: Date;
  steps: MissionStep[];
  outputs: Record<string, unknown>;
  metrics: {
    totalDurationMs: number;
    tokensUsed: number;
    cacheHits: number;
    apiCalls: number;
    budgetRemaining: number;
  };
}

export interface MissionStep {
  stepNumber: number;
  action: string;
  tool: string;
  params: Record<string, unknown>;
  result?: unknown;
  durationMs: number;
  cached: boolean;
}

// ============================================================================
// MISSION TEMPLATES
// ============================================================================

export const MISSION_TEMPLATES: Record<string, MissionConfig> = {
  
  // ──────────────────────────────────────────────────────────────────────────
  // 🔒 SECURITY & DOMAIN ANALYSIS
  // ──────────────────────────────────────────────────────────────────────────
  
  'security-full-report': {
    id: 'security-full-report',
    name: 'Full Security Report & Presentation',
    description: `Plan and execute a mission to analyze a domain for security vulnerabilities 
    and OSINT indicators. Use ReAct strategy. After harvesting data, synthesize findings into 
    a detailed report and generate a PowerPoint presentation.`,
    category: 'security',
    strategy: 'react',
    budget: { maxSteps: 25, maxTimeMs: 300000, maxTokens: 50000 },
    inputs: {
      domain: 'showpad.com',
      depth: 2,
      includeOsint: true,
      generatePpt: true,
      harvestSources: ['harvest.docs.showpad', 'harvest.intel.domain', 'harvest.intel.osint']
    },
    outputs: ['security_report.md', 'security_presentation.pptx', 'evidence.json']
  },

  'multi-domain-comparison': {
    id: 'multi-domain-comparison',
    name: 'Comparative Domain Security Analysis',
    description: `Compare security posture of multiple enterprise domains. Scrape each domain, scan for 
    open ports/services, collect WHOIS/DNS info. Output comparative table in Markdown and 
    LinkedIn post.`,
    category: 'security',
    strategy: 'cot',
    budget: { maxSteps: 40, maxTimeMs: 600000, maxTokens: 80000 },
    inputs: {
      domains: ['showpad.com', 'scribd.com', 'slideshare.net'],
      scanPorts: true,
      collectWhois: true,
      collectDns: true,
      platformMapping: {
        'showpad.com': 'harvest.docs.showpad',
        'scribd.com': 'harvest.docs.scribd',
        'slideshare.net': 'harvest.docs.slideshare'
      }
    },
    outputs: ['comparison_report.md', 'comparison_table.csv', 'linkedin_post.txt']
  },

  'domain-monitoring': {
    id: 'domain-monitoring',
    name: 'Recurring Domain Monitor',
    description: `Set up recurring mission to monitor enterprise domains every 24 hours for DNS changes, 
    WHOIS updates, and new vulnerabilities. Log findings, update spreadsheet, send weekly 
    summary.`,
    category: 'monitoring',
    strategy: 'react',
    budget: { maxSteps: 15, maxTimeMs: 120000, maxTokens: 20000 },
    inputs: {
      domain: 'showpad.com',
      additionalDomains: ['scribd.com', 'slideshare.net'],
      interval: '24h',
      notifyEmail: 'security@company.com',
      spreadsheetId: '<google-drive-sheet-id>',
      checkCertificates: true,
      detectNewSubdomains: true
    },
    outputs: ['monitor_log.json', 'weekly_summary.md']
  },

  // ──────────────────────────────────────────────────────────────────────────
  // ⚙️ CI/CD & WORKFLOW ANALYSIS
  // ──────────────────────────────────────────────────────────────────────────

  'workflow-review': {
    id: 'workflow-review',
    name: 'GitHub Workflow Review',
    description: `Review new GitHub workflows added in latest commits. Summarize triggers 
    and purposes, identify missing tests/lint checks, suggest improvements for reliable 
    autonomous deployments.`,
    category: 'ci',
    strategy: 'cot',
    budget: { maxSteps: 20, maxTimeMs: 180000, maxTokens: 30000 },
    inputs: {
      repo: 'Clauskraft/LocalAgentWhybridSkills',
      since: 'last-commit',
      checkWorkflows: ['ci.yml', 'copilot-autofix.yml', 'cleanup-stale.yml', 'production-monitor.yml']
    },
    outputs: ['workflow_analysis.md', 'improvement_suggestions.md']
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 🧪 TESTING & VALIDATION
  // ──────────────────────────────────────────────────────────────────────────

  'harvest-util-tests': {
    id: 'harvest-util-tests',
    name: 'Harvest-Util Module Tests',
    description: `Write and run unit tests for harvest-util module. Verify credential 
    handling, rate limiting, and cache functionality. Use ROMA to orchestrate tests 
    and report coverage.`,
    category: 'testing',
    strategy: 'react',
    budget: { maxSteps: 30, maxTimeMs: 240000, maxTokens: 40000 },
    inputs: {
      module: 'shared/harvest-util',
      testTypes: ['unit', 'integration'],
      coverageThreshold: 80
    },
    outputs: ['test_results.json', 'coverage_report.html']
  },

  'budget-caching-demo': {
    id: 'budget-caching-demo',
    name: 'Budget & Caching Strategy Demo',
    description: `Demonstrate enhanced caching and budget tracking. Set strict token/time 
    budget, execute multi-step harvest (web scrape → graph query → email intel), show 
    cached results reducing cost/latency.`,
    category: 'testing',
    strategy: 'react',
    budget: { maxSteps: 10, maxTimeMs: 60000, maxTokens: 5000 },
    inputs: {
      harvests: ['harvest.web.scrape', 'harvest.intel.domain', 'harvest.intel.email'],
      strictBudget: true,
      demonstrateCacheHits: true
    },
    outputs: ['budget_summary.md', 'cache_metrics.json']
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 📊 AUTONOMOUS REPORTING
  // ──────────────────────────────────────────────────────────────────────────

  'e2e-report-generator': {
    id: 'e2e-report-generator',
    name: 'End-to-End Autonomous Report Generator',
    description: `Design autonomous pipeline: take high-level question about company's 
    online presence, plan/execute harvests via ROMA+WidgeTDC, generate detailed report, 
    convert to slide deck, draft stakeholder email. Include error-handling and fallbacks.`,
    category: 'reporting',
    strategy: 'react',
    budget: { maxSteps: 50, maxTimeMs: 900000, maxTokens: 100000 },
    inputs: {
      question: 'What are the main security risks facing ACME Corp?',
      company: 'ACME Corp',
      outputFormats: ['report', 'slides', 'email'],
      stakeholders: ['cto@company.com', 'security@company.com']
    },
    outputs: ['analysis_report.md', 'executive_slides.pptx', 'stakeholder_email.txt']
  }
};

// ============================================================================
// MISSION EXECUTOR
// ============================================================================

export class MissionExecutor {
  private cache: Map<string, unknown> = new Map();
  private metrics = {
    tokensUsed: 0,
    cacheHits: 0,
    apiCalls: 0
  };

  async execute(config: MissionConfig): Promise<MissionResult> {
    const startTime = new Date();
    const steps: MissionStep[] = [];

    console.log(`\n🎯 ═══════════════════════════════════════════════════════════`);
    console.log(`   MISSION: ${config.name}`);
    console.log(`   Strategy: ${config.strategy.toUpperCase()}`);
    console.log(`═══════════════════════════════════════════════════════════\n`);

    // Phase 1: Planning
    console.log(`📋 PHASE 1: PLANNING\n`);
    const plan = await this.planMission(config);
    
    // Phase 2: Execution
    console.log(`\n⚡ PHASE 2: EXECUTION\n`);
    for (const plannedStep of plan) {
      const stepResult = await this.executeStep(plannedStep, config);
      steps.push(stepResult);
      
      // Budget check
      if (this.isBudgetExhausted(config, steps)) {
        console.log(`\n⚠️ Budget exhausted. Stopping execution.`);
        break;
      }
    }

    // Phase 3: Synthesis
    console.log(`\n📊 PHASE 3: SYNTHESIS\n`);
    const outputs = await this.synthesizeResults(steps, config);

    const endTime = new Date();
    const totalDurationMs = endTime.getTime() - startTime.getTime();

    return {
      missionId: `${config.id}-${Date.now()}`,
      success: steps.every(s => s.result !== undefined),
      startTime,
      endTime,
      steps,
      outputs,
      metrics: {
        totalDurationMs,
        tokensUsed: this.metrics.tokensUsed,
        cacheHits: this.metrics.cacheHits,
        apiCalls: this.metrics.apiCalls,
        budgetRemaining: config.budget.maxSteps - steps.length
      }
    };
  }

  private async planMission(config: MissionConfig): Promise<Array<{ action: string; tool: string; params: Record<string, unknown> }>> {
    // Get plan based on mission type
    switch (config.id) {
      case 'security-full-report':
        return [
          { action: 'Scan domain DNS', tool: 'harvest.intel.domain', params: { domain: config.inputs.domain } },
          { action: 'Web scrape for vulnerabilities', tool: 'harvest.web.scrape', params: { url: `https://${config.inputs.domain}` } },
          { action: 'OSINT investigation', tool: 'harvest.intel.osint', params: { target: config.inputs.domain } },
          { action: 'Generate report', tool: 'local.synthesis', params: { format: 'markdown' } },
          { action: 'Create presentation', tool: 'local.pptx', params: { template: 'security' } }
        ];

      case 'multi-domain-comparison': {
        const domains = (config.inputs.domains as string[]) || ['example.com'];
        const steps = domains.flatMap(d => [
          { action: `Scan ${d}`, tool: 'harvest.intel.domain', params: { domain: d } },
          { action: `Scrape ${d}`, tool: 'harvest.web.scrape', params: { url: `https://${d}` } }
        ]);
        steps.push({ action: 'Compare results', tool: 'local.compare', params: {} });
        steps.push({ action: 'Generate report', tool: 'local.synthesis', params: { format: 'markdown' } });
        return steps;
      }

      case 'domain-monitoring':
        return [
          { action: 'Scan domain DNS', tool: 'harvest.intel.domain', params: { domain: config.inputs.domain } },
          { action: 'Check for changes', tool: 'local.compare', params: {} },
          { action: 'Update log', tool: 'local.synthesis', params: { format: 'json' } }
        ];

      case 'budget-caching-demo': {
        const harvests = (config.inputs.harvests as string[]) || ['harvest.web.scrape'];
        return harvests.map((h, i) => ({
          action: `Execute ${h}`,
          tool: h,
          params: { target: 'example.com', step: i }
        }));
      }

      default:
        return [
          { action: 'Initial analysis', tool: 'harvest.web.scrape', params: config.inputs },
          { action: 'Synthesize', tool: 'local.synthesis', params: {} }
        ];
    }
  }

  private async executeStep(
    planned: { action: string; tool: string; params: Record<string, unknown> },
    config: MissionConfig
  ): Promise<MissionStep> {
    const stepStart = Date.now();
    const cacheKey = `${planned.tool}:${JSON.stringify(planned.params)}`;
    
    console.log(`   📌 ${planned.action}`);
    console.log(`      Tool: ${planned.tool}`);

    // Check cache
    if (this.cache.has(cacheKey)) {
      this.metrics.cacheHits++;
      console.log(`      → CACHE HIT ✓`);
      return {
        stepNumber: 0,
        action: planned.action,
        tool: planned.tool,
        params: planned.params,
        result: this.cache.get(cacheKey),
        durationMs: Date.now() - stepStart,
        cached: true
      };
    }

    // Simulate API call
    this.metrics.apiCalls++;
    await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
    
    const result = this.simulateTool(planned.tool, planned.params);
    this.cache.set(cacheKey, result);
    
    // Estimate tokens
    const tokens = Math.ceil(JSON.stringify(result).length / 4);
    this.metrics.tokensUsed += tokens;

    console.log(`      → SUCCESS ✓ (${Date.now() - stepStart}ms, ~${tokens} tokens)\n`);

    return {
      stepNumber: 0,
      action: planned.action,
      tool: planned.tool,
      params: planned.params,
      result,
      durationMs: Date.now() - stepStart,
      cached: false
    };
  }

  private simulateTool(tool: string, params: Record<string, unknown>): unknown {
    switch (tool) {
      case 'harvest.intel.domain':
        return {
          domain: params.domain,
          dns: { A: ['93.184.216.34'], MX: ['mail.example.com'] },
          whois: { registrar: 'IANA', created: '1995-08-14' },
          ssl: { issuer: 'DigiCert', expires: '2025-12-31', grade: 'A' },
          securityHeaders: { hsts: true, csp: true, xframe: true }
        };
      case 'harvest.web.scrape':
        return {
          url: params.url,
          title: 'Example Domain',
          technologies: ['nginx', 'cloudflare'],
          forms: 0,
          externalLinks: 5
        };
      case 'harvest.intel.osint':
        return {
          target: params.target,
          socialMedia: [],
          breaches: [],
          subdomains: ['www', 'mail', 'ftp'],
          riskScore: 3
        };
      case 'local.synthesis':
        return { summary: 'Analysis complete', sections: 5 };
      case 'local.pptx':
        return { slides: 10, file: 'presentation.pptx' };
      default:
        return { status: 'ok' };
    }
  }

  private isBudgetExhausted(config: MissionConfig, steps: MissionStep[]): boolean {
    const elapsed = steps.reduce((sum, s) => sum + s.durationMs, 0);
    return steps.length >= config.budget.maxSteps || elapsed >= config.budget.maxTimeMs;
  }

  private async synthesizeResults(steps: MissionStep[], config: MissionConfig): Promise<Record<string, unknown>> {
    const outputs: Record<string, unknown> = {};
    
    for (const output of config.outputs) {
      if (output.endsWith('.md')) {
        outputs[output] = this.generateMarkdownReport(steps, config);
      } else if (output.endsWith('.json')) {
        outputs[output] = { steps: steps.map(s => ({ action: s.action, result: s.result })) };
      } else {
        outputs[output] = `[Generated: ${output}]`;
      }
    }

    console.log(`   Generated ${config.outputs.length} output files`);
    return outputs;
  }

  private generateMarkdownReport(steps: MissionStep[], config: MissionConfig): string {
    return `# ${config.name}

## Executive Summary
Mission completed with ${steps.length} steps.

## Findings
${steps.map(s => `- **${s.action}**: ${s.cached ? 'Cached' : 'Fresh'} (${s.durationMs}ms)`).join('\n')}

## Metrics
- Total API Calls: ${this.metrics.apiCalls}
- Cache Hits: ${this.metrics.cacheHits}
- Tokens Used: ~${this.metrics.tokensUsed}

---
*Generated by ROMA Mission Executor*
`;
  }
}

// ============================================================================
// CLI RUNNER
// ============================================================================

export async function runMission(missionId: string) {
  const config = MISSION_TEMPLATES[missionId];
  if (!config) {
    console.error(`❌ Unknown mission: ${missionId}`);
    console.log('Available missions:', Object.keys(MISSION_TEMPLATES).join(', '));
    return;
  }

  const executor = new MissionExecutor();
  const result = await executor.execute(config);

  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`   📊 MISSION COMPLETE`);
  console.log(`═══════════════════════════════════════════════════════════\n`);
  
  console.log(`   Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`   Duration: ${result.metrics.totalDurationMs}ms`);
  console.log(`   Steps: ${result.steps.length}`);
  console.log(`   API Calls: ${result.metrics.apiCalls}`);
  console.log(`   Cache Hits: ${result.metrics.cacheHits}`);
  console.log(`   Tokens: ~${result.metrics.tokensUsed}`);
  console.log(`\n   Outputs: ${Object.keys(result.outputs).join(', ')}`);
}

// Run if called directly
const missionArg = process.argv[2];
if (missionArg) {
  runMission(missionArg).catch(console.error);
} else {
  console.log('🎯 ROMA Mission Library');
  console.log('========================\n');
  console.log('Available Missions:\n');
  
  for (const [id, config] of Object.entries(MISSION_TEMPLATES)) {
    console.log(`  📋 ${id}`);
    console.log(`     ${config.name}`);
    console.log(`     Category: ${config.category} | Strategy: ${config.strategy}`);
    console.log('');
  }
  
  console.log('\nUsage: tsx scripts/missions/mission-library.ts <mission-id>');
}
