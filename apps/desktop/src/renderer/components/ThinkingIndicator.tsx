import { memo, useState, useEffect } from 'react';

const AGENT_ROLES = ['Dot.Code', 'Dot.Sec', 'Dot.Ops', 'Dot.Brief', 'Dot.Plan'];
const TRACES = [
    'Analyzing Context...',
    'Evaluating Security Policy...',
    'Consulting Handover Log...',
    'Optimizing Neural Weights...',
    'Synthesizing Protocol...',
    'Mapping Constellation Nodes...',
    'Auditing Intent Cascade...'
];

export const ThinkingIndicator = memo(function ThinkingIndicator() {
    const [role, setRole] = useState(AGENT_ROLES[0]);
    const [traceIndex, setTraceIndex] = useState(0);

    useEffect(() => {
        const roleInt = setInterval(() => {
            setRole(prev => {
                const idx = AGENT_ROLES.indexOf(prev);
                return AGENT_ROLES[(idx + 1) % AGENT_ROLES.length];
            });
        }, 3000);

        const traceInt = setInterval(() => {
            setTraceIndex(prev => (prev + 1) % TRACES.length);
        }, 2000);

        return () => {
            clearInterval(roleInt);
            clearInterval(traceInt);
        };
    }, []);

    return (
        <div className="flex gap-4 animate-fade-in py-2">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white flex-shrink-0 animate-pulse-slow shadow-lg shadow-accent/20 holographic-glow border border-white/20">
                <span className="text-sm font-black">@</span>
            </div>

            <div className="flex flex-col gap-2 py-0.5 flex-1 max-w-sm">
                <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-accent animate-pulse">
                            @dot is coordinating
                        </span>
                        <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest opacity-70">
                            Active Node: <span className="text-white">{role}</span>
                        </span>
                    </div>
                </div>

                <div className="relative h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div className="absolute inset-0 bg-gradient-to-r from-accent/20 via-accent to-accent/20 animate-loading-slide shadow-[0_0_15px_rgba(226,0,116,0.6)]" />
                </div>

                <div className="flex flex-col gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl mt-1 animate-fade-in-up transition-all backdrop-blur-sm">
                    <div className="flex items-center justify-between text-[9px] font-mono text-accent/70 uppercase tracking-widest">
                        <span>Constellation Trace</span>
                        <div className="flex gap-1">
                            <span className="w-1 h-1 rounded-full bg-success animate-ping" />
                            <span className="animate-pulse">Active</span>
                        </div>
                    </div>
                    <div className="h-4 overflow-hidden relative">
                        <div className="flex flex-col gap-1 constellation-traces" style={{ transform: `translateY(-${traceIndex * 16}px)` }}>
                            {TRACES.map((trace, i) => (
                                <span key={i} className={`text-[10px] font-mono whitespace-nowrap transition-opacity duration-300 ${i === traceIndex ? 'opacity-100 text-text-primary' : 'opacity-20 text-text-muted'}`}>
                                    &gt; {trace}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-[9px] text-text-muted font-black uppercase tracking-widest opacity-50">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                    Distributed mesh active • 100% sync
                </div>
            </div>
        </div>
    );
});
