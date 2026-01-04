import { memo } from 'react';
import type { Chat } from '../App';
import { IconChat, IconPlus, IconPlug, IconSettings, IconTrash } from './icons';

interface SidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onOpenSettings: (tab: string) => void;
}

export const Sidebar = memo(function Sidebar({
  chats,
  currentChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onOpenSettings,
}: SidebarProps) {
  const today = new Date().toDateString();

  const groupedChats = chats.reduce((acc, chat) => {
    const date = new Date(chat.createdAt).toDateString();
    const key = date === today ? 'I dag' : 'Tidligere';
    if (!acc[key]) acc[key] = [];
    acc[key].push(chat);
    return acc;
  }, {} as Record<string, Chat[]>);

  return (
    <aside className="w-[280px] bg-bg-secondary border-r border-border-primary flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-border-primary">
        <button
          onClick={onNewChat}
          className="btn btn-primary w-full justify-between"
        >
          <span className="inline-flex items-center gap-2">
            <IconPlus className="opacity-90" />
            <span>Ny samtale</span>
          </span>
          <kbd className="kbd bg-white/15 border-white/10 text-white/90">Ctrl+N</kbd>
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-2">
        {Object.entries(groupedChats).map(([section, sectionChats]) => (
          <div key={section}>
            <div className="text-xs text-text-muted uppercase tracking-wide px-2 py-3">
              {section}
            </div>
            {sectionChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer mb-0.5
                  transition-colors
                  ${chat.id === currentChatId 
                    ? 'bg-bg-active' 
                    : 'hover:bg-bg-hover'}
                `}
              >
                <span className="text-text-muted">
                  <IconChat />
                </span>
                <span className="flex-1 text-sm truncate">{chat.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat(chat.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all"
                  title="Slet"
                >
                  <IconTrash className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ))}

        {chats.length === 0 && (
          <p className="text-text-muted text-center py-8 text-sm">
            Ingen samtaler endnu
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border-primary space-y-1">
        <NavItem icon={<IconPlug className="w-4 h-4" />} label="MCP Servere" onClick={() => onOpenSettings('mcp')} />
        <NavItem icon={<IconSettings className="w-4 h-4" />} label="Indstillinger" onClick={() => onOpenSettings('general')} />
      </div>
    </aside>
  );
});

function NavItem({ 
  icon, 
  label, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors text-sm"
    >
      <span className="text-text-muted">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

