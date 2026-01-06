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
        "bg-bg-secondary border-r border-border-primary flex flex-col h-full shrink-0",
        isCollapsed ? "w-[72px]" : "w-[280px]",
      ].join(" ")}
    >
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
                  group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer mb-0.5
                  transition-colors
                  ${chat.id === currentChatId 
                    ? 'bg-bg-active' 
                    : 'hover:bg-bg-hover'}
                `}
                title={chat.title}
              >
                <span className="text-text-muted">
                  <IconChat />
                </span>
                {!isCollapsed ? <span className="flex-1 text-sm truncate">{chat.title}</span> : null}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat(chat.id);
                  }}
                  className={[
                    "p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all",
                    isCollapsed ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                  ].join(" ")}
                  title="Slet"
                >
                  <IconTrash className="w-4 h-4" />
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
        <NavItem icon={<IconSettings className="w-4 h-4" />} label={isCollapsed ? "" : "Indstillinger"} onClick={() => onOpenSettings('general')} compact={isCollapsed} />
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
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  highlight?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors text-sm ${
        highlight
          ? 'text-accent bg-accent/10 hover:bg-accent/20'
          : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
      }`}
      title={label || undefined}
    >
      <span className={highlight ? 'text-accent' : 'text-text-muted'}>{icon}</span>
      {compact ? null : <span>{label}</span>}
      {highlight && !compact && (
        <span className="ml-auto text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">
          NY
        </span>
      )}
    </div>
  );
}

