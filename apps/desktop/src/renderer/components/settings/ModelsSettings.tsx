import { useState, useCallback, useEffect } from 'react';
import { IconPlus, IconTrash } from '../icons';
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
        </div>
    );
}
