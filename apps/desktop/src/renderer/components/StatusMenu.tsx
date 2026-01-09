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
            <div className={`flex items-center gap-2 px-4 py-2 glass-card rounded-2xl shadow-lg border-opacity-40 transition-all duration-500 ${ollamaStatus === 'online' ? 'border-success/30' : 'border-warning/30'
                }`}>
                <div className="relative flex items-center justify-center">
                    <span
                        className={`w-2.5 h-2.5 rounded-full ${ollamaStatus === 'online' ? 'bg-success' :
                            ollamaStatus === 'offline' ? 'bg-error' : 'bg-warning'
                            }`}
                    />
                    {ollamaStatus === 'online' && (
                        <span className="absolute inset-0 w-2.5 h-2.5 bg-success rounded-full animate-ping opacity-75" />
                    )}
                </div>
                <span className={`text-[11px] font-black uppercase tracking-[0.15em] ${ollamaStatus === 'online' ? 'text-success' : 'text-warning'
                    }`}>
                    {ollamaStatus === 'online' ? 'Neural Link Active' : 'Connecting...'}
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
