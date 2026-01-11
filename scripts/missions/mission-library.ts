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
  // 🤖 CI/CD SELF-HEALING & DEVOPS AUTOMATION
  // ──────────────────────────────────────────────────────────────────────────

  'ci-self-heal': {
    id: 'ci-self-heal',
    name: 'CI/CD Self-Healing Pipeline',
    description: `Autonomously monitor GitHub Actions for failures, diagnose errors from logs,
    apply known fixes (npm cache issues, workspace errors, actionlint violations), commit
    repairs, and re-trigger workflows. Uses gh CLI for GitHub API access.`,
    category: 'ci',
    strategy: 'react',
    budget: { maxSteps: 20, maxTimeMs: 300000, maxTokens: 25000 },
    inputs: {
      repo: 'Clauskraft/WidgeTDC',
      lookbackHours: 24,
      autoFix: true,
      autoRetrigger: true,
      knownPatterns: [
        { pattern: 'ENOWORKSPACES', fix: 'remove-npm-cache' },
        { pattern: 'npm ci failed', fix: 'use-npm-install' },
        { pattern: 'set-output was deprecated', fix: 'update-github-output' },
        { pattern: 'actionlint', fix: 'run-problem-healer' },
        { pattern: '@v3', fix: 'upgrade-action-versions' }
      ]
    },
    outputs: ['healing_log.json', 'fixes_applied.md', 'workflow_status.json']
  },

  'branch-guardian-mission': {
    id: 'branch-guardian-mission',
    name: 'Autonomous Branch Stewardship',
    description: `Monitor repository for stale branches, unmerged work, and orphaned PRs.
    Delete branches inactive for >14 days, create draft PRs for active untracked work,
    and maintain a clean git history.`,
    category: 'ci',
    strategy: 'react',
    budget: { maxSteps: 15, maxTimeMs: 180000, maxTokens: 15000 },
    inputs: {
      repo: 'Clauskraft/WidgeTDC',
      staleDays: 14,
      protectedBranches: ['main', 'master', 'develop', 'release-', 'hotfix-'],
      dryRun: false
    },
    outputs: ['branch_report.md', 'deleted_branches.json', 'created_prs.json']
  },

  'health-monitor-mission': {
    id: 'health-monitor-mission',
    name: 'Production Health Monitor',
    description: `Continuously monitor production endpoints for health status. Check backend
    /health, /api/mcp/tools, and frontend availability. Trigger self-healing or create
    GitHub issues on degradation.`,
    category: 'monitoring',
    strategy: 'react',
    budget: { maxSteps: 10, maxTimeMs: 60000, maxTokens: 10000 },
    inputs: {
      endpoints: [
        { url: 'https://backend-production-d3da.up.railway.app/health', type: 'backend' },
        { url: 'https://backend-production-d3da.up.railway.app/api/mcp/tools', type: 'api' },
        { url: 'https://widgetdc-v2.vercel.app', type: 'frontend' }
      ],
      thresholds: { degraded: 2000, critical: 5000 },
      createIssueOnFailure: true
    },
    outputs: ['health_status.json', 'incident_report.md']
  },

  'prometheus-scan-mission': {
    id: 'prometheus-scan-mission',
    name: 'PROMETHEUS Code Scan',
    description: `Execute autonomous code analysis using PROMETHEUS inventions. Run Code
    Embedding Space analysis, Code Dreaming for pattern discovery, and RL Architecture
    optimization suggestions.`,
    category: 'ci',
    strategy: 'react',
    budget: { maxSteps: 25, maxTimeMs: 600000, maxTokens: 50000 },
    inputs: {
      targetPath: '.',
      maxFiles: 100,
      inventions: ['code-embedding', 'code-dreaming', 'rl-optimizer'],
      outputFormat: 'markdown'
    },
    outputs: ['prometheus_report.md', 'optimization_suggestions.json', 'embedding_analysis.json']
  },

  'cortex-e2e-mission': {
    id: 'cortex-e2e-mission',
    name: 'Cortex E2E Test Suite',
    description: `Execute comprehensive E2E tests for CORTEX (Notion integration). Validate
    database sync, search functionality, task queue processing, and neural chat bridge.`,
    category: 'testing',
    strategy: 'react',
    budget: { maxSteps: 30, maxTimeMs: 480000, maxTokens: 40000 },
    inputs: {
      testSuites: ['smoke', 'full-integration'],
      notionDatabases: ['UNIVERSAL_TODO', 'CORTEX_ALERTS', 'TDC_PRODUCT_HIERARCHY'],
      validateSync: true
    },
    outputs: ['e2e_results.json', 'test_report.md', 'coverage.html']
  },

  'actionlint-healer': {
    id: 'actionlint-healer',
    name: 'Actionlint Auto-Healer',
    description: `Scan all GitHub workflow files with actionlint, identify violations,
    automatically apply fixes (deprecated commands, outdated action versions, syntax errors),
    and commit repairs.`,
    category: 'ci',
    strategy: 'react',
    budget: { maxSteps: 15, maxTimeMs: 120000, maxTokens: 15000 },
    inputs: {
      workflowsPath: '.github/workflows',
      autoFix: true,
      commitMessage: 'chore(workflows): auto-heal actionlint violations [skip ci]'
    },
    outputs: ['actionlint_report.txt', 'fixes_applied.md']
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 🔧 GEMINI CLI WORKFLOW MISSIONS (from .agent/workflows)
  // ──────────────────────────────────────────────────────────────────────────

  'agent-trigger': {
    id: 'agent-trigger',
    name: 'Agent Trigger Script Runner',
    description: `Generic agent-triggered script runner for user or autonomous agents.
    Executes predefined scripts based on agent context and returns results.`,
    category: 'ci',
    strategy: 'react',
    budget: { maxSteps: 10, maxTimeMs: 60000, maxTokens: 10000 },
    inputs: {
      scriptName: 'default',
      context: 'autonomous',
      dryRun: false
    },
    outputs: ['execution_log.json', 'script_output.txt']
  },

  'branch-guardian-workflow': {
    id: 'branch-guardian-workflow',
    name: 'Branch Guardian - Cleanup and Stewardship',
    description: `Autonomous branch cleanup and stewardship. Remove stale branches,
    manage PRs, and maintain clean git history across repositories.`,
    category: 'ci',
    strategy: 'react',
    budget: { maxSteps: 20, maxTimeMs: 180000, maxTokens: 20000 },
    inputs: {
      repos: ['Clauskraft/WidgeTDC', 'Clauskraft/LocalAgentWhybridSkills'],
      staleDays: 14,
      protectedBranches: ['main', 'master', 'develop'],
      dryRun: false
    },
    outputs: ['branch_report.md', 'deleted_branches.json']
  },

  'ci-pr-validation-workflow': {
    id: 'ci-pr-validation-workflow',
    name: 'CI PR Validation',
    description: `Re-run CI PR validation including type-check, lint, and auto-approve
    for passing PRs. Ensures code quality gates are met.`,
    category: 'ci',
    strategy: 'react',
    budget: { maxSteps: 15, maxTimeMs: 300000, maxTokens: 25000 },
    inputs: {
      prNumber: 'latest',
      autoApprove: true,
      requiredChecks: ['type-check', 'lint', 'build']
    },
    outputs: ['validation_report.md', 'pr_status.json']
  },

  'cleanup-stale-workflow': {
    id: 'cleanup-stale-workflow',
    name: 'Cleanup Stale Workflow',
    description: `Manually trigger cleanup of stale branches, PRs, and workflow runs.
    Frees up resources and maintains repository hygiene.`,
    category: 'ci',
    strategy: 'react',
    budget: { maxSteps: 15, maxTimeMs: 120000, maxTokens: 15000 },
    inputs: {
      staledaysThreshold: 30,
      includeWorkflowRuns: true,
      includeDraftPRs: false
    },
    outputs: ['cleanup_report.md', 'deleted_items.json']
  },

  'cortex-e2e-workflow': {
    id: 'cortex-e2e-workflow',
    name: 'Cortex E2E Test Suite',
    description: `Run Cortex E2E test suite manually. Tests Notion integration,
    database sync, and neural chat functionality.`,
    category: 'testing',
    strategy: 'react',
    budget: { maxSteps: 30, maxTimeMs: 600000, maxTokens: 50000 },
    inputs: {
      testSuite: 'full',
      notionSync: true,
      neuralChat: true
    },
    outputs: ['e2e_results.json', 'test_report.md', 'screenshots.zip']
  },

  'e2e-production-workflow': {
    id: 'e2e-production-workflow',
    name: 'E2E Production Tests',
    description: `Run production-environment E2E tests manually. Validates live
    backend endpoints, frontend accessibility, and critical user flows.`,
    category: 'testing',
    strategy: 'react',
    budget: { maxSteps: 25, maxTimeMs: 480000, maxTokens: 40000 },
    inputs: {
      environment: 'production',
      endpoints: ['health', 'mcp/tools', 'cortex'],
      smokeTest: true
    },
    outputs: ['production_test_report.md', 'performance_metrics.json']
  },

  'health-monitor-workflow': {
    id: 'health-monitor-workflow',
    name: 'Health Monitor Workflow',
    description: `Run Health-Monitor workflow for self-healing status check.
    Monitors all services and triggers auto-healing on degradation.`,
    category: 'monitoring',
    strategy: 'react',
    budget: { maxSteps: 15, maxTimeMs: 120000, maxTokens: 15000 },
    inputs: {
      services: ['backend', 'frontend', 'neo4j', 'redis'],
      autoHeal: true,
      notifyOnDegradation: true
    },
    outputs: ['health_status.json', 'healing_actions.md']
  },

  'prometheus-scan-workflow': {
    id: 'prometheus-scan-workflow',
    name: 'PROMETHEUS Nightly Scan',
    description: `Run PROMETHEUS nightly scan for code analysis, embedding generation,
    and autonomous improvement suggestions.`,
    category: 'ci',
    strategy: 'react',
    budget: { maxSteps: 40, maxTimeMs: 900000, maxTokens: 80000 },
    inputs: {
      scanType: 'full',
      generateEmbeddings: true,
      runCodeDreaming: true,
      notifySlack: false
    },
    outputs: ['prometheus_report.md', 'embeddings.json', 'suggestions.md']
  },

  'self-heal-audit-workflow': {
    id: 'self-heal-audit-workflow',
    name: 'Self-Heal Audit Workflow',
    description: `Run Self-Heal Audit workflow to check for missing secrets,
    outdated dependencies, and configuration drift.`,
    category: 'monitoring',
    strategy: 'react',
    budget: { maxSteps: 20, maxTimeMs: 180000, maxTokens: 25000 },
    inputs: {
      checkSecrets: true,
      checkDependencies: true,
      checkConfiguration: true,
      autoFix: true
    },
    outputs: ['audit_report.md', 'fixes_applied.json', 'recommendations.md']
  },

  'cross-repo-sync-workflow': {
    id: 'cross-repo-sync-workflow',
    name: 'Cross-Repository Sync',
    description: `Sync changes between WidgeTDC and Local_Agent repositories.
    Commit, pull, push, and run self-healing on both repos autonomously.`,
    category: 'ci',
    strategy: 'react',
    budget: { maxSteps: 20, maxTimeMs: 240000, maxTokens: 20000 },
    inputs: {
      repos: [
        { name: 'WidgeTDC', path: 'C:\\Users\\claus\\Projects\\WidgeTDC_fresh' },
        { name: 'Local_Agent', path: 'C:\\Users\\claus\\Projects\\Local_Agent' }
      ],
      autoCommit: true,
      autoPush: true,
      autoHeal: true
    },
    outputs: ['sync_report.md', 'commit_log.json']
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
