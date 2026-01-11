/**
 * 🔄 Comprehensive Stability Monitor with Documentation Auto-Update
 * 
 * Monitors:
 * - WidgeTDC Backend
 * - WidgeTDC matrix-frontend (v1)
 * - WidgeTDC matrix-frontend-v2
 * - Local_Agent Desktop App
 * 
 * Auto-updates:
 * - ErrorKnowledgeBase patterns
 * - KNOWN_FIXES.md documentation
 * - HANDOVER_LOG.md
 */

import { execSync, ExecSyncOptions } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

interface ServiceConfig {
  name: string;
  path: string;
  type: 'backend' | 'frontend' | 'desktop';
  healthUrl?: string;
  buildCommand?: string;
  lintCommand?: string;
  devCommand?: string;
}

const SERVICES: ServiceConfig[] = [
  {
    name: 'WidgeTDC Backend',
    path: 'C:\\Users\\claus\\Projects\\WidgeTDC_fresh\\apps\\backend',
    type: 'backend',
    healthUrl: 'https://backend-production-d3da.up.railway.app/health',
    buildCommand: 'npm run build',
    lintCommand: 'npm run lint'
  },
  {
    name: 'WidgeTDC matrix-frontend',
    path: 'C:\\Users\\claus\\Projects\\WidgeTDC_fresh\\apps\\matrix-frontend',
    type: 'frontend',
    buildCommand: 'npm run build',
    lintCommand: 'npm run lint'
  },
  {
    name: 'WidgeTDC matrix-frontend-v2',
    path: 'C:\\Users\\claus\\Projects\\WidgeTDC_fresh\\apps\\matrix-frontend-v2',
    type: 'frontend',
    buildCommand: 'npm run build',
    lintCommand: 'npm run lint'
  },
  {
    name: 'Local_Agent Desktop',
    path: 'C:\\Users\\claus\\Projects\\Local_Agent\\apps\\desktop',
    type: 'desktop',
    buildCommand: 'npm run build 2>&1 || true',
    lintCommand: 'npm run lint 2>&1 || true'
  }
];

const DOCS_PATH = 'C:\\Users\\claus\\Projects\\WidgeTDC_fresh';
const KNOWN_FIXES_FILE = path.join(DOCS_PATH, 'KNOWN_FIXES.md');
const HANDOVER_LOG_FILE = path.join(DOCS_PATH, 'HANDOVER_LOG.md');

// ═══════════════════════════════════════════════════════════════════════════
// ERROR PATTERNS & FIXES
// ═══════════════════════════════════════════════════════════════════════════

interface ErrorPattern {
  id: string;
  regex: RegExp;
  description: string;
  category: 'css' | 'typescript' | 'build' | 'runtime' | 'workflow' | 'dependency';
  severity: 'critical' | 'high' | 'medium' | 'low';
  autoFix?: (file: string, content: string) => string;
  manualFix?: string;
}

const ERROR_PATTERNS: ErrorPattern[] = [
  // CSS / Tailwind
  {
    id: 'tailwind-shadow-space',
    regex: /shadow-\[([^\]]*),\s+/g,
    description: 'Tailwind CSS shadow with invalid spaces in rgba values',
    category: 'css',
    severity: 'high',
    autoFix: (file, content) => {
      // Replace arbitrary shadow with box-shadow property
      return content.replace(
        /@apply ([^;]*)\bshadow-\[([^\]]+)\]([^;]*);/g,
        (match, before, shadowValue, after) => {
          const cssValue = shadowValue.replace(/_/g, ' ');
          return `@apply ${before}${after};\n    box-shadow: ${cssValue};`;
        }
      );
    }
  },
  {
    id: 'tailwind-class-not-exist',
    regex: /The `([^`]+)` class does not exist/,
    description: 'Tailwind class not found - likely syntax error in arbitrary value',
    category: 'css',
    severity: 'high',
    manualFix: 'Check for spaces in arbitrary values like shadow-[...] or remove invalid class'
  },
  
  // TypeScript
  {
    id: 'ts-cannot-find-module',
    regex: /Cannot find module '([^']+)'/g,
    description: 'Missing module import',
    category: 'typescript',
    severity: 'high',
    manualFix: 'Run npm install or check import path'
  },
  {
    id: 'ts-property-undefined',
    regex: /Property '([^']+)' does not exist on type/g,
    description: 'Property access on wrong type',
    category: 'typescript',
    severity: 'medium',
    manualFix: 'Add type assertion or fix type definition'
  },
  {
    id: 'ts-no-unused-vars',
    regex: /'([^']+)' is declared but (its value is )?never (read|used)/g,
    description: 'Unused variable or import',
    category: 'typescript',
    severity: 'low',
    autoFix: (file, content) => {
      // Remove unused imports/vars requires AST parsing - mark for manual
      return content;
    }
  },
  
  // Build Errors
  {
    id: 'missing-script',
    regex: /Missing script: "([^"]+)"/g,
    description: 'npm script not found in package.json',
    category: 'build',
    severity: 'high',
    manualFix: 'Check package.json scripts section or run from correct workspace'
  },
  {
    id: 'esbuild-error',
    regex: /✘ \[ERROR\] ([^\n]+)/g,
    description: 'esbuild bundling error',
    category: 'build',
    severity: 'high',
    manualFix: 'Check esbuild configuration and import paths'
  },
  
  // Workflow Errors
  {
    id: 'workflow-issue-not-found',
    regex: /issue-number: \$\{\{ github\.run_id \}\}/g,
    description: 'Using workflow run_id as issue number (invalid)',
    category: 'workflow',
    severity: 'critical',
    autoFix: (file, content) => {
      // This is fixed in reusable-status-and-troubleshoot.yml
      return content;
    }
  },
  {
    id: 'github-action-404',
    regex: /RequestError \[HttpError\]: Not Found/g,
    description: 'GitHub API returned 404 - check issue/PR number',
    category: 'workflow',
    severity: 'high',
    manualFix: 'Verify issue-number or PR number is valid, not run_id'
  },
  
  // Runtime
  {
    id: 'econnrefused',
    regex: /ECONNREFUSED/g,
    description: 'Connection refused - service not running',
    category: 'runtime',
    severity: 'critical',
    manualFix: 'Check if target service is running and port is correct'
  },
  {
    id: 'heap-oom',
    regex: /FATAL ERROR: .* Allocation failed/g,
    description: 'Node.js heap out of memory',
    category: 'runtime',
    severity: 'critical',
    manualFix: 'Increase --max-old-space-size or fix memory leak'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function runCommand(cmd: string, cwd: string): { success: boolean; output: string; error?: string } {
  const options: ExecSyncOptions = { encoding: 'utf8', cwd, timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'] };
  try {
    const output = execSync(cmd, options) as string;
    return { success: true, output };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; message?: string };
    return { 
      success: false, 
      output: (execError.stdout || '') + (execError.stderr || ''), 
      error: execError.message 
    };
  }
}

async function checkHealth(url: string | undefined): Promise<{ status: 'ok' | 'down' | 'unknown'; latency?: number }> {
  if (!url) return { status: 'unknown' };
  
  const start = Date.now();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const latency = Date.now() - start;
    if (response.ok) {
      return { status: 'ok', latency };
    }
    return { status: 'down', latency };
  } catch {
    return { status: 'down' };
  }
}

function findFiles(dir: string, extensions: string[], excludeDirs: string[] = ['node_modules', 'dist', '.git']): string[] {
  const files: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!excludeDirs.includes(entry.name)) {
          files.push(...findFiles(fullPath, extensions, excludeDirs));
        }
      } else if (entry.isFile()) {
        if (extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    }
  } catch {
    // Skip unreadable dirs
  }
  return files;
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR DETECTION & FIXING
// ═══════════════════════════════════════════════════════════════════════════

interface DetectedError {
  pattern: ErrorPattern;
  file: string;
  match: string;
  line?: number;
}

interface FixResult {
  error: DetectedError;
  fixed: boolean;
  method: 'auto' | 'manual';
  details?: string;
}

function scanForErrors(servicePath: string): DetectedError[] {
  const errors: DetectedError[] = [];
  
  // Scan CSS files
  const cssFiles = findFiles(servicePath, ['.css']);
  for (const file of cssFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      for (const pattern of ERROR_PATTERNS.filter(p => p.category === 'css')) {
        const matches = content.match(pattern.regex);
        if (matches) {
          for (const match of matches) {
            errors.push({ pattern, file, match });
          }
        }
      }
    } catch {}
  }
  
  // Scan TypeScript files
  const tsFiles = findFiles(servicePath, ['.ts', '.tsx']);
  for (const file of tsFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      for (const pattern of ERROR_PATTERNS.filter(p => p.category === 'typescript')) {
        const matches = content.match(pattern.regex);
        if (matches) {
          for (const match of matches) {
            errors.push({ pattern, file, match });
          }
        }
      }
    } catch {}
  }
  
  // Scan workflow files
  const workflowFiles = findFiles(path.join(servicePath, '..', '..', '.github', 'workflows'), ['.yml', '.yaml']);
  for (const file of workflowFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      for (const pattern of ERROR_PATTERNS.filter(p => p.category === 'workflow')) {
        const matches = content.match(pattern.regex);
        if (matches) {
          for (const match of matches) {
            errors.push({ pattern, file, match });
          }
        }
      }
    } catch {}
  }
  
  return errors;
}

function applyFixes(errors: DetectedError[]): FixResult[] {
  const results: FixResult[] = [];
  const processedFiles = new Set<string>();
  
  for (const error of errors) {
    if (processedFiles.has(error.file)) continue;
    
    if (error.pattern.autoFix) {
      try {
        const content = fs.readFileSync(error.file, 'utf8');
        const fixed = error.pattern.autoFix(error.file, content);
        
        if (fixed !== content) {
          fs.writeFileSync(error.file, fixed, 'utf8');
          results.push({ error, fixed: true, method: 'auto', details: 'Applied auto-fix' });
          processedFiles.add(error.file);
        } else {
          results.push({ error, fixed: false, method: 'manual', details: error.pattern.manualFix });
        }
      } catch (e) {
        results.push({ error, fixed: false, method: 'manual', details: `Failed: ${e}` });
      }
    } else {
      results.push({ error, fixed: false, method: 'manual', details: error.pattern.manualFix });
    }
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENTATION AUTO-UPDATE
// ═══════════════════════════════════════════════════════════════════════════

function updateKnownFixes(results: FixResult[]): void {
  const fixedErrors = results.filter(r => r.fixed);
  if (fixedErrors.length === 0) return;
  
  const timestamp = new Date().toISOString();
  
  let content = '';
  if (fs.existsSync(KNOWN_FIXES_FILE)) {
    content = fs.readFileSync(KNOWN_FIXES_FILE, 'utf8');
  } else {
    content = `# Known Fixes - Auto-Generated\n\nThis file is automatically updated by the stability monitor when errors are fixed.\n\n---\n\n`;
  }
  
  // Add new fixes
  let newSection = `\n## Fixes Applied - ${timestamp}\n\n`;
  
  for (const result of fixedErrors) {
    const relPath = result.error.file.replace(/^.*[\\\/]Projects[\\\/]/, '');
    newSection += `### ${result.error.pattern.description}\n`;
    newSection += `- **Pattern ID**: \`${result.error.pattern.id}\`\n`;
    newSection += `- **Category**: ${result.error.pattern.category}\n`;
    newSection += `- **Severity**: ${result.error.pattern.severity}\n`;
    newSection += `- **File**: \`${relPath}\`\n`;
    newSection += `- **Fix Method**: ${result.method}\n`;
    if (result.details) newSection += `- **Details**: ${result.details}\n`;
    newSection += '\n';
  }
  
  // Prepend new fixes after header
  const headerEnd = content.indexOf('---\n');
  if (headerEnd !== -1) {
    content = content.slice(0, headerEnd + 4) + newSection + content.slice(headerEnd + 4);
  } else {
    content += newSection;
  }
  
  fs.writeFileSync(KNOWN_FIXES_FILE, content, 'utf8');
  console.log(`   📝 Updated KNOWN_FIXES.md with ${fixedErrors.length} new fixes`);
}

function updateHandoverLog(summary: string): void {
  if (!fs.existsSync(HANDOVER_LOG_FILE)) return;
  
  const timestamp = new Date().toISOString();
  const entry = `\n## Stability Monitor Update - ${timestamp}\n\n${summary}\n`;
  
  let content = fs.readFileSync(HANDOVER_LOG_FILE, 'utf8');
  
  // Add at the end
  content += entry;
  
  fs.writeFileSync(HANDOVER_LOG_FILE, content, 'utf8');
  console.log(`   📝 Updated HANDOVER_LOG.md`);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN MONITOR
// ═══════════════════════════════════════════════════════════════════════════

interface ServiceReport {
  service: ServiceConfig;
  health: { status: 'ok' | 'down' | 'unknown'; latency?: number };
  errors: DetectedError[];
  fixes: FixResult[];
}

async function monitorService(service: ServiceConfig): Promise<ServiceReport> {
  console.log(`\n🔍 Checking: ${service.name}`);
  
  // Health check
  const health = await checkHealth(service.healthUrl);
  const healthIcon = health.status === 'ok' ? '✅' : health.status === 'down' ? '❌' : '❓';
  console.log(`   Health: ${healthIcon} ${health.status}${health.latency ? ` (${health.latency}ms)` : ''}`);
  
  // Scan for errors
  console.log(`   Scanning for errors...`);
  const errors = scanForErrors(service.path);
  console.log(`   Found ${errors.length} potential issues`);
  
  // Apply fixes
  let fixes: FixResult[] = [];
  if (errors.length > 0) {
    console.log(`   Applying fixes...`);
    fixes = applyFixes(errors);
    const autoFixed = fixes.filter(f => f.fixed).length;
    console.log(`   Auto-fixed: ${autoFixed}/${fixes.length}`);
  }
  
  return { service, health, errors, fixes };
}

async function runComprehensiveMonitor() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   🔄 COMPREHENSIVE STABILITY MONITOR');
  console.log('   Backend + Frontends + Desktop App');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`   Time: ${new Date().toISOString()}\n`);
  
  const reports: ServiceReport[] = [];
  
  for (const service of SERVICES) {
    const report = await monitorService(service);
    reports.push(report);
  }
  
  // Update documentation
  const allFixes = reports.flatMap(r => r.fixes);
  updateKnownFixes(allFixes);
  
  // Generate summary
  const totalErrors = reports.reduce((sum, r) => sum + r.errors.length, 0);
  const totalFixed = allFixes.filter(f => f.fixed).length;
  const healthyServices = reports.filter(r => r.health.status === 'ok').length;
  
  const summary = `
- Services monitored: ${reports.length}
- Healthy services: ${healthyServices}/${reports.length}
- Errors detected: ${totalErrors}
- Auto-fixed: ${totalFixed}
- Services: ${reports.map(r => `${r.service.name} (${r.health.status})`).join(', ')}
`;
  
  if (totalFixed > 0) {
    updateHandoverLog(summary);
  }
  
  // Print summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   📊 STABILITY REPORT');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  for (const report of reports) {
    const healthIcon = report.health.status === 'ok' ? '✅' : report.health.status === 'down' ? '❌' : '❓';
    console.log(`   ${report.service.name}:`);
    console.log(`      ${healthIcon} Health: ${report.health.status}`);
    console.log(`      Errors: ${report.errors.length}`);
    console.log(`      Fixed: ${report.fixes.filter(f => f.fixed).length}`);
    console.log('');
  }
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`   ✅ MONITORING COMPLETE`);
  console.log(`   Total: ${totalErrors} errors, ${totalFixed} auto-fixed`);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Commit and push if fixes were applied
  if (totalFixed > 0) {
    console.log('📦 Committing fixes...');
    
    for (const repoPath of [DOCS_PATH, 'C:\\Users\\claus\\Projects\\Local_Agent']) {
      const status = runCommand('git status --porcelain', repoPath);
      if (status.output.trim()) {
        runCommand('git add -A', repoPath);
        runCommand(`git commit -m "fix(stability): auto-fix ${totalFixed} issues [skip ci]"`, repoPath);
        runCommand('git push origin main', repoPath);
        console.log(`   Pushed changes to ${repoPath}`);
      }
    }
  }
}

// Run
runComprehensiveMonitor().catch(console.error);
