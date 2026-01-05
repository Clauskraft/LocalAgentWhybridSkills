import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WidgetDCMCPBridge, createWidgetDCIntegration } from './mcp-bridge';
import { UnifiedWidgetRegistry, getWidgetsByCategory } from './unified-widgets';
import { CollaborativeOrchestrator, createCollaborativeSystem } from './collaborative-orchestration';

// Mock fetch for testing
global.fetch = vi.fn();

describe('WidgetDC Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MCP Bridge', () => {
    it('should create bridge instance', () => {
      const bridge = new WidgetDCMCPBridge();
      expect(bridge).toBeInstanceOf(WidgetDCMCPBridge);
    });

    it('should execute OSINT investigation', async () => {
      const mockResponse = { data: 'osint-results' };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const bridge = new WidgetDCMCPBridge();
      const result = await bridge.launchOSINTInvestigation('test.com', 'entity', 2);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/mcp/route',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            tool: 'widgetdc.osint-investigate',
            parameters: {
              target: 'test.com',
              investigationType: 'entity',
              depth: 2
            }
          })
        })
      );
    });

    it('should handle bridge errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      });

      const bridge = new WidgetDCMCPBridge();

      await expect(bridge.launchOSINTInvestigation('test.com', 'entity'))
        .rejects
        .toThrow('WidgetDC tool execution failed: Not Found');
    });
  });

  describe('Unified Widgets', () => {
    it('should have widgets from both systems', () => {
      const totalWidgets = Object.keys(UnifiedWidgetRegistry).length;
      expect(totalWidgets).toBeGreaterThan(10); // At least some widgets
    });

    it('should filter widgets by category', () => {
      const aiWidgets = getWidgetsByCategory('ai');
      expect(aiWidgets.length).toBeGreaterThan(0);
      expect(aiWidgets.every(w => w.category === 'ai')).toBe(true);
    });

    it('should include both Local Agent and WidgetDC widgets', () => {
      const localAgentWidgets = Object.values(UnifiedWidgetRegistry)
        .filter(w => w.source === 'local-agent');
      const widgetDCWidgets = Object.values(UnifiedWidgetRegistry)
        .filter(w => w.source === 'widgetdc');

      expect(localAgentWidgets.length).toBeGreaterThan(0);
      expect(widgetDCWidgets.length).toBeGreaterThan(0);
    });
  });

  describe('Collaborative Orchestration', () => {
    it('should create orchestrator instance', () => {
      const orchestrator = new CollaborativeOrchestrator();
      expect(orchestrator).toBeInstanceOf(CollaborativeOrchestrator);
    });

    it('should create collaborative task', async () => {
      const orchestrator = new CollaborativeOrchestrator();

      const task = await orchestrator.createCollaborativeTask(
        'Test Investigation',
        'Test collaborative task',
        'AI Analysis',
        'Data Collection',
        'medium'
      );

      expect(task).toMatchObject({
        title: 'Test Investigation',
        status: 'planning',
        priority: 'medium',
        participants: {
          'local-agent': { role: 'AI Analysis' },
          'widgetdc': { role: 'Data Collection' }
        }
      });
      expect(task.steps.length).toBeGreaterThan(0);
    });

    it('should provide collaborative system API', () => {
      const collab = createCollaborativeSystem();
      expect(collab).toHaveProperty('investigateTarget');
      expect(collab).toHaveProperty('businessIntelligence');
      expect(collab).toHaveProperty('researchCollaboration');
      expect(collab).toHaveProperty('getStatus');
    });
  });

  describe('Integration API', () => {
    it('should create complete integration', () => {
      const integration = createWidgetDCIntegration();
      expect(integration).toHaveProperty('bridge');
      expect(integration.bridge).toBeInstanceOf(WidgetDCMCPBridge);
    });

    it('should handle AI investigation workflow', async () => {
      const mockOsint = { findings: ['finding1', 'finding2'] };
      const mockAiAnalysis = { risk: 'low', confidence: 0.9 };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockOsint)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAiAnalysis)
        });

      const integration = createWidgetDCIntegration();

      // Note: This test would need mocking of internal AI analysis
      // For now, we just verify the integration structure
      expect(integration).toHaveProperty('investigateWithAI');
    });
  });
});
