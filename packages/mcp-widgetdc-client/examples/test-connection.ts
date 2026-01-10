/**
 * 🧪 Test MCP Connection to WidgeTDC
 * 
 * Verifies that LocalAgent can connect to WidgeTDC's MCP server
 * and access harvest tools.
 * 
 * Usage: npx tsx packages/mcp-widgetdc-client/examples/test-connection.ts
 */

import { WidgeTDCMCPClient } from '../src/index.js';

async function testConnection() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   🧪 MCP CONNECTION TEST');
  console.log('   LocalAgent → WidgeTDC');
  console.log('═══════════════════════════════════════════════════════════\n');

  const client = new WidgeTDCMCPClient({ debug: true });
  
  try {
    // Step 1: Connect
    console.log('📡 Step 1: Connecting to WidgeTDC MCP server...\n');
    await client.connect();
    console.log('   ✅ Connected!\n');

    // Step 2: List tools
    console.log('📦 Step 2: Listing available tools...\n');
    const tools = await client.listTools();
    
    // Categorize tools
    const categories: Record<string, string[]> = {
      'harvest': [],
      'neo4j': [],
      'memory': [],
      'prometheus': [],
      'other': []
    };

    for (const tool of tools) {
      const name = tool.name;
      if (name.startsWith('harvest')) {
        categories.harvest.push(name);
      } else if (name.includes('neo4j') || name.includes('graph')) {
        categories.neo4j.push(name);
      } else if (name.includes('memory') || name.includes('store') || name.includes('retrieve')) {
        categories.memory.push(name);
      } else if (name.includes('prometheus')) {
        categories.prometheus.push(name);
      } else {
        categories.other.push(name);
      }
    }

    console.log(`   Total tools: ${tools.length}\n`);
    for (const [cat, toolList] of Object.entries(categories)) {
      if (toolList.length > 0) {
        console.log(`   📂 ${cat.toUpperCase()} (${toolList.length})`);
        toolList.slice(0, 5).forEach(t => console.log(`      • ${t}`));
        if (toolList.length > 5) {
          console.log(`      ... and ${toolList.length - 5} more`);
        }
      }
    }
    console.log();

    // Step 3: Test health check
    console.log('🏥 Step 3: Checking system health...\n');
    try {
      const health = await client.checkHealth();
      console.log('   ✅ Health check passed');
      console.log(`   ${JSON.stringify(health).substring(0, 100)}...\n`);
    } catch (e) {
      console.log('   ⚠️ Health check not available (tool may not exist)\n');
    }

    // Step 4: Test Neo4j connection
    console.log('🔗 Step 4: Testing Neo4j query...\n');
    try {
      const result = await client.queryNeo4j('MATCH (n) RETURN count(n) as nodeCount LIMIT 1');
      console.log('   ✅ Neo4j connected');
      console.log(`   ${JSON.stringify(result)}\n`);
    } catch (e) {
      console.log('   ⚠️ Neo4j query failed (may need credentials)\n');
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   📊 CONNECTION TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('   ✅ MCP Connection: SUCCESS');
    console.log(`   ✅ Tools Available: ${tools.length}`);
    console.log(`   ✅ Harvest Tools: ${categories.harvest.length}`);
    console.log(`   ✅ Neo4j Tools: ${categories.neo4j.length}`);
    console.log(`   ✅ Memory Tools: ${categories.memory.length}`);
    console.log(`   ✅ Prometheus Tools: ${categories.prometheus.length}`);
    console.log();

  } catch (error) {
    console.error('❌ Connection test failed:', error);
    console.log('\n⚠️ Make sure WidgeTDC backend is running:');
    console.log('   cd c:\\Users\\claus\\Projects\\WidgeTDC_fresh');
    console.log('   npm run dev:backend');
  } finally {
    await client.disconnect();
  }
}

testConnection().catch(console.error);
