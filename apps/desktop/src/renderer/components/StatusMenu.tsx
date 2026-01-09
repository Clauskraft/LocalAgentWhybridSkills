import { memo } from 'react';
import { IconShield, IconBolt, IconPlug, IconChevronDown } from './icons';

interface StatusMenuProps {
    ollamaStatus: 'online' | 'offline' | 'checking';
    showNeuralVisualizer: boolean;
    setShowNeuralVisualizer: (show: boolean) => void;
    onOpenSettings: (tab: string) => void;
    security: {
        fullAccess: boolean;
        autoApprove: boolean;
        safeDirsCount: number;
        useCloud: boolean;
    };
}

export const StatusMenu = memo(function StatusMenu({
    ollamaStatus,
    showNeuralVisualizer,
    setShowNeuralVisualizer,
    onOpenSettings,
    security,
}: StatusMenuProps) {
    return (
        <div className="flex items-center gap-2">
            {/* Mini status indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-full shadow-inner">
                <span
                    className={`w-2 h-2 rounded-full ${ollamaStatus === 'online' ? 'bg-success animate-pulse' :
                            ollamaStatus === 'offline' ? 'bg-error' : 'bg-warning animate-pulse'
                        }`}
                />
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    {ollamaStatus === 'online' ? 'System Ready' : 'System Busy'}
                </span>
            </div>

            {/* Main Status Dropdown (Simplified for now as a group) */}
            <div className="flex items-center gap-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-1 shadow-lg">
                <button
                    onClick={() => onOpenSettings('security')}
                    className={`p-2 rounded-lg transition-all ${security.fullAccess ? 'text-warning hover:bg-warning/10' : 'text-accent hover:bg-accent/10'
                        }`}
                    title={security.fullAccess ? 'Full Access Enabled' : 'Safe Mode Active'}
                >
                    <IconShield className="w-4 h-4" />
                </button>

                <button
                    onClick={() => setShowNeuralVisualizer(!showNeuralVisualizer)}
                    className={`p-2 rounded-lg transition-all ${showNeuralVisualizer ? 'bg-accent text-white' : 'text-accent hover:bg-accent/10'
                        }`}
                    title="Neural Network Visualizer"
                >
                    <IconBolt className="w-4 h-4" />
                </button>

                <button
                    onClick={() => onOpenSettings('mcp')}
                    className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-all"
                    title="MCP Status"
                >
                    <IconPlug className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
});
