import { useState, useEffect } from 'react';
import { IconPlus, IconTrash, IconPlug } from '../icons';
import { useToast } from '../Toast';

export function MCPSettings() {
    const [installed, setInstalled] = useState<Array<{ name: string; type: string; endpoint: string; enabled: boolean }>>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    const fetchServers = async () => {
        setLoading(true);
        try {
            const api = (window as any).sca01?.chat;
            if (api?.getMcpServers) {
                const servers = await api.getMcpServers();
                setInstalled(Object.entries(servers || {}).map(([name, config]: [string, any]) => ({
                    name,
                    ...config
                })));
            }
        } catch {
            showToast('Kunne ikke hente MCP servere', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServers();
    }, []);

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-sm font-bold text-text-primary">Model Context Protocol</h3>
                    <p className="text-xs text-text-muted">Forbind SCA-01 til eksterne værktøjer og data</p>
                </div>
                <button className="btn btn-primary px-4 py-2 text-xs">
                    <IconPlus className="w-3.5 h-3.5 mr-2" /> Tilføj Server
                </button>
            </header>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="space-y-3">
                    {installed.map((server) => (
                        <div key={server.name} className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-all group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-bg-tertiary flex items-center justify-center text-accent">
                                    <IconPlug className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-text-primary">{server.name}</span>
                                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${server.enabled ? 'bg-success/20 text-success' : 'bg-white/10 text-text-muted'
                                            }`}>
                                            {server.enabled ? 'Aktiv' : 'Deaktiveret'}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-text-muted font-mono truncate">{server.endpoint}</div>
                                </div>
                                <button className="p-2 text-text-muted hover:text-error hover:bg-error/10 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                    <IconTrash className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
