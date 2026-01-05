import { z } from 'zod';

// MCP Bridge between Local Agent and WidgetDC
// This enables cross-system tool execution and data sharing

const WidgetDCEndpoints = {
  baseUrl: process.env.WIDGETDC_URL || 'http://localhost:3001',
  mcpRoute: '/api/mcp/route',
  hyperEvents: '/api/hyper/events',
  osintGraph: '/api/osint/graph',
  widgetRegistry: '/api/widgets/registry'
} as const;

// Tool schemas for WidgetDC integration
export const WidgetDCToolSchemas = {
  'widgetdc.osint-investigate': {
    name: 'widgetdc.osint-investigate',
    description: 'Launch OSINT investigation using WidgetDC capabilities',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Investigation target (domain, IP, email, etc.)' },
        investigationType: {
          type: 'string',
          enum: ['social', 'technical', 'financial', 'entity'],
          description: 'Type of OSINT investigation'
        },
        depth: { type: 'number', enum: [1, 2, 3], description: 'Investigation depth level' }
      },
      required: ['target', 'investigationType']
    }
  },

  'widgetdc.widget-execute': {
    name: 'widgetdc.widget-execute',
    description: 'Execute a WidgetDC widget and return results',
    inputSchema: {
      type: 'object',
      properties: {
        widgetId: { type: 'string', description: 'Widget identifier' },
        parameters: { type: 'object', description: 'Widget-specific parameters' },
        realtime: { type: 'boolean', description: 'Enable real-time updates' }
      },
      required: ['widgetId']
    }
  },

  'widgetdc.knowledge-query': {
    name: 'widgetdc.knowledge-query',
    description: 'Query WidgetDC knowledge graph for intelligence',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language query' },
        domain: { type: 'string', enum: ['security', 'threats', 'entities', 'events'], description: 'Knowledge domain' },
        limit: { type: 'number', description: 'Maximum results' }
      },
      required: ['query']
    }
  },

  'widgetdc.collaborate-task': {
    name: 'widgetdc.collaborate-task',
    description: 'Collaborate on a task between Local Agent and WidgetDC',
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'Task description' },
        agentRole: { type: 'string', description: 'Local Agent role in collaboration' },
        widgetdcRole: { type: 'string', description: 'WidgetDC role in collaboration' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Task priority' }
      },
      required: ['task']
    }
  }
} as const;

// MCP Bridge Client
export class WidgetDCMCPBridge {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || WidgetDCEndpoints.baseUrl;
  }

  // Execute WidgetDC MCP tool
  async executeTool(toolName: string, parameters: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${WidgetDCEndpoints.mcpRoute}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WIDGETDC_API_KEY || ''}`
      },
      body: JSON.stringify({
        tool: toolName,
        parameters
      })
    });

    if (!response.ok) {
      throw new Error(`WidgetDC tool execution failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Launch OSINT investigation
  async launchOSINTInvestigation(
    target: string,
    investigationType: 'social' | 'technical' | 'financial' | 'entity',
    depth: 1 | 2 | 3 = 2
  ): Promise<unknown> {
    return this.executeTool('widgetdc.osint-investigate', {
      target,
      investigationType,
      depth
    });
  }

  // Execute WidgetDC widget
  async executeWidget(
    widgetId: string,
    parameters: Record<string, unknown> = {},
    realtime: boolean = false
  ): Promise<unknown> {
    return this.executeTool('widgetdc.widget-execute', {
      widgetId,
      parameters,
      realtime
    });
  }

  // Query knowledge graph
  async queryKnowledge(
    query: string,
    domain: 'security' | 'threats' | 'entities' | 'events' = 'security',
    limit: number = 10
  ): Promise<unknown> {
    return this.executeTool('widgetdc.knowledge-query', {
      query,
      domain,
      limit
    });
  }

  // Collaborate on cross-system task
  async collaborateTask(
    task: string,
    agentRole: string,
    widgetdcRole: string,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<unknown> {
    return this.executeTool('widgetdc.collaborate-task', {
      task,
      agentRole,
      widgetdcRole,
      priority
    });
  }

  // Get available widgets from WidgetDC
  async getWidgetRegistry(): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${WidgetDCEndpoints.widgetRegistry}`, {
      headers: {
        'Authorization': `Bearer ${process.env.WIDGETDC_API_KEY || ''}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch WidgetDC widget registry: ${response.statusText}`);
    }

    return response.json();
  }

  // Stream real-time events from WidgetDC
  async *streamEvents(): AsyncGenerator<unknown, void, unknown> {
    const response = await fetch(`${this.baseUrl}${WidgetDCEndpoints.hyperEvents}`, {
      headers: {
        'Authorization': `Bearer ${process.env.WIDGETDC_API_KEY || ''}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to connect to WidgetDC event stream: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              yield data;
            } catch (e) {
              // Skip malformed JSON
              console.warn('Malformed event data:', line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

// Integration utilities
export const createWidgetDCIntegration = () => {
  const bridge = new WidgetDCMCPBridge();

  return {
    bridge,

    // High-level integration methods
    async investigateWithAI(target: string): Promise<{
      osint: unknown;
      aiAnalysis: unknown;
      recommendations: string[];
    }> {
      // Launch OSINT investigation
      const osintResults = await bridge.launchOSINTInvestigation(target, 'entity', 2);

      // Use Local Agent's ROMA to analyze results
      // This would integrate with our ROMA bridge service
      const aiAnalysis = {
        summary: `AI analysis of ${target} based on OSINT data`,
        riskLevel: 'medium',
        keyFindings: ['Finding 1', 'Finding 2', 'Finding 3']
      };

      return {
        osint: osintResults,
        aiAnalysis,
        recommendations: [
          'Monitor target closely',
          'Check for related entities',
          'Update security policies'
        ]
      };
    },

    async collaborativeTaskOrchestration(taskDescription: string): Promise<unknown> {
      // Use ROMA for high-level planning
      const romaPlan = {
        goal: taskDescription,
        steps: [
          'Analyze with WidgetDC OSINT',
          'Process with Local Agent AI',
          'Generate unified report',
          'Execute coordinated actions'
        ]
      };

      // Execute collaborative task
      return bridge.collaborateTask(
        taskDescription,
        'AI Analysis & Planning',
        'OSINT Investigation & Data Collection',
        'high'
      );
    }
  };
};
