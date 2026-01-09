import { useState, useEffect, memo, useMemo } from 'react';
import { IconSearch, IconSettings, IconPlus, IconSparkles, IconShield, IconArchive, IconBolt, IconCircle } from './icons';
import { SYSTEM_SHORTCUTS } from '../lib/shortcuts';

interface Command {
    id: string;
    text: string;
    description: string;
    icon: React.ReactNode;
    shortcut?: string;
    action: () => void;
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    actions: {
        newChat: () => void;
        openSettings: (tab: string) => void;
        toggleImmersive: () => void;
        toggleLab: () => void;
        archiveCurrent: () => void;
        executeShortcut: (cmd: string) => void;
    };
}

export const CommandPalette = memo(function CommandPalette({ isOpen, onClose, actions }: CommandPaletteProps) {
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    const commands: Command[] = useMemo(() => {
        const base: Command[] = [
            { id: 'new', text: 'Ny Samtale', description: 'Start en frisk chat session', icon: <IconPlus className="w-4 h-4" />, shortcut: 'Ctrl+N', action: actions.newChat },
            { id: 'settings', text: 'Indstillinger', description: 'Åbn system konfiguration', icon: <IconSettings className="w-4 h-4" />, shortcut: 'Ctrl+,', action: () => actions.openSettings('general') },
            { id: 'immersive', text: 'Toggle Immersive Mode', description: 'Fuldskærms workspace arkitektur', icon: <IconBolt className="w-4 h-4 text-accent" />, action: actions.toggleImmersive },
            { id: 'lab', text: 'Toggle Lab Mode', description: 'Eksperimentelle @dot funktioner', icon: <IconSparkles className="w-4 h-4 text-purple-400" />, shortcut: 'Ctrl+/', action: actions.toggleLab },
            { id: 'archive', text: 'Arkivér Samtale', description: 'Flyt aktiv chat til arkiv', icon: <IconArchive className="w-4 h-4" />, action: actions.archiveCurrent },
        ];

        const shortcuts: Command[] = Object.entries(SYSTEM_SHORTCUTS).map(([key, data]) => ({
            id: `sc-${key}`,
            text: `/sc:${key}`,
            description: data.description,
            icon: <IconCircle className="w-4 h-4 text-emerald-400" />,
            action: () => actions.executeShortcut(`/sc:${key}`)
        }));

        return [...base, ...shortcuts];
    }, [actions]);

    const filtered = commands.filter(c => c.text.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase()));

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowDown') setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
            if (e.key === 'ArrowUp') setSelectedIndex(i => Math.max(i - 1, 0));
            if (e.key === 'Enter' && filtered[selectedIndex]) {
                filtered[selectedIndex].action();
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, filtered, selectedIndex]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4 animate-fade-in">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-2xl glass-card rounded-[2rem] border-white/20 shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden animate-slide-up">
                <div className="flex items-center gap-4 px-6 py-5 border-b border-white/10 bg-white/5">
                    <IconSearch className="w-5 h-5 text-accent" />
                    <input
                        autoFocus
                        type="text"
                        placeholder="Hvad vil du gøre? (Søg efter kommandoer...)"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setSelectedIndex(0); }}
                        className="flex-1 bg-transparent text-lg text-text-primary placeholder:text-text-muted focus:outline-none"
                    />
                    <div className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] text-text-muted font-black uppercase">ESC</div>
                </div>

                <div className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
                    {filtered.map((cmd, i) => (
                        <div
                            key={cmd.id}
                            onClick={() => { cmd.action(); onClose(); }}
                            onMouseEnter={() => setSelectedIndex(i)}
                            className={`flex items-center justify-between px-4 py-4 rounded-2xl cursor-pointer transition-all ${i === selectedIndex ? 'bg-accent text-white shadow-xl shadow-accent/20 scale-[1.02]' : 'text-text-secondary hover:bg-white/5'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${i === selectedIndex ? 'bg-white/20' : 'bg-white/5 text-accent'}`}>
                                    {cmd.icon}
                                </div>
                                <div>
                                    <div className={`text-sm font-bold ${i === selectedIndex ? 'text-white' : 'text-text-primary'}`}>{cmd.text}</div>
                                    <div className={`text-xs ${i === selectedIndex ? 'text-white/70' : 'text-text-muted'}`}>{cmd.description}</div>
                                </div>
                            </div>
                            {cmd.shortcut && (
                                <div className={`px-2 py-1 rounded text-[9px] font-bold font-mono ${i === selectedIndex ? 'bg-white/20 text-white' : 'bg-white/5 text-text-muted border border-white/10'}`}>
                                    {cmd.shortcut}
                                </div>
                            )}
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div className="py-12 text-center text-text-muted text-sm font-medium">
                            Ingen kommandoer fundet til "{search}"
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
