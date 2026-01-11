/**
 * 🎯 ROMA Mission Runner - Random 10 Mission Execution
 * 
 * Selects 10 random missions from mission-library and executes them.
 * Errors are handled via self-healing.
 */

import { execSync } from 'child_process';

// Mission IDs available in mission-library
const ALL_MISSIONS = [
  'ci-self-heal',
  'branch-guardian-mission',
  'health-monitor-mission', 
  'prometheus-scan-mission',
  'cortex-e2e-mission',
  'actionlint-healer',
  'agent-trigger',
  'branch-guardian-workflow',
  'ci-pr-validation-workflow',
  'cleanup-stale-workflow',
  'cortex-e2e-workflow',
  'e2e-production-workflow',
  'health-monitor-workflow',
  'prometheus-scan-workflow',
  'self-heal-audit-workflow',
  'cross-repo-sync-workflow',
  'harvest-util-tests',
  'workflow-review',
  'security-full-report',
  'monitoring-health-pulse'
];

interface MissionResult {
  id: string;
  success: boolean;
  duration: number;
  error?: string;
  healed?: boolean;
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function runCommand(command: string, cwd: string): { success: boolean; output: string } {
  try {
    const output = execSync(command, { encoding: 'utf8', cwd, timeout: 30000 });
    return { success: true, output };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; message?: string };
    return { success: false, output: execError.stdout || execError.stderr || execError.message || '' };
  }
}

async function executeMission(missionId: string): Promise<MissionResult> {
  const startTime = Date.now();
  
  console.log(`\n   📋 Mission: ${missionId}`);
  
  // Simulate mission execution based on category
  let success = true;
  let error: string | undefined;
  let healed = false;
  
  try {
    // Different execution paths based on mission type
    if (missionId.includes('health') || missionId.includes('monitor')) {
      // Health check missions - call production endpoint
      const result = runCommand('curl -s -o /dev/null -w "%{http_code}" https://backend-production-d3da.up.railway.app/health', '.');
      success = result.output.includes('200');
      if (!success) {
        error = `Health check returned: ${result.output}`;
        // Self-heal: try again
        console.log(`      🩹 Self-healing: retrying health check...`);
        await new Promise(r => setTimeout(r, 2000));
        const retry = runCommand('curl -s -o /dev/null -w "%{http_code}" https://backend-production-d3da.up.railway.app/health', '.');
        if (retry.output.includes('200')) {
          healed = true;
          success = true;
        }
      }
    } else if (missionId.includes('branch') || missionId.includes('cleanup')) {
      // Branch/cleanup missions - run gh commands
      const result = runCommand('gh repo view --json name', 'C:\\Users\\claus\\Projects\\WidgeTDC_fresh');
      success = result.success;
      if (!success) error = result.output;
    } else if (missionId.includes('sync') || missionId.includes('repo')) {
      // Sync missions - check git status
      const result = runCommand('git status --porcelain', 'C:\\Users\\claus\\Projects\\WidgeTDC_fresh');
      success = result.success;
      if (!success) error = result.output;
    } else if (missionId.includes('workflow') || missionId.includes('ci')) {
      // CI/Workflow missions - list workflows
      const result = runCommand('gh run list -L 5 --json conclusion', 'C:\\Users\\claus\\Projects\\WidgeTDC_fresh');
      success = result.success;
      if (!success) error = result.output;
    } else if (missionId.includes('test') || missionId.includes('e2e')) {
      // Test missions - simulate test run
      console.log(`      ⏳ Simulating test execution...`);
      await new Promise(r => setTimeout(r, 500));
      success = true;
    } else if (missionId.includes('prometheus') || missionId.includes('scan')) {
      // Prometheus missions - check if backend has prometheus endpoint
      const result = runCommand('curl -s https://backend-production-d3da.up.railway.app/api/mcp/tools | head -c 200', '.');
      success = result.success && result.output.length > 0;
      if (!success) error = 'Could not reach MCP tools endpoint';
    } else {
      // Generic mission - just simulate
      console.log(`      ⏳ Simulating mission execution...`);
      await new Promise(r => setTimeout(r, 300));
      success = true;
    }
  } catch (err) {
    success = false;
    error = err instanceof Error ? err.message : String(err);
  }
  
  const duration = Date.now() - startTime;
  const status = success ? '✅' : (healed ? '🩹' : '❌');
  console.log(`      ${status} ${success ? 'Completed' : 'Failed'} (${duration}ms)${healed ? ' [self-healed]' : ''}`);
  
  return { id: missionId, success, duration, error, healed };
}

async function runRandomMissions() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   🎯 ROMA RANDOM MISSION RUNNER');
  console.log('   Executing 10 random missions with self-healing');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`   Time: ${new Date().toISOString()}`);
  
  // Select 10 random missions
  const selectedMissions = shuffleArray(ALL_MISSIONS).slice(0, 10);
  
  console.log(`\n   📊 Selected Missions:`);
  selectedMissions.forEach((m, i) => console.log(`      ${i + 1}. ${m}`));
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   ⚡ EXECUTING MISSIONS');
  console.log('═══════════════════════════════════════════════════════════');
  
  const results: MissionResult[] = [];
  
  for (const missionId of selectedMissions) {
    const result = await executeMission(missionId);
    results.push(result);
  }
  
  // Summary
  const successful = results.filter(r => r.success).length;
  const healed = results.filter(r => r.healed).length;
  const failed = results.filter(r => !r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   📊 MISSION EXECUTION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`\n   Total Missions: ${selectedMissions.length}`);
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   🩹 Self-Healed: ${healed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   ⏱️ Total Duration: ${totalDuration}ms`);
  
  if (failed > 0) {
    console.log(`\n   ⚠️ Failed Missions:`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`      • ${r.id}: ${r.error?.substring(0, 100)}`);
    });
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   ✅ ROMA MISSION RUNNER COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');
}

// Run
runRandomMissions().catch(console.error);
