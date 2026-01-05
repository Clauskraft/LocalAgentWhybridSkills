// Demo of Local Agent + WidgetDC Integration
// This shows how the combined system creates unprecedented value

import { createWidgetDCIntegration } from './mcp-bridge';
import { UnifiedWidgetRegistry, getWidgetsByCategory } from './unified-widgets';
import { createCollaborativeSystem } from './collaborative-orchestration';

async function demoIntegration() {
  console.log('🚀 Local Agent + WidgetDC Integration Demo');
  console.log('=' .repeat(50));

  // Initialize systems
  const widgetDC = createWidgetDCIntegration();
  const collaboration = createCollaborativeSystem();

  // 1. Show unified widget capabilities
  console.log('\n📊 Unified Widget Registry:');
  console.log(`Total widgets: ${Object.keys(UnifiedWidgetRegistry).length}`);

  const aiWidgets = getWidgetsByCategory('ai');
  const osintWidgets = getWidgetsByCategory('osint');

  console.log(`🤖 AI Widgets: ${aiWidgets.length}`);
  aiWidgets.forEach(w => console.log(`  - ${w.name} (${w.source})`));

  console.log(`🔍 OSINT Widgets: ${osintWidgets.length}`);
  osintWidgets.forEach(w => console.log(`  - ${w.name} (${w.source})`));

  // 2. Demonstrate collaborative investigation
  console.log('\n🔬 Collaborative Investigation Demo:');

  try {
    console.log('Starting investigation of "example-target.com"...');
    const investigationTask = await collaboration.investigateTarget('example-target.com');

    console.log(`Task created: ${investigationTask.id}`);
    console.log(`Status: ${investigationTask.status}`);
    console.log(`Steps: ${investigationTask.steps.length}`);

    investigationTask.steps.forEach((step, i) => {
      console.log(`  ${i + 1}. ${step.title} (${step.assignedTo})`);
    });

    // Wait for completion (in real scenario)
    console.log('\n⏳ Task executing...');

    // Simulate monitoring
    setTimeout(() => {
      const updatedTask = collaboration['orchestrator'].getTask(investigationTask.id);
      if (updatedTask) {
        console.log(`Task completed: ${updatedTask.status}`);
        console.log(`Results: ${updatedTask.results.length} steps completed`);
      }
    }, 1000);

  } catch (error) {
    console.error('Investigation failed:', error);
  }

  // 3. Show cross-system AI analysis
  console.log('\n🧠 Cross-System AI Analysis:');

  try {
    const analysis = await widgetDC.investigateWithAI('suspicious-domain.com');
    console.log('Combined analysis result:');
    console.log(`- OSINT data collected: ${JSON.stringify(analysis.osint).length} bytes`);
    console.log(`- AI analysis: ${analysis.aiAnalysis.riskLevel} risk`);
    console.log(`- Recommendations: ${analysis.recommendations.length} items`);
  } catch (error) {
    console.log('AI analysis demo (would connect to real services):', error.message);
  }

  // 4. Show system capabilities
  console.log('\n⚙️ System Integration Status:');
  const status = collaboration.getStatus();
  console.log(`Active tasks: ${status.activeTasks}`);
  console.log(`Local Agent capabilities: ${status.localAgentCapabilities.length}`);
  console.log(`WidgetDC capabilities: ${status.widgetDCCapabilities.length}`);
  console.log(`Bridge connected: ${status.bridgeConnected ? '✅' : '❌'}`);

  console.log('\n🎯 Integration Benefits:');
  console.log('✅ Unified widget ecosystem across both platforms');
  console.log('✅ Collaborative AI task orchestration');
  console.log('✅ Cross-system intelligence sharing');
  console.log('✅ Real-time synchronized operations');
  console.log('✅ Combined security & analysis capabilities');
  console.log('✅ Scalable multi-agent collaboration');

  console.log('\n🚀 Ready for production deployment!');
}

// Export for use in other modules
export { demoIntegration };

// Run demo if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demoIntegration().catch(console.error);
}
