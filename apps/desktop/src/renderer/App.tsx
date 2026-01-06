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
  const [immersiveMode, setImmersiveMode] = useState(false);
  const [activePanels, setActivePanels] = useState<Set<string>>(new Set(['chat']));
  const [cuttingEdgeMode, setCuttingEdgeMode] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>('chat');
  const [showPulseCurate, setShowPulseCurate] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const {
    chats,
    currentChatId,
    messages,
    isLoading,
    createChat,
    selectChat,
    deleteChat,
    sendMessage,
  } = useChat();
  
  const {
    settings,
    updateSettings,
    ollamaStatus,
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
    setActivePanels(prev => {
      const newPanels = new Set(prev);
      if (visible) {
        newPanels.add(panelId);
      } else {
        newPanels.delete(panelId);
      }
      return newPanels;
    });
  }, []);

  const toggleImmersiveMode = useCallback(() => {
    setImmersiveMode(prev => !prev);
  }, []);

  // LOOP 10: Cutting Edge Features
  const handleFeatureActivate = useCallback((feature: string, data?: any) => {
    console.log('Cutting edge feature activated:', feature, data);
    // Here you could integrate with actual advanced features
  }, []);

  const toggleCuttingEdgeMode = useCallback(() => {
    setCuttingEdgeMode(prev => !prev);
  }, []);

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
      security={{
        fullAccess: !!settings.fullAccess,
        autoApprove: !!settings.autoApprove,
        safeDirsCount: Array.isArray(settings.safeDirs) ? settings.safeDirs.length : 0,
        useCloud: !!settings.useCloud,
      }}
      onSendMessage={handleSendMessage}
      onOpenSettings={openSettings}
      onSelectModel={(model) => updateSettings({ model })}
    />
  );

  return (
    <div className="flex h-dvh bg-bg-primary holographic-bg animate-holographic-float overflow-hidden">
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
      ) : immersiveMode ? (
        <div className="flex-1 relative min-w-0 min-h-0">
          {/* LOOP 5 & 10: Mode Toggles */}
          <div className="absolute top-4 right-4 z-50 flex gap-2">
            <button
              onClick={toggleCuttingEdgeMode}
              className={`px-3 py-2 backdrop-blur-sm border rounded-lg transition-all duration-200 shadow-lg ${
                cuttingEdgeMode
                  ? 'bg-purple-500/20 border-purple-500/30 text-purple-400'
                  : 'bg-purple-500/10 border-purple-500/20 text-purple-300 hover:bg-purple-500/20'
              }`}
              title="Toggle Cutting-Edge Features"
            >
              ⚡ Lab
            </button>
            <button
              onClick={toggleImmersiveMode}
              className="px-3 py-2 bg-accent/20 backdrop-blur-sm border border-accent/30 rounded-lg text-accent hover:bg-accent/30 transition-all duration-200 shadow-lg"
              title="Exit Immersive Mode"
            >
              🎭 Exit Immersive
            </button>
          </div>

          <ImmersiveWorkspace onPanelToggle={handlePanelToggle}>
            {chatAreaContent}
          </ImmersiveWorkspace>
        </div>
      ) : (
        <div className="flex-1 relative min-w-0 min-h-0">
          {/* LOOP 5 & 10: Mode Toggles */}
          <div className="absolute top-4 right-4 z-50 flex gap-2">
            <button
              onClick={toggleCuttingEdgeMode}
              className={`px-3 py-2 backdrop-blur-sm border rounded-lg transition-all duration-200 shadow-lg ${
                cuttingEdgeMode
                  ? 'bg-purple-500/20 border-purple-500/30 text-purple-400'
                  : 'bg-purple-500/10 border-purple-500/20 text-purple-300 hover:bg-purple-500/20'
              }`}
              title="Toggle Cutting-Edge Features"
            >
              ⚡ Lab
            </button>
            <button
              onClick={toggleImmersiveMode}
              className="px-3 py-2 bg-accent/20 backdrop-blur-sm border border-accent/30 rounded-lg text-accent hover:bg-accent/30 transition-all duration-200 shadow-lg"
              title="Enter Immersive Mode"
            >
              🚀 Immersive Mode
            </button>
          </div>

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
          onClose={closeSettings}
        />
      )}

      {/* Pulse+ Curation Dialog */}
      <PulseCurate
        isOpen={showPulseCurate}
        onClose={() => setShowPulseCurate(false)}
        onSubmit={handlePulseCurate}
      />
    </div>
  );
}

