/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                    HARVEST SKILL REGISTRY FOR ROMA                                                      ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  Registrerer harvest-værktøjer som "skills" i ROMA-motoren                                             ║
 * ║  Gør det muligt for ROMA at planlægge og udføre harvest-operationer                                    ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import type { RateLimitConfig } from './index';

export interface HarvestSkill {
  id: string;
  name: string;
  description: string;
  category: 'web' | 'documents' | 'cloud' | 'intelligence' | 'government' | 'repository';
  mcpTool: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description?: string; enum?: string[] }>;
    required?: string[];
  };
  outputType: string;
  rateLimit?: RateLimitConfig;
  estimatedDuration?: string;
  costLevel: 'low' | 'medium' | 'high';
  requiresAuth: boolean;
  authEnvPrefix?: string;
}

/**
 * Registry of all harvest skills available to ROMA
 */
export const HARVEST_SKILL_REGISTRY: HarvestSkill[] = [
  // Web Harvesting
  {
    id: 'harvest-web-crawl',
    name: 'Web Crawler',
    description: 'Crawl a website and extract content from multiple pages',
    category: 'web',
    mcpTool: 'harvest.web.crawl',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Starting URL to crawl' },
        depth: { type: 'number', description: 'Maximum crawl depth (1-3)' },
        maxPages: { type: 'number', description: 'Maximum pages to crawl' }
      },
      required: ['url']
    },
    outputType: 'CrawlResult[]',
    rateLimit: { maxRequests: 10, windowMs: 60000, retryAfterMs: 5000 },
    estimatedDuration: '30s-5min',
    costLevel: 'medium',
    requiresAuth: false
  },
  {
    id: 'harvest-web-scrape',
    name: 'Web Scraper',
    description: 'Scrape specific content from a webpage using selectors',
    category: 'web',
    mcpTool: 'harvest.web.scrape',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to scrape' },
        selector: { type: 'string', description: 'CSS selector for content' }
      },
      required: ['url']
    },
    outputType: 'ScrapeResult',
    rateLimit: { maxRequests: 30, windowMs: 60000, retryAfterMs: 2000 },
    estimatedDuration: '5-30s',
    costLevel: 'low',
    requiresAuth: false
  },

  // Document Harvesting
  {
    id: 'harvest-docs-showpad',
    name: 'Showpad Harvester',
    description: 'Harvest sales content from Showpad platform',
    category: 'documents',
    mcpTool: 'harvest.docs.showpad',
    inputSchema: {
      type: 'object',
      properties: {
        maxDocuments: { type: 'number', description: 'Maximum documents to fetch' },
        folder: { type: 'string', description: 'Specific folder to harvest' }
      }
    },
    outputType: 'ShowpadDocument[]',
    rateLimit: { maxRequests: 100, windowMs: 60000, retryAfterMs: 1000 },
    estimatedDuration: '1-10min',
    costLevel: 'medium',
    requiresAuth: true,
    authEnvPrefix: 'SHOWPAD'
  },
  {
    id: 'harvest-docs-scribd',
    name: 'Scribd Harvester',
    description: 'Harvest documents from Scribd',
    category: 'documents',
    mcpTool: 'harvest.docs.scribd',
    inputSchema: {
      type: 'object',
      properties: {
        maxDocuments: { type: 'number', description: 'Maximum documents' },
        query: { type: 'string', description: 'Search query' }
      }
    },
    outputType: 'ScribdDocument[]',
    rateLimit: { maxRequests: 50, windowMs: 60000, retryAfterMs: 2000 },
    estimatedDuration: '1-5min',
    costLevel: 'medium',
    requiresAuth: true,
    authEnvPrefix: 'SCRIBD'
  },
  {
    id: 'harvest-docs-slideshare',
    name: 'SlideShare Harvester',
    description: 'Harvest presentations from SlideShare',
    category: 'documents',
    mcpTool: 'harvest.docs.slideshare',
    inputSchema: {
      type: 'object',
      properties: {
        maxDocuments: { type: 'number', description: 'Maximum presentations' },
        query: { type: 'string', description: 'Search query' }
      }
    },
    outputType: 'SlideSharePresentation[]',
    rateLimit: { maxRequests: 30, windowMs: 60000, retryAfterMs: 3000 },
    estimatedDuration: '2-10min',
    costLevel: 'medium',
    requiresAuth: false
  },

  // Cloud Services
  {
    id: 'harvest-cloud-m365',
    name: 'Microsoft 365 Harvester',
    description: 'Harvest content from Microsoft 365 (SharePoint, OneDrive, Teams)',
    category: 'cloud',
    mcpTool: 'harvest.cloud.m365',
    inputSchema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string', description: 'M365 Tenant ID' },
        sites: { type: 'string', description: 'Comma-separated SharePoint sites' },
        contentTypes: { type: 'string', enum: ['documents', 'emails', 'teams', 'all'] }
      },
      required: ['tenantId']
    },
    outputType: 'M365Content[]',
    rateLimit: { maxRequests: 50, windowMs: 60000, retryAfterMs: 2000 },
    estimatedDuration: '5-30min',
    costLevel: 'high',
    requiresAuth: true,
    authEnvPrefix: 'M365'
  },

  // Intelligence / OSINT
  {
    id: 'harvest-intel-email',
    name: 'Email Intelligence',
    description: 'Harvest and analyze emails for intelligence (entities, contacts, domains)',
    category: 'intelligence',
    mcpTool: 'harvest.intel.email',
    inputSchema: {
      type: 'object',
      properties: {
        mailbox: { type: 'string', description: 'Mailbox to analyze' },
        limit: { type: 'number', description: 'Max emails to process' },
        since: { type: 'string', description: 'Date filter (YYYY-MM-DD)' }
      },
      required: ['mailbox']
    },
    outputType: 'EmailIntelResult[]',
    rateLimit: { maxRequests: 100, windowMs: 60000, retryAfterMs: 500 },
    estimatedDuration: '1-5min',
    costLevel: 'medium',
    requiresAuth: true,
    authEnvPrefix: 'EMAIL_IMAP'
  },
  {
    id: 'harvest-intel-osint',
    name: 'OSINT Investigation',
    description: 'Run OSINT investigation on a target (domain, IP, email, person)',
    category: 'intelligence',
    mcpTool: 'harvest.intel.osint',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Investigation target' },
        type: { type: 'string', enum: ['domain', 'ip', 'email', 'person', 'company'] },
        depth: { type: 'number', description: 'Investigation depth (1-3)' }
      },
      required: ['target']
    },
    outputType: 'OsintResult',
    rateLimit: { maxRequests: 20, windowMs: 60000, retryAfterMs: 5000 },
    estimatedDuration: '30s-3min',
    costLevel: 'high',
    requiresAuth: false
  },
  {
    id: 'harvest-intel-domain',
    name: 'Domain Scanner',
    description: 'Scan domain for security information (DNS, SSL, WHOIS)',
    category: 'intelligence',
    mcpTool: 'harvest.intel.domain',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Domain to scan' },
        includeSubdomains: { type: 'boolean', description: 'Include subdomain enumeration' }
      },
      required: ['domain']
    },
    outputType: 'DomainScanResult',
    rateLimit: { maxRequests: 30, windowMs: 60000, retryAfterMs: 2000 },
    estimatedDuration: '10-60s',
    costLevel: 'low',
    requiresAuth: false
  },

  // Repository Harvesting
  {
    id: 'harvest-repo-github',
    name: 'GitHub Repository Harvester',
    description: 'Harvest code and documentation from GitHub repositories',
    category: 'repository',
    mcpTool: 'harvest.repo.github',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        branch: { type: 'string', description: 'Branch to harvest' }
      },
      required: ['owner', 'repo']
    },
    outputType: 'GitHubContent[]',
    rateLimit: { maxRequests: 60, windowMs: 60000, retryAfterMs: 1000 },
    estimatedDuration: '30s-5min',
    costLevel: 'low',
    requiresAuth: true,
    authEnvPrefix: 'GITHUB'
  },

  // Government Data
  {
    id: 'harvest-gov-folketinget',
    name: 'Folketinget Harvester',
    description: 'Harvest data from Danish Parliament (Folketinget)',
    category: 'government',
    mcpTool: 'harvest.gov.folketinget',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        documentType: { type: 'string', enum: ['decisions', 'questions', 'proposals', 'all'] }
      }
    },
    outputType: 'FolketingetDocument[]',
    rateLimit: { maxRequests: 100, windowMs: 60000, retryAfterMs: 500 },
    estimatedDuration: '10s-2min',
    costLevel: 'low',
    requiresAuth: false
  }
];

/**
 * Get skills by category
 */
export function getSkillsByCategory(category: HarvestSkill['category']): HarvestSkill[] {
  return HARVEST_SKILL_REGISTRY.filter(s => s.category === category);
}

/**
 * Get skill by ID
 */
export function getSkillById(id: string): HarvestSkill | undefined {
  return HARVEST_SKILL_REGISTRY.find(s => s.id === id);
}

/**
 * Get skill by MCP tool name
 */
export function getSkillByMcpTool(tool: string): HarvestSkill | undefined {
  return HARVEST_SKILL_REGISTRY.find(s => s.mcpTool === tool);
}

/**
 * Get all skills that don't require auth (for unauthenticated contexts)
 */
export function getPublicSkills(): HarvestSkill[] {
  return HARVEST_SKILL_REGISTRY.filter(s => !s.requiresAuth);
}

/**
 * Format skills for ROMA planning context
 */
export function getSkillsForRomaContext(): string {
  return HARVEST_SKILL_REGISTRY.map(skill => 
    `- **${skill.name}** (${skill.mcpTool}): ${skill.description} [${skill.costLevel} cost, ${skill.estimatedDuration}]`
  ).join('\n');
}

/**
 * Get JSON schema for all skills (for ROMA plan/act schema)
 */
export function getSkillSchemas(): Record<string, HarvestSkill['inputSchema']> {
  const schemas: Record<string, HarvestSkill['inputSchema']> = {};
  for (const skill of HARVEST_SKILL_REGISTRY) {
    schemas[skill.mcpTool] = skill.inputSchema;
  }
  return schemas;
}
