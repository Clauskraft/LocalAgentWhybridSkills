import { memo } from 'react';
import { IconShield, IconBolt, IconPlug, IconChevronDown, IconSparkles } from './icons';

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
    cuttingEdgeMode: boolean;
    setCuttingEdgeMode: (active: boolean) => void;
    immersiveMode: boolean;
    setImmersiveMode: (active: boolean) => void;
    mcpServersCount: number;
}

export const StatusMenu = memo(function StatusMenu({
    ollamaStatus,
    showNeuralVisualizer,
    setShowNeuralVisualizer,
    onOpenSettings,
    security,
    cuttingEdgeMode,
    setCuttingEdgeMode,
    immersiveMode,
    setImmersiveMode,
    mcpServersCount,
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
                    className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-all relative group"
                    title="MCP Status"
                >
                    <IconPlug className="w-4 h-4" />
                    {mcpServersCount > 0 && (
                        <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-accent text-white text-[7px] font-bold flex items-center justify-center rounded-full shadow-[0_0_5px_rgba(226,0,116,0.6)] animate-pulse">
                            {mcpServersCount}
                        </div>
                    )}
                </button>

                <div className="w-[1px] h-4 bg-white/10 mx-1" />

                <button
                    onClick={() => setCuttingEdgeMode(!cuttingEdgeMode)}
                    className={`p-2 rounded-lg transition-all ${cuttingEdgeMode ? 'text-purple-400 bg-purple-500/20' : 'text-text-muted hover:bg-white/5'
                        }`}
                    title="Cutting-Edge Lab Features"
                >
                    <IconSparkles className="w-4 h-4" />
                </button>

                <button
                    onClick={() => setImmersiveMode(!immersiveMode)}
                    className={`p-2 rounded-lg transition-all ${immersiveMode ? 'text-accent bg-accent/20' : 'text-text-muted hover:bg-white/5'
                        }`}
                    title="Immersive Mode"
                >
                    <span className="text-sm font-bold leading-none">🚀</span>
                </button>
            </div>
        </div>
    );
});
