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
            <div className={`flex items-center gap-3 px-4 py-2 glass-card rounded-2xl shadow-xl border-opacity-30 transition-all duration-700 ${ollamaStatus === 'online' ? 'border-success/40 bg-success/5' : 'border-warning/40 bg-warning/5'
                }`}>
                <div className="relative flex items-center justify-center">
                    <div className={`w-2.5 h-2.5 rounded-full z-10 ${ollamaStatus === 'online' ? 'bg-success shadow-[0_0_10px_rgba(34,197,94,0.8)]' :
                        ollamaStatus === 'offline' ? 'bg-error shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-warning shadow-[0_0_10px_rgba(234,179,8,0.8)]'
                        }`} />
                    {ollamaStatus === 'online' && (
                        <>
                            <span className="absolute inset-0 w-2.5 h-2.5 bg-success rounded-full animate-ping opacity-75" />
                            <span className="absolute -inset-1.5 w-5.5 h-5.5 border border-success/30 rounded-full animate-pulse-ring opacity-20" />
                        </>
                    )}
                </div>
                <div className="flex flex-col">
                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-0.5 ${ollamaStatus === 'online' ? 'text-success/70' : 'text-warning/70'
                        }`}>
                        System Status
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-[0.05em] leading-none ${ollamaStatus === 'online' ? 'text-success' : 'text-warning'
                        }`}>
                        {ollamaStatus === 'online' ? 'Neural Link Active' : 'Connecting...'}
                    </span>
                </div>
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
