// Local Agent + WidgetDC Integration
// Unified Intelligence Platform

export * from './mcp-bridge';
export * from './unified-widgets';
export * from './collaborative-orchestration';

// High-level API
export { createWidgetDCIntegration } from './mcp-bridge';
export { UnifiedWidgetRegistry, getWidgetsByCategory, getWidgetsBySource, searchWidgets } from './unified-widgets';
export { createCollaborativeSystem } from './collaborative-orchestration';

// Demo function
export { demoIntegration } from './demo';

// Version info
export const INTEGRATION_VERSION = '1.0.0';
export const COMPATIBLE_WIDGETDC_VERSION = '^1.0.0';
export const COMPATIBLE_LOCAL_AGENT_VERSION = '^0.4.0';

// Integration metadata
export const INTEGRATION_METADATA = {
  name: 'Local Agent + WidgetDC Integration',
  description: 'Unified intelligence platform combining AI automation with OSINT expertise',
  capabilities: [
    'Cross-system task orchestration',
    'Unified widget registry',
    'Real-time collaboration',
    'Shared knowledge graphs',
    'MCP bridge communication',
    'Collaborative AI analysis'
  ],
  supportedFeatures: [
    'OSINT investigations',
    'Security analysis',
    'Business intelligence',
    'Research collaboration',
    'Threat intelligence',
    'Risk assessment'
  ],
  apiVersion: 'v1',
  lastUpdated: new Date().toISOString()
} as const;
