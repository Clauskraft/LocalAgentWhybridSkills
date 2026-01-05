import { z } from 'zod';

// Unified Widget System combining Local Agent and WidgetDC widgets
// This creates a seamless experience across both platforms

export interface UnifiedWidget {
  id: string;
  name: string;
  description: string;
  category: 'ai' | 'osint' | 'monitoring' | 'analysis' | 'collaboration' | 'system';
  source: 'local-agent' | 'widgetdc';
  icon: string;
  defaultSize: { width: number; height: number };
  tags: string[];
  requiresAuth: boolean;
  realtime: boolean;
  schema: z.ZodSchema;
}

// Local Agent widgets (our advanced UI components)
export const LocalAgentWidgets: UnifiedWidget[] = [
  {
    id: 'neural-visualizer',
    name: 'Neural Network Visualizer',
    description: 'Real-time visualization of AI processing and neural networks',
    category: 'ai',
    source: 'local-agent',
    icon: '🧠',
    defaultSize: { width: 600, height: 400 },
    tags: ['ai', 'visualization', 'neural', 'realtime'],
    requiresAuth: false,
    realtime: true,
    schema: z.object({
      showSignals: z.boolean().default(true),
      animationSpeed: z.number().min(0.1).max(5).default(1),
      nodeCount: z.number().min(4).max(20).default(12)
    })
  },

  {
    id: 'smart-suggestions',
    name: 'AI Smart Suggestions',
    description: 'Context-aware AI suggestions powered by advanced NLP',
    category: 'ai',
    source: 'local-agent',
    icon: '💡',
    defaultSize: { width: 400, height: 300 },
    tags: ['ai', 'suggestions', 'nlp', 'context'],
    requiresAuth: false,
    realtime: false,
    schema: z.object({
      maxSuggestions: z.number().min(1).max(10).default(5),
      confidenceThreshold: z.number().min(0).max(1).default(0.7),
      enableRealtime: z.boolean().default(true)
    })
  },

  {
    id: 'multi-modal-input',
    name: 'Multi-Modal Input',
    description: 'Voice, text, and drawing input with AI processing',
    category: 'ai',
    source: 'local-agent',
    icon: '🎨',
    defaultSize: { width: 500, height: 400 },
    tags: ['input', 'voice', 'drawing', 'multimodal'],
    requiresAuth: false,
    realtime: true,
    schema: z.object({
      enableVoice: z.boolean().default(true),
      enableDrawing: z.boolean().default(true),
      autoProcess: z.boolean().default(true),
      language: z.string().default('en')
    })
  },

  {
    id: 'immersive-workspace',
    name: 'Immersive Workspace',
    description: 'Multi-panel workspace with advanced layout management',
    category: 'system',
    source: 'local-agent',
    icon: '🚀',
    defaultSize: { width: 1200, height: 800 },
    tags: ['workspace', 'panels', 'layout', 'productivity'],
    requiresAuth: false,
    realtime: false,
    schema: z.object({
      maxPanels: z.number().min(1).max(12).default(6),
      enableAnimations: z.boolean().default(true),
      panelSnapping: z.boolean().default(true)
    })
  },

  {
    id: 'predictive-interface',
    name: 'Predictive Interface',
    description: 'AI-powered predictions of user intent and actions',
    category: 'ai',
    source: 'local-agent',
    icon: '🔮',
    defaultSize: { width: 450, height: 350 },
    tags: ['prediction', 'ai', 'ux', 'automation'],
    requiresAuth: false,
    realtime: true,
    schema: z.object({
      predictionDepth: z.number().min(1).max(5).default(3),
      enableAutoExecute: z.boolean().default(false),
      confidenceDisplay: z.boolean().default(true)
    })
  },

  {
    id: 'cutting-edge-lab',
    name: 'Cutting-Edge Lab',
    description: 'Experimental features and quantum computing integration',
    category: 'system',
    source: 'local-agent',
    icon: '⚡',
    defaultSize: { width: 600, height: 500 },
    tags: ['experimental', 'quantum', 'advanced', 'lab'],
    requiresAuth: true,
    realtime: true,
    schema: z.object({
      enableQuantumMode: z.boolean().default(false),
      showSystemLoad: z.boolean().default(true),
      autoUpdate: z.boolean().default(true)
    })
  }
];

// WidgetDC widgets (mapped from their system)
export const WidgetDCWidgets: UnifiedWidget[] = [
  {
    id: 'widgetdc-news-widget',
    name: 'Security News Monitor',
    description: 'Real-time threat intelligence and security news',
    category: 'monitoring',
    source: 'widgetdc',
    icon: '📰',
    defaultSize: { width: 500, height: 400 },
    tags: ['security', 'news', 'threats', 'monitoring'],
    requiresAuth: true,
    realtime: true,
    schema: z.object({
      categories: z.array(z.string()).default(['threats', 'vulnerabilities']),
      refreshInterval: z.number().min(30).max(3600).default(300),
      enableAlerts: z.boolean().default(true)
    })
  },

  {
    id: 'widgetdc-osint-graph',
    name: 'OSINT Network Graph',
    description: 'Interactive network graph visualization for investigations',
    category: 'osint',
    source: 'widgetdc',
    icon: '🕸️',
    defaultSize: { width: 800, height: 600 },
    tags: ['osint', 'graph', 'network', 'investigation'],
    requiresAuth: true,
    realtime: true,
    schema: z.object({
      layout: z.enum(['force', 'circular', 'hierarchical']).default('force'),
      showLabels: z.boolean().default(true),
      maxNodes: z.number().min(10).max(1000).default(200)
    })
  },

  {
    id: 'widgetdc-threat-matrix',
    name: 'MITRE ATT&CK Matrix',
    description: 'Interactive MITRE ATT&CK framework visualization',
    category: 'analysis',
    source: 'widgetdc',
    icon: '🎯',
    defaultSize: { width: 1000, height: 700 },
    tags: ['mitre', 'att&ck', 'threats', 'framework'],
    requiresAuth: true,
    realtime: false,
    schema: z.object({
      tactics: z.array(z.string()).optional(),
      highlightTechniques: z.array(z.string()).optional(),
      showDescriptions: z.boolean().default(true)
    })
  },

  {
    id: 'widgetdc-entity-search',
    name: 'Entity Intelligence Search',
    description: 'Advanced entity lookup and relationship discovery',
    category: 'osint',
    source: 'widgetdc',
    icon: '🔍',
    defaultSize: { width: 600, height: 500 },
    tags: ['entity', 'search', 'intelligence', 'relationships'],
    requiresAuth: true,
    realtime: false,
    schema: z.object({
      entityType: z.enum(['person', 'organization', 'domain', 'ip', 'email']).optional(),
      includeRelationships: z.boolean().default(true),
      maxDepth: z.number().min(1).max(5).default(2)
    })
  },

  {
    id: 'widgetdc-chat-widget',
    name: 'Collaborative AI Chat',
    description: 'Multi-agent conversation with WidgetDC integration',
    category: 'collaboration',
    source: 'widgetdc',
    icon: '💬',
    defaultSize: { width: 500, height: 600 },
    tags: ['chat', 'ai', 'collaboration', 'multi-agent'],
    requiresAuth: true,
    realtime: true,
    schema: z.object({
      enableMultiAgent: z.boolean().default(true),
      autoSave: z.boolean().default(true),
      enableVoice: z.boolean().default(false)
    })
  },

  {
    id: 'widgetdc-system-health',
    name: 'System Health Monitor',
    description: 'Real-time system status and performance monitoring',
    category: 'monitoring',
    source: 'widgetdc',
    icon: '❤️',
    defaultSize: { width: 400, height: 300 },
    tags: ['health', 'monitoring', 'performance', 'system'],
    requiresAuth: false,
    realtime: true,
    schema: z.object({
      metrics: z.array(z.string()).default(['cpu', 'memory', 'disk', 'network']),
      alertThresholds: z.record(z.number()).optional(),
      historyLength: z.number().min(1).max(100).default(20)
    })
  }
];

// Combined widget registry
export const UnifiedWidgetRegistry = {
  ...LocalAgentWidgets.reduce((acc, widget) => {
    acc[widget.id] = widget;
    return acc;
  }, {} as Record<string, UnifiedWidget>),

  ...WidgetDCWidgets.reduce((acc, widget) => {
    acc[widget.id] = widget;
    return acc;
  }, {} as Record<string, UnifiedWidget>)
};

// Utility functions
export const getWidgetsByCategory = (category: UnifiedWidget['category']): UnifiedWidget[] => {
  return Object.values(UnifiedWidgetRegistry).filter(widget => widget.category === category);
};

export const getWidgetsBySource = (source: UnifiedWidget['source']): UnifiedWidget[] => {
  return Object.values(UnifiedWidgetRegistry).filter(widget => widget.source === source);
};

export const searchWidgets = (query: string): UnifiedWidget[] => {
  const lowercaseQuery = query.toLowerCase();
  return Object.values(UnifiedWidgetRegistry).filter(widget =>
    widget.name.toLowerCase().includes(lowercaseQuery) ||
    widget.description.toLowerCase().includes(lowercaseQuery) ||
    widget.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
};

export const getRealtimeWidgets = (): UnifiedWidget[] => {
  return Object.values(UnifiedWidgetRegistry).filter(widget => widget.realtime);
};

export const getCollaborativeWidgets = (): UnifiedWidget[] => {
  return Object.values(UnifiedWidgetRegistry).filter(widget =>
    widget.tags.includes('collaboration') || widget.category === 'collaboration'
  );
};
