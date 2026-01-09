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
import { ShortcutsModal } from './components/ShortcutsModal';
import { DropZone } from './components/DropZone';
import { CommandPalette } from './components/CommandPalette';
import { findShortcut } from './lib/shortcuts';

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
  isArchived?: boolean;
}

export function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<string>('general');
  const [cuttingEdgeMode, setCuttingEdgeMode] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>('chat');
  const [showPulseCurate, setShowPulseCurate] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
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
    archiveChat,
    createNewChat,
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

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  const {
    settings,
    updateSettings,
    resetToDefaults, // Added resetToDefaults
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

  const handleImmersiveToggle = useCallback((active: boolean) => {
    updateSettings({ immersiveMode: active });
  }, [updateSettings]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        // Send content directly to the active chat
        sendMessage(`Her er indholdet fra filen "${file.name}":\n\n${content}`, settings);
      };
      reader.readAsText(file);
    }
  };

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
    const shortcut = findShortcut(content);
    if (shortcut) {
      const result = await shortcut.handler({
        content,
        sendMessage: (c) => sendMessage(c, settings),
        updateSettings,
        createChat,
        archiveChat: (id) => archiveChat(id || currentChatId || '')
      });
      if (result) {
        addSystemMessage(result.content, result.meta);
      }
      return;
    }
    await sendMessage(content, settings);
  }, [sendMessage, settings, addSystemMessage, updateSettings, createChat, archiveChat, currentChatId]);

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
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex h-screen bg-bg-primary text-text-primary overflow-hidden transition-all duration-700 border-t-2 holographic-bg animate-holographic-float ${cuttingEdgeMode ? 'border-purple-500 shadow-[0_-10px_30px_rgba(168,85,247,0.15)]' :
        settings.immersiveMode ? 'border-accent shadow-[0_-10px_30px_rgba(226,0,116,0.15)]' :
          'border-white/5'
        }`}>

      <DropZone isDragging={isDragging} />

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        actions={{
          newChat: createNewChat,
          openSettings: (tab) => { setShowSettings(true); setActiveSettingsTab(tab); },
          toggleImmersive: () => updateSettings({ immersiveMode: !settings.immersiveMode }),
          toggleLab: () => setCuttingEdgeMode(prev => !prev),
          archiveCurrent: () => {
            const activeId = chats.find(c => !c.isArchived)?.id;
            if (activeId) archiveChat(activeId);
          },
          executeShortcut: handleSendMessage
        }}
      />
      {/* Sidebar */}
      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        onNewChat={createChat}
        onSelectChat={(id) => { selectChat(id); setCurrentView('chat'); }}
        onDeleteChat={deleteChat}
        onArchiveChat={archiveChat}
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

