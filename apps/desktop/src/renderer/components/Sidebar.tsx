import { memo } from 'react';
import type { Chat } from '../App';
import { IconChat, IconPlus, IconPlug, IconPulse, IconSettings, IconTrash } from './icons';

interface SidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onOpenSettings: (tab: string) => void;
  onOpenPulse?: () => void;
  onOpenRoma?: () => void;
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export const Sidebar = memo(function Sidebar({
  chats,
  currentChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onOpenSettings,
  onOpenPulse,
  onOpenRoma,
  isCollapsed = false,
  onToggleCollapsed,
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
    <aside
      className={[
        "bg-bg-secondary border-r border-white/5 flex flex-col h-full shrink-0 shadow-2xl relative z-20",
        isCollapsed ? "w-[72px]" : "w-[300px]",
      ].join(" ")}
    >
      <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-white/5 to-transparent shadow-[1px_0_10px_rgba(0,0,0,0.3)]" />
      {/* Header */}
      <div className="p-3 border-b border-border-primary flex items-center gap-2">
        {onToggleCollapsed && (
          <button
            onClick={onToggleCollapsed}
            className="icon-btn w-9 h-9"
            title={isCollapsed ? "Udvid sidebar" : "Skjul sidebar"}
            aria-label={isCollapsed ? "Udvid sidebar" : "Skjul sidebar"}
          >
            {isCollapsed ? "»" : "«"}
          </button>
        )}

        <button
          onClick={onNewChat}
          className={["btn btn-primary flex-1 justify-between", isCollapsed ? "px-2" : ""].join(" ")}
          title="Ny samtale (Ctrl+N)"
        >
          <span className="inline-flex items-center gap-2">
            <IconPlus className="opacity-90" />
            {!isCollapsed ? <span>Ny samtale</span> : null}
          </span>
          {!isCollapsed ? <kbd className="kbd bg-white/15 border-white/10 text-white/90">Ctrl+N</kbd> : null}
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {Object.entries(groupedChats).map(([section, sectionChats]) => (
          <div key={section}>
            {!isCollapsed ? (
              <div className="text-xs text-text-muted uppercase tracking-wide px-2 py-3">{section}</div>
            ) : null}
            {sectionChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`
                  group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer mb-1
                  transition-all duration-200 relative overflow-hidden
                  ${chat.id === currentChatId
                    ? 'bg-accent/10 border border-accent/20 text-accent ring-1 ring-accent/10'
                    : 'hover:bg-white/5 border border-transparent text-text-secondary hover:text-text-primary'}
                `}
                title={chat.title}
              >
                {chat.id === currentChatId && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent rounded-r-full shadow-[2px_0_10px_rgba(226,0,116,0.6)]" />
                )}
                <span className={`${chat.id === currentChatId ? 'text-accent' : 'text-text-muted group-hover:text-text-secondary'}`}>
                  <IconChat className="w-4 h-4" />
                </span>
                {!isCollapsed ? (
                  <span className={`flex-1 text-sm truncate font-medium ${chat.id === currentChatId ? 'text-accent' : ''}`}>
                    {chat.title}
                  </span>
                ) : null}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat(chat.id);
                  }}
                  className={[
                    "p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error/10 transition-all",
                    isCollapsed ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                  ].join(" ")}
                  title="Slet"
                >
                  <IconTrash className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ))}

        {chats.length === 0 && (
          !isCollapsed ? (
            <p className="text-text-muted text-center py-8 text-sm">Ingen samtaler endnu</p>
          ) : null
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border-primary space-y-1">
        {onOpenRoma && (
          <NavItem
            icon={<span className="text-base leading-none">🧭</span>}
            label={isCollapsed ? "" : "ROMA Planner"}
            onClick={onOpenRoma}
            compact={isCollapsed}
          />
        )}
        {onOpenPulse && (
          <NavItem
            icon={<IconPulse className="w-4 h-4" />}
            label={isCollapsed ? "" : "Pulse+ Briefing"}
            onClick={onOpenPulse}
            highlight
            compact={isCollapsed}
          />
        )}
        <NavItem icon={<IconPlug className="w-4 h-4" />} label={isCollapsed ? "" : "MCP Servere"} onClick={() => onOpenSettings('mcp')} compact={isCollapsed} />
        <NavItem icon={<IconSettings className="w-4 h-4" />} label={isCollapsed ? "" : "Indstillinger"} onClick={() => onOpenSettings('general')} compact={isCollapsed} kbd="Ctrl+," />
      </div>
    </aside>
  );
});

function NavItem({
  icon,
  label,
  onClick,
  highlight = false,
  compact = false,
  kbd,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  highlight?: boolean;
  compact?: boolean;
  kbd?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 text-sm ${highlight
          ? 'text-accent bg-accent/10 border border-accent/20 hover:bg-accent/20 shadow-[0_0_15px_rgba(226,0,116,0.1)]'
          : 'text-text-secondary hover:bg-white/5 hover:text-text-primary border border-transparent'
        }`}
      title={label || undefined}
    >
      <span className={`${highlight ? 'text-accent' : 'text-text-muted group-hover:text-text-secondary'} transition-colors`}>{icon}</span>
      {compact ? null : <span className="font-medium flex-1">{label}</span>}
      {highlight && !compact && (
        <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
          Aktuel
        </span>
      )}
      {kbd && !compact && (
        <kbd className="hidden group-hover:inline-block text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono text-text-muted">
          {kbd}
        </kbd>
      )}
    </div>
  );
}

