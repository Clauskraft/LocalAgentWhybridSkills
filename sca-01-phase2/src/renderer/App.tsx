import { useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { SettingsModal } from './components/SettingsModal';
import { useChat } from './hooks/useChat';
import { useSettings } from './hooks/useSettings';

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

  const handleSendMessage = useCallback(async (content: string) => {
    await sendMessage(content, settings);
  }, [sendMessage, settings]);

  return (
    <div className="flex h-screen bg-bg-primary">
      {/* Sidebar */}
      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        onNewChat={createChat}
        onSelectChat={selectChat}
        onDeleteChat={deleteChat}
        onOpenSettings={openSettings}
      />

      {/* Main Content */}
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
    </div>
  );
}

