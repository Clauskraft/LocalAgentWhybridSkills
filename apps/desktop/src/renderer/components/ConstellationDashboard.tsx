import { memo } from 'react';
import { IconBolt, IconSparkles } from './icons';

interface DotProps {
    id: string;
    name: string;
    role: string;
    status: 'active' | 'idle' | 'warning';
    load: number;
}

const DotNode = ({ id, name, role, status, load }: DotProps) => (
    <div key={id} className={`p-4 glass-card rounded-2xl border transition-all duration-500 hover:scale-105 group relative overflow-hidden ${status === 'active' ? 'border-accent/40 bg-accent/5' : 'border-white/10 bg-white/5'
        }`}>
        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
            <IconSparkles className="w-12 h-12" />
        </div>

        <div className="flex items-start justify-between mb-4">
            <div className="flex flex-col">
                <h3 className="text-sm font-black uppercase tracking-widest text-text-primary group-hover:text-accent transition-colors">{name}</h3>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{role}</span>
            </div>
            <div className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-success animate-pulse' : 'bg-text-muted'
                }`} />
        </div>

        <div className="space-y-3">
            <div className="flex items-center justify-between text-[10px] font-mono text-text-muted uppercase">
                <span>Core Load</span>
                <span>{load}%</span>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                    className="load-bar"
                    style={{ '--load-width': `${load}%` } as React.CSSProperties}
                />
            </div>
        </div>

        <div className="mt-4 flex gap-2">
            <div className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[8px] font-bold uppercase tracking-tighter opacity-60">
                Lnk_Active
            </div>
            <div className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[8px] font-bold uppercase tracking-tighter opacity-60">
                Enc_Stat: OK
            </div>
        </div>
    </div>
);

export const ConstellationDashboard = memo(function ConstellationDashboard({ onBack }: { onBack: () => void }) {
    return (
        <div className="flex-1 flex flex-col h-full bg-bg-primary overflow-hidden animate-fade-in relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(226,0,116,0.1)_0%,transparent_50%)] pointer-events-none" />

            <header className="px-8 py-6 flex items-center justify-between border-b border-white/5 backdrop-blur-md z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-white/5 rounded-xl transition-all text-text-muted hover:text-text-primary"
                    >
                        ←
                    </button>
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-[0.2em] text-text-primary">@dot Constellation</h1>
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Mesh Infrastructure • Neural Node Management</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="px-4 py-2 bg-success/10 border border-success/30 rounded-xl flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-success animate-ping" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-success">Mesh Status: Optimal</span>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10">
                <div className="max-w-6xl mx-auto space-y-12">
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-1 h-4 bg-accent rounded-full" />
                            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-accent">Active Specialized Nodes</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <DotNode id="dot.code" name="Dot.Code" role="Refactoring Precision" status="active" load={84} />
                            <DotNode id="dot.sec" name="Dot.Sec" role="Audit & Policy" status="idle" load={12} />
                            <DotNode id="dot.ops" name="Dot.Ops" role="Infra Orchestrator" status="idle" load={0} />
                            <DotNode id="dot.brief" name="Dot.Brief" role="OSINT & Intel" status="active" load={42} />
                        </div>
                    </section>

                    <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 glass-card rounded-3xl p-8 border-white/10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <IconBolt className="w-64 h-64" />
                            </div>
                            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-accent mb-8">System Handover Log (Blackboard)</h2>
                            <div className="space-y-4 font-mono">
                                {[
                                    { t: '21:14:02', a: 'Hub', msg: 'Initiating Task Cascade: optimization_cycle_3' },
                                    { t: '21:14:05', a: 'Dot.Code', msg: 'Analyzing ThinkingIndicator.tsx for branding alignment' },
                                    { t: '21:14:12', a: 'Dot.Code', msg: 'Applying specialized neural traces to renderer' },
                                    { t: '21:14:15', a: 'Dot.Plan', msg: 'Updating master backlog: Cycle 3 scope verified' },
                                    { t: '21:14:20', a: 'System', msg: 'Mesh synchronization successful. Awaiting hub intent.' }
                                ].map((log, i) => (
                                    <div key={i} className="flex gap-4 text-[11px] group">
                                        <span className="text-text-muted opacity-40 shrink-0">[{log.t}]</span>
                                        <span className="text-accent font-bold shrink-0 w-24">@{log.a}</span>
                                        <span className="text-text-secondary group-hover:text-text-primary transition-colors">{log.msg}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="glass-card rounded-3xl p-8 border-white/10 flex flex-col items-center justify-center text-center">
                            <div className="w-48 h-48 relative mb-8">
                                <div className="absolute inset-0 border-4 border-accent/20 rounded-full animate-ping duration-[4000ms]" />
                                <div className="absolute inset-4 border-2 border-accent/40 rounded-full animate-pulse-slow" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-6xl text-accent holographic-glow">@</div>
                                </div>
                            </div>
                            <h3 className="text-lg font-black uppercase tracking-widest mb-2">Central Hub</h3>
                            <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] leading-relaxed">
                                Orchestrating intent across the distributed constellation.<br />
                                <span className="text-accent">V4.1 Protocol Active</span>
                            </p>
                        </div>
                    </section>
                </div>
            </div>

            <footer className="px-8 py-6 border-t border-white/5 text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] flex justify-between items-center opacity-40">
                <span>Constellation ID: SCA-MESH-PROD-2026</span>
                <span>Neural Layer: Enforced</span>
            </footer>
        </div>
    );
});
