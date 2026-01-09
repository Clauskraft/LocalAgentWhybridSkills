import { memo, useState, useMemo } from 'react';
import type { Chat } from '../App';
import { IconChat, IconPlus, IconPlug, IconPulse, IconSettings, IconTrash, IconSearch, IconArchive, IconShield } from './icons';

interface SidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onArchiveChat?: (id: string) => void;
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
  onArchiveChat,
  onOpenSettings,
  onOpenPulse,
  onOpenRoma,
  isCollapsed = false,
  onToggleCollapsed
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const filteredChats = useMemo(() => {
    let result = chats;
    if (!searchQuery.trim()) {
      result = result.filter(c => !c.isArchived);
    } else {
      result = result.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result;
  }, [chats, searchQuery]);

  const archivedChats = useMemo(() => {
    return chats.filter(c => c.isArchived);
  }, [chats]);

  const groupedChats = filteredChats.reduce((acc, chat) => {
    const created = new Date(chat.createdAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 3600 * 24));

    let key = 'Ældre';
    if (diffDays === 0 && created.toDateString() === now.toDateString()) key = 'I dag';
    else if (diffDays === 1 || (diffDays === 0 && created.toDateString() !== now.toDateString())) key = 'I går';
    else if (diffDays < 7) key = 'Sidste 7 dage';

    if (!acc[key]) acc[key] = [];
    acc[key].push(chat);
    return acc;
  }, {} as Record<string, Chat[]>);

  // Sorter sektioner så I dag er øverst
  const sectionOrder = ['I dag', 'I går', 'Sidste 7 dage', 'Ældre'];
  const orderedSections = Object.keys(groupedChats).sort((a, b) =>
    sectionOrder.indexOf(a) - sectionOrder.indexOf(b)
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

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

        <div className="p-4 space-y-4">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 py-3 bg-accent text-white rounded-2xl hover:bg-accent-hover transition-all duration-300 font-bold text-sm shadow-[0_4px_15px_rgba(226,0,116,0.3)] btn-holographic group active:scale-95"
          >
            <IconPlus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
            {!isCollapsed && (
              <>
                <span>Ny samtale</span>
                <span className="ml-auto text-[10px] opacity-40 font-mono hidden group-hover:block transition-all">Ctrl+N</span>
              </>
            )}
          </button>

          {!isCollapsed && (
            <div className="relative group">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted group-focus-within:text-accent transition-colors" />
              <input
                type="text"
                placeholder="Søg i samtaler..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-accent/40 focus:bg-white/10 transition-all placeholder:text-text-muted/50"
              />
            </div>
          )}
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-2 min-h-0 custom-scrollbar">
        {orderedSections.map((section) => {
          const sectionChats = groupedChats[section];
          return (
            <div key={section}>
              {!isCollapsed ? (
                <div className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold px-3 py-4 mt-2 border-b border-white/5 mb-2">
                  {section}
                </div>
              ) : null}
              {sectionChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  onMouseMove={handleMouseMove}
                  className={`
                  group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer mb-1
                  transition-all duration-200 relative overflow-hidden item-magnetic-glow
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
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); onArchiveChat?.(chat.id); }}
                      className="p-1.5 text-text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                      title={chat.isArchived ? "Gendan fra arkiv" : "Arkivér samtale"}
                    >
                      <IconArchive className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }}
                      className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-all"
                      title="Slet samtale"
                    >
                      <IconTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}

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

      {/* Archived Section */}
      {!isCollapsed && archivedChats.length > 0 && (
        <div className="px-2 mb-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted hover:text-text-primary transition-colors bg-white/0 hover:bg-white/5 rounded-xl border border-transparent"
          >
            <div className="flex items-center gap-2">
              <IconArchive className="w-3 h-3" /> Arkiv ({archivedChats.length})
            </div>
            <span>{showArchived ? '−' : '+'}</span>
          </button>
          {showArchived && (
            <div className="mt-2 space-y-1 animate-fade-in pl-2">
              {archivedChats.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer text-[11px] text-text-muted group"
                >
                  <span className="truncate flex-1">{chat.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onArchiveChat?.(chat.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-accent"
                  >
                    <IconPlus className="w-3 h-3 rotate-45" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer / Watermark */}
      {!isCollapsed && (
        <div className="p-4 border-t border-white/5 opacity-40 select-none">
          <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-text-muted">
            <div className="flex items-center gap-1.5">
              <IconShield className="w-3 h-3 text-accent" />
              <span>@dot</span>
            </div>
            <span className="text-accent/60">v0.2.0 - PRODUCTION READY</span>
          </div>
        </div>
      )}
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
      <span className={`${highlight ? 'text-accent drop-shadow-[0_0_8px_rgba(226,0,116,0.4)]' : 'text-text-muted group-hover:text-text-secondary'} transition-all duration-300 group-hover:scale-110 group-active:scale-90`}>{icon}</span>
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

