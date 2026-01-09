import { useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { SettingsModal } from './components/SettingsModal';
import { ImmersiveWorkspace } from './components/ImmersiveWorkspace';
import { CuttingEdgeFeatures } from './components/CuttingEdgeFeatures';
import { PulseDashboard } from './components/PulseDashboard';
import { PulseCurate } from './components/PulseCurate';
import { RomaPlanner } from "./components/RomaPlanner";
import { useChat } from './hooks/useChat';
import { useSettings } from './hooks/useSettings';
import { useToast } from './components/Toast';
import { ShortcutsModal } from './components/ShortcutsModal';

type AppView = 'chat' | 'pulse' | 'roma';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, unknown>;
  }>;
  meta?: Record<string, any>;
}

export interface Chat {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
}

export function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<string>('general');
  const [cuttingEdgeMode, setCuttingEdgeMode] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>('chat');
  const [showPulseCurate, setShowPulseCurate] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { showToast } = useToast();

  const {
    chats,
    currentChatId,
    messages,
    isLoading,
    createChat,
    selectChat,
    deleteChat,
    undoDeleteChat,
    sendMessage,
    lastDeletedChat,
  } = useChat();

  // LOOP 9: Undo Delete Notification
  useEffect(() => {
    if (lastDeletedChat) {
      showToast(
        <div className="flex items-center gap-3">
          <span>Samtale slettet</span>
          <button
            onClick={() => undoDeleteChat()}
            className="px-2 py-1 bg-accent/20 hover:bg-accent/40 text-accent rounded-md text-[10px] uppercase font-bold tracking-widest transition-all"
          >
            Fortryd
          </button>
        </div>,
        'info'
      );
    }
  }, [lastDeletedChat, undoDeleteChat, showToast]);

  const {
    settings,
    updateSettings,
    ollamaStatus,
    mcpServersCount,
  } = useSettings();

  const openSettings = useCallback((tab: string = 'general') => {
    setSettingsTab(tab);
    setShowSettings(true);
  }, []);

  const closeSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  // LOOP 5: Panel Management
  const handlePanelToggle = useCallback((panelId: string, visible: boolean) => {
    _setActivePanels(prev => {
      const newPanels = new Set(prev);
      if (visible) {
        newPanels.add(panelId);
      } else {
        newPanels.delete(panelId);
      }
      return newPanels;
    });
  }, []);

  const handleImmersiveToggle = useCallback(() => {
    updateSettings({ immersiveMode: !settings.immersiveMode });
  }, [settings.immersiveMode, updateSettings]);

  // LOOP 10: Cutting Edge Features
  const handleFeatureActivate = useCallback((feature: string, data?: any) => {
    console.log('Cutting edge feature activated:', feature, data);
    // Here you could integrate with actual advanced features
  }, []);

  const toggleCuttingEdgeMode = useCallback(() => {
    setCuttingEdgeMode(prev => !prev);
  }, []);

  // LOOP 10: Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        createChat();
      }
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        openSettings();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createChat, openSettings]);

  const handleSendMessage = useCallback(async (content: string) => {
    await sendMessage(content, settings);
  }, [sendMessage, settings]);

  // Pulse+ Navigation
  const openPulse = useCallback(() => {
    setCurrentView('pulse');
  }, []);

  const closePulse = useCallback(() => {
    setCurrentView('chat');
  }, []);

  // ROMA Navigation
  const openRoma = useCallback(() => {
    setCurrentView("roma");
  }, []);

  const closeRoma = useCallback(() => {
    setCurrentView("chat");
  }, []);

  const handlePulseCurate = useCallback(async (topic: string) => {
    await window.electronAPI?.pulse?.addCuration?.(topic);
  }, []);

  const chatAreaContent = (
    <ChatArea
      messages={messages}
      isLoading={isLoading}
      currentModel={settings.model}
      ollamaStatus={ollamaStatus}
      mcpServersCount={mcpServersCount}
      security={{
        fullAccess: !!settings.fullAccess,
        autoApprove: !!settings.autoApprove,
        safeDirsCount: Array.isArray(settings.safeDirs) ? settings.safeDirs.length : 0,
        useCloud: !!settings.useCloud,
      }}
      onSendMessage={handleSendMessage}
      onOpenSettings={openSettings}
      onSelectModel={(model) => updateSettings({ model })}
      cuttingEdgeMode={cuttingEdgeMode}
      setCuttingEdgeMode={setCuttingEdgeMode}
      immersiveMode={settings.immersiveMode}
      onToggleImmersive={handleImmersiveToggle}
    />
  );

  return (
    <div className={`flex h-screen bg-bg-primary text-text-primary overflow-hidden transition-all duration-700 border-t-2 holographic-bg animate-holographic-float ${cuttingEdgeMode ? 'border-purple-500 shadow-[0_-10px_30px_rgba(168,85,247,0.15)]' :
      settings.immersiveMode ? 'border-accent shadow-[0_-10px_30px_rgba(226,0,116,0.15)]' :
        'border-white/5'
      }`}>
      {/* Sidebar */}
      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        onNewChat={createChat}
        onSelectChat={(id) => { selectChat(id); setCurrentView('chat'); }}
        onDeleteChat={deleteChat}
        onOpenSettings={openSettings}
        onOpenPulse={openPulse}
        onOpenRoma={openRoma}
        isCollapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
      />

      {/* Main Content */}
      {currentView === "roma" ? (
        <div className="flex-1 relative min-w-0 min-h-0">
          <RomaPlanner onBack={closeRoma} />
        </div>
      ) : currentView === 'pulse' ? (
        <div className="flex-1 relative min-w-0 min-h-0">
          <PulseDashboard onBack={closePulse} />
          {/* Curate FAB */}
          <button
            onClick={() => setShowPulseCurate(true)}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-accent text-white shadow-lg hover:bg-accent/80 transition-all duration-200 flex items-center justify-center text-xl z-40"
            title="Kuratér morgendagens Pulse"
          >
            🎯
          </button>
        </div>
      ) : settings.immersiveMode ? (
        <div className="flex-1 relative min-w-0 min-h-0">
          <ImmersiveWorkspace onPanelToggle={handlePanelToggle}>
            {chatAreaContent}
          </ImmersiveWorkspace>
        </div>
      ) : (
        <div className="flex-1 relative min-w-0 min-h-0">
          {chatAreaContent}
        </div>
      )}

      {/* LOOP 10: Cutting-Edge Features Panel */}
      <CuttingEdgeFeatures
        isActive={cuttingEdgeMode}
        messages={messages}
        onFeatureActivate={handleFeatureActivate}
      />

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          activeTab={settingsTab}
          settings={settings}
          onTabChange={setSettingsTab}
          onUpdateSettings={updateSettings}
          resetToDefaults={resetToDefaults}
          onClose={closeSettings}
        />
      )}

      {/* Pulse+ Curation Dialog */}
      <PulseCurate
        isOpen={showPulseCurate}
        onClose={() => setShowPulseCurate(false)}
        onSubmit={handlePulseCurate}
      />

      <ShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  );
}

