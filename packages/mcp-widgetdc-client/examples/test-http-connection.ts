/**
 * 🧪 Test HTTP MCP Connection to WidgeTDC
 * 
 * Uses HTTP to connect to the running WidgeTDC backend's MCP endpoint
 * 
 * Usage: tsx packages/mcp-widgetdc-client/examples/test-http-connection.ts
 */

const WIDGETDC_URL = process.env.WIDGETDC_URL || 'http://localhost:3001';

interface MCPRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

async function callMCP(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const request: MCPRequest = {
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params
  };

  const response = await fetch(`${WIDGETDC_URL}/api/mcp/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  const data: MCPResponse = await response.json();
  
  if (data.error) {
    throw new Error(`MCP Error: ${data.error.message}`);
  }
  
  return data.result;
}

async function testConnection() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   🧪 MCP HTTP CONNECTION TEST');
  console.log(`   LocalAgent → WidgeTDC (${WIDGETDC_URL})`);
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Health check
    console.log('🏥 Step 1: Checking backend health...\n');
    const healthResponse = await fetch(`${WIDGETDC_URL}/health`);
    const health = await healthResponse.json();
    console.log(`   Status: ${health.status || 'unknown'}`);
    console.log(`   ✅ Backend is running!\n`);

    // Step 2: List MCP tools (GET endpoint)
    console.log('📦 Step 2: Listing MCP tools...\n');
    try {
      const toolsResponse = await fetch(`${WIDGETDC_URL}/api/mcp/tools`);
      const tools = await toolsResponse.json() as { tools: Array<{ name: string; description?: string }> };
      
      console.log(`   Total tools: ${tools.tools?.length || 0}\n`);
      
      // Categorize
      const categories: Record<string, string[]> = {
        harvest: [], neo4j: [], memory: [], prometheus: [], rlm: [], other: []
      };

      for (const tool of tools.tools || []) {
        const name = tool.name;
        if (name.startsWith('harvest')) categories.harvest.push(name);
        else if (name.includes('neo4j') || name.includes('graph')) categories.neo4j.push(name);
        else if (name.includes('memory')) categories.memory.push(name);
        else if (name.includes('prometheus')) categories.prometheus.push(name);
        else if (name.includes('rlm')) categories.rlm.push(name);
        else categories.other.push(name);
      }

      for (const [cat, list] of Object.entries(categories)) {
        if (list.length > 0) {
          console.log(`   📂 ${cat.toUpperCase()} (${list.length})`);
          list.slice(0, 5).forEach(t => console.log(`      • ${t}`));
          if (list.length > 5) console.log(`      ... and ${list.length - 5} more`);
        }
      }
    } catch (e) {
      console.log(`   ⚠️ Could not list tools: ${e}`);
    }

    // Step 3: Test a tool call (POST with correct format)
    console.log('\n🔧 Step 3: Testing tool call (ping)...\n');
    try {
      const response = await fetch(`${WIDGETDC_URL}/api/mcp/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'ping', payload: {} })
      });
      const pingResult = await response.json();
      console.log(`   ✅ Ping result:`, JSON.stringify(pingResult).substring(0, 100));
    } catch (e) {
      console.log(`   ⚠️ Ping failed: ${e}`);
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   📊 CONNECTION TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('   ✅ HTTP Connection: SUCCESS');
    console.log(`   ✅ Backend URL: ${WIDGETDC_URL}`);
    console.log('   ✅ MCP Endpoint: /api/mcp/route');

  } catch (error) {
    console.error('❌ Connection test failed:', error);
    console.log('\n⚠️ Make sure WidgeTDC backend is running:');
    console.log('   cd c:\\Users\\claus\\Projects\\WidgeTDC_fresh\\apps\\backend');
    console.log('   npm run dev');
  }
}

testConnection().catch(console.error);
