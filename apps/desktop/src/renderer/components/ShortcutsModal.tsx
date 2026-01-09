import { memo, useEffect } from 'react';
import { IconX } from './icons';

interface ShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ShortcutsModal = memo(function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!isOpen) return null;

    const shortcuts = [
        { keys: ['Ctrl', 'N'], desc: 'Ny samtale' },
        { keys: ['Ctrl', '/'], desc: 'Vis smutveje' },
        { keys: ['Ctrl', ','], desc: 'Indstillinger' },
        { keys: ['Ctrl', 'F'], desc: 'Søg i chat' },
        { keys: ['Esc'], desc: 'Luk modal' },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md glass-card rounded-[2.5rem] p-8 animate-message-entry shadow-[0_0_50px_rgba(0,0,0,0.5)] border-accent/20">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-xl font-black uppercase tracking-[0.2em] text-accent">System Commands</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
                        <IconX className="w-5 h-5 text-text-muted" />
                    </button>
                </div>

                <div className="space-y-6">
                    {shortcuts.map((s, i) => (
                        <div key={i} className="flex justify-between items-center group">
                            <span className="text-sm font-medium text-text-secondary group-hover:text-text-primary transition-colors">{s.desc}</span>
                            <div className="flex gap-1.5">
                                {s.keys.map((key, ki) => (
                                    <kbd key={ki} className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold font-mono text-accent shadow-lg">
                                        {key}
                                    </kbd>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-10 pt-6 border-t border-white/5 text-center">
                    <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">
                        SCA-01 Neural Interface v0.2.0
                    </p>
                </div>
            </div>
        </div>
    );
});
