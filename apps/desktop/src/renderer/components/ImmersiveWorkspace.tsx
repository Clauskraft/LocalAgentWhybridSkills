import { useState, memo } from 'react';
import { IconSettings, IconPlug, IconX } from './icons';

interface Panel {
  id: string;
  title: string;
  content: React.ReactNode;
  icon: React.ReactNode;
  size: 'small' | 'medium' | 'large';
}

interface ImmersiveWorkspaceProps {
  children: React.ReactNode;
  onPanelToggle: (panelId: string, visible: boolean) => void;
}

export const ImmersiveWorkspace = memo(function ImmersiveWorkspace({
  children,
  onPanelToggle
}: ImmersiveWorkspaceProps) {
  const [activePanels, setActivePanels] = useState<Set<string>>(new Set(['chat']));
  const [panelSizes, setPanelSizes] = useState<Record<string, 'small' | 'medium' | 'large'>>({
    chat: 'large',
    code: 'medium',
    search: 'small',
    tools: 'small'
  });

  // LOOP 5: Immersive Workspace with Multiple Panels
  const panels: Panel[] = [
    {
      id: 'chat',
      title: 'AI Chat',
      content: children,
      icon: <span className="text-lg">💬</span>,
      size: panelSizes.chat
    },
    {
      id: 'code',
      title: 'Code Editor',
      content: (
        <div className="p-4 h-full">
          <div className="bg-bg-tertiary rounded-lg p-4 font-mono text-sm h-full">
            <div className="text-text-muted">// LOOP 5: Integrated Code Editor</div>
            <div className="text-text-muted">// This would be a full Monaco/CodeMirror editor</div>
            <div className="mt-4 text-accent">function immersiveWorkspace() {'{'}</div>
            <div className="ml-4 text-text-primary">const panels = ['chat', 'code', 'search'];</div>
            <div className="ml-4 text-text-primary">return panels.map(panel =&gt; createPanel(panel));</div>
            <div className="text-accent">{'}'}</div>
          </div>
        </div>
      ),
      icon: <IconSettings className="w-4 h-4" />,
      size: panelSizes.code
    },
    {
      id: 'search',
      title: 'Deep Search',
      content: (
        <div className="p-4 h-full">
          <div className="space-y-4">
            <input
              type="text"
              placeholder="🔍 Search across knowledge base..."
              className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <div className="space-y-2">
              <div className="p-3 bg-bg-tertiary rounded-lg">
                <div className="text-sm font-medium text-text-primary">Recent Search</div>
                <div className="text-xs text-text-muted">React hooks best practices</div>
              </div>
              <div className="p-3 bg-bg-tertiary rounded-lg">
                <div className="text-sm font-medium text-text-primary">Suggested Query</div>
                <div className="text-xs text-text-muted">TypeScript advanced patterns</div>
              </div>
            </div>
          </div>
        </div>
      ),
      icon: <IconPlug className="w-4 h-4" />,
      size: panelSizes.search
    },
    {
      id: 'tools',
      title: 'AI Tools',
      content: (
        <div className="p-4 h-full">
          <div className="grid grid-cols-2 gap-3">
            <button className="p-3 bg-accent/10 hover:bg-accent/20 border border-accent/20 rounded-lg transition-all">
              <div className="text-2xl mb-2">🧠</div>
              <div className="text-sm font-medium">Code Review</div>
            </button>
            <button className="p-3 bg-accent/10 hover:bg-accent/20 border border-accent/20 rounded-lg transition-all">
              <div className="text-2xl mb-2">🎨</div>
              <div className="text-sm font-medium">UI Design</div>
            </button>
            <button className="p-3 bg-accent/10 hover:bg-accent/20 border border-accent/20 rounded-lg transition-all">
              <div className="text-2xl mb-2">📊</div>
              <div className="text-sm font-medium">Data Analysis</div>
            </button>
            <button className="p-3 bg-accent/10 hover:bg-accent/20 border border-accent/20 rounded-lg transition-all">
              <div className="text-2xl mb-2">🔧</div>
              <div className="text-sm font-medium">Debug Helper</div>
            </button>
          </div>
        </div>
      ),
      icon: <IconSettings className="w-4 h-4" />,
      size: panelSizes.tools
    }
  ];

  const togglePanel = (panelId: string) => {
    const newActivePanels = new Set(activePanels);
    if (newActivePanels.has(panelId)) {
      newActivePanels.delete(panelId);
    } else {
      newActivePanels.add(panelId);
    }
    setActivePanels(newActivePanels);
    onPanelToggle(panelId, newActivePanels.has(panelId));
  };

  const resizePanel = (panelId: string, size: 'small' | 'medium' | 'large') => {
    setPanelSizes(prev => ({ ...prev, [panelId]: size }));
  };

  const getPanelSizeClasses = (size: string) => {
    switch (size) {
      case 'small': return 'w-80';
      case 'medium': return 'w-96';
      case 'large': return 'flex-1';
      default: return 'flex-1';
    }
  };

  return (
    <div className="flex h-full bg-gradient-to-br from-bg-primary via-bg-primary to-bg-secondary/30">
      {/* Panel Navigation */}
      <div className="w-16 bg-white/10 backdrop-blur-xl border-r border-white/20 flex flex-col items-center py-4 gap-2">
        {panels.map((panel) => (
          <button
            key={panel.id}
            onClick={() => togglePanel(panel.id)}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
              activePanels.has(panel.id)
                ? 'bg-accent text-white shadow-lg shadow-accent/30'
                : 'bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary'
            }`}
            title={panel.title}
          >
            {panel.icon}
          </button>
        ))}
      </div>

      {/* Active Panels */}
      <div className="flex flex-1 overflow-hidden">
        {panels
          .filter(panel => activePanels.has(panel.id))
          .map((panel, index) => (
            <div
              key={panel.id}
              className={`flex flex-col bg-bg-secondary/50 backdrop-blur-sm border-r border-border-primary/30 transition-all duration-300 ${
                getPanelSizeClasses(panel.size)
              } ${index === 0 ? 'border-l-0' : ''}`}
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-white/5 backdrop-blur-sm border-b border-white/10">
                <div className="flex items-center gap-2">
                  {panel.icon}
                  <span className="font-medium text-text-primary">{panel.title}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => resizePanel(panel.id, panel.size === 'large' ? 'medium' : panel.size === 'medium' ? 'small' : 'large')}
                    className="w-6 h-6 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                    title="Resize panel"
                  >
                    <IconMinimize className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => togglePanel(panel.id)}
                    className="w-6 h-6 flex items-center justify-center text-text-muted hover:text-error transition-colors"
                    title="Close panel"
                  >
                    <IconX className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-hidden">
                {panel.content}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
});
