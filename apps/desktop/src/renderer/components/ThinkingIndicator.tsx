import { memo } from 'react';

export const ThinkingIndicator = memo(function ThinkingIndicator() {
    return (
        <div className="flex gap-4 animate-fade-in">
            <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center text-white flex-shrink-0 animate-pulse-slow shadow-lg shadow-accent/20 holographic-glow">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm1,15H11V11h2Zm0-8H11V7h2Z" />
                </svg>
            </div>

            <div className="flex flex-col gap-2 py-1 flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent animate-pulse">
                        SCA-01 is processing
                    </span>
                    <div className="flex gap-1">
                        <div className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>

                <div className="relative h-1 w-48 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div className="absolute inset-0 bg-gradient-to-r from-accent/20 via-accent to-accent/20 animate-loading-slide shadow-[0_0_10px_rgba(226,0,116,0.5)]" />
                </div>

                <div className="flex items-center gap-2 text-[10px] text-text-muted font-mono">
                    <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse" />
                    Neural connections active • High confidence
                </div>
            </div>
        </div>
    );
});
