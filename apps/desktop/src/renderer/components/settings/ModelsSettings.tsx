import { useState, useCallback, useEffect } from 'react';
import { IconPlus, IconTrash, IconBolt, IconSettings } from '../icons';
import { useToast } from '../Toast';
import { UISettings } from '../../hooks/useSettings';

interface ModelsSettingsProps {
    settings: UISettings;
    onUpdate: (s: Partial<UISettings>) => void;
}

export function ModelsSettings({ settings, onUpdate }: ModelsSettingsProps) {
    const { showToast } = useToast();
    const [models, setModels] = useState<Array<{ name: string; size: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [pulling, setPulling] = useState(false);
    const [pullInput, setPullInput] = useState('');
    const [pullStatus, setPullStatus] = useState('');

    const fetchModels = useCallback(async () => {
        setLoading(true);
        try {
            const api = (window as any).sca01?.chat;
            if (api?.getModels) {
                const list = await api.getModels();
                const parsed = Array.isArray(list)
                    ? list
                        .filter((m) => m && typeof m.name === 'string')
                        .map((m) => ({ name: m.name as string, size: (m.size as string) ?? '' }))
                    : [];
                setModels(parsed);
            }
        } catch (e) {
            console.error('Error fetching models:', e);
            setModels([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleDelete = async (modelName: string) => {
        if (!window.confirm(`Er du sikker på, at du vil slette modellen "${modelName}"?`)) return;
        try {
            const api = (window as any).sca01?.chat;
            if (api?.deleteModel) {
                const res = await api.deleteModel(modelName);
                if (res?.success) {
                    showToast(`Modellen "${modelName}" er slettet`, 'success');
                    fetchModels();
                } else {
                    showToast(`Kunne ikke slette model: ${res?.error}`, 'error');
                }
            }
        } catch (e) {
            showToast('Fejl under sletning', 'error');
        }
    };

    useEffect(() => {
        fetchModels();
    }, [fetchModels]);

    const handlePull = async () => {
        const model = pullInput.trim();
        if (!model) return;

        setPulling(true);
        setPullStatus(`Downloader ${model}...`);
        try {
            const api = (window as any).sca01?.chat;
            const res = await api?.pullModel?.(model);
            if (res?.success) {
                showToast(`${model} er installeret!`, 'success');
                setPullStatus(`Færdig! ${model} er installeret.`);
                setPullInput('');
                await fetchModels();
            } else {
                const error = res?.error || 'Kunne ikke hente model';
                showToast(`Fejl under hentning: ${error}`, 'error');
                setPullStatus(`Fejl: ${error}`);
            }
        } catch (e) {
            const error = e instanceof Error ? e.message : 'Ukendt fejl';
            showToast(`Kritisk fejl: ${error}`, 'error');
            setPullStatus(`Fejl: ${error}`);
        } finally {
            setPulling(false);
        }
    };

    return (
        <div className="space-y-6">
            <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4 flex items-center gap-2">
                    <IconPlus className="w-3.5 h-3.5" /> Installer Ny Model
                </h3>
                <div className="flex gap-2 p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <input
                        type="text"
                        value={pullInput}
                        onChange={(e) => setPullInput(e.target.value)}
                        placeholder="fx phi3:mini eller mistral"
                        className="flex-1 bg-transparent text-sm focus:outline-none"
                        disabled={pulling}
                    />
                    <button
                        onClick={handlePull}
                        disabled={pulling || !pullInput.trim()}
                        className="px-4 py-2 bg-accent text-white rounded-xl text-xs font-bold hover:bg-accent-hover transition-all disabled:opacity-50"
                    >
                        {pulling ? 'HENTER...' : 'INSTALLER'}
                    </button>
                </div>
                {pullStatus && (
                    <p className={`mt-2 text-[10px] font-mono ${pullStatus.startsWith('Fejl') ? 'text-error' : 'text-accent'}`}>
                        {pullStatus}
                    </p>
                )}
            </section>

            <section className="p-6 glass-card rounded-3xl border-purple-500/20 bg-purple-500/5">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-1 flex items-center gap-2">
                            <IconBolt className="w-3.5 h-3.5" /> Parallel Compare Mode (Alpha)
                        </h3>
                        <p className="text-[10px] text-text-muted font-medium">Sammenlign svar fra op til 3 forskellige modeller samtidigt.</p>
                    </div>
                    <button
                        onClick={() => onUpdate({ compareMode: !settings.compareMode })}
                        className={`w-12 h-6 rounded-full transition-all relative ${settings.compareMode ? 'bg-purple-500' : 'bg-white/10'}`}
                        aria-label="Toggle compare mode"
                    >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.compareMode ? 'right-1' : 'left-1'}`} />
                    </button>
                </div>

                {settings.compareMode && (
                    <div className="space-y-3 animate-fade-in">
                        <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">Vælg Modeller til sammenligning:</div>
                        <div className="grid grid-cols-2 gap-2">
                            {models.slice(0, 6).map(model => {
                                const isSelected = settings.compareModels?.includes(model.name);
                                return (
                                    <button
                                        key={model.name}
                                        onClick={() => {
                                            const current = settings.compareModels || [];
                                            if (isSelected) {
                                                onUpdate({ compareModels: current.filter(m => m !== model.name) });
                                            } else if (current.length < 3) {
                                                onUpdate({ compareModels: [...current, model.name] });
                                            }
                                        }}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${isSelected
                                            ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                                            : 'bg-white/5 border-white/5 text-text-muted hover:border-white/20'
                                            }`}
                                    >
                                        <div className={`w-3 h-3 rounded-sm border ${isSelected ? 'bg-purple-500 border-purple-400' : 'border-white/20'}`} />
                                        <span className="text-[11px] font-bold truncate">{model.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </section>

            <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4">
                    Installerede Modeller ({models.length})
                </h3>
                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="w-6 h-6 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-2">
                        {models.map((model) => (
                            <div
                                key={model.name}
                                className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm truncate">{model.name}</div>
                                    <div className="text-[10px] text-text-muted font-mono">{model.size}</div>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                    <button
                                        onClick={() => onUpdate({ model: model.name })}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${model.name === settings.model
                                            ? 'bg-accent text-white shadow-[0_0_20px_rgba(226,0,116,0.4)]'
                                            : 'bg-white/5 border border-white/10 text-text-muted hover:text-text-primary hover:border-white/20'
                                            }`}
                                    >
                                        {model.name === settings.model ? 'AKTIV' : 'VÆLG'}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(model.name)}
                                        className="p-2 text-text-muted hover:text-error hover:bg-error/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                        title="Slet model"
                                    >
                                        <IconTrash className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="pt-6 border-t border-white/5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-6 flex items-center gap-2">
                    <IconSettings className="w-3.5 h-3.5" /> Advanced AI Parameters
                </h3>

                <div className="space-y-8 glass-card p-6 rounded-3xl border-accent/10">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-text-primary uppercase tracking-wider">Model Temperature</label>
                            <span className="px-2 py-1 bg-accent/20 text-accent rounded-lg text-[10px] font-black font-mono">
                                {(settings.temperature ?? 0.7).toFixed(1)}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={settings.temperature ?? 0.7}
                            onChange={(e) => onUpdate({ temperature: parseFloat(e.target.value) })}
                            className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-accent"
                            aria-label="Temperature"
                        />
                        <div className="flex justify-between text-[8px] text-text-muted font-bold uppercase tracking-widest">
                            <span>Præcis</span>
                            <span>Kreativ</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-text-primary uppercase tracking-wider">Context Window</label>
                            <span className="px-2 py-1 bg-accent/20 text-accent rounded-lg text-[10px] font-black font-mono">
                                {(settings.contextLength ?? 4096).toLocaleString()} tokens
                            </span>
                        </div>
                        <input
                            type="range"
                            min="512"
                            max="32768"
                            step="512"
                            value={settings.contextLength ?? 4096}
                            onChange={(e) => onUpdate({ contextLength: parseInt(e.target.value) })}
                            className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-accent"
                            aria-label="Context length"
                        />
                        <div className="flex justify-between text-[8px] text-text-muted font-bold uppercase tracking-widest">
                            <span>Hurtig</span>
                            <span>Dyb Hukommelse</span>
                        </div>
                    </div>
                </div>
            </section>
        </div >
    );
}
