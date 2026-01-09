import { memo } from 'react';

export const ThinkingIndicator = memo(function ThinkingIndicator() {
    return (
        <div className="flex gap-4 animate-fade-in">
            <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center text-white flex-shrink-0 animate-pulse-slow shadow-lg shadow-accent/20">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm1,15H11V11h2Zm0-8H11V7h2Z" />
                </svg>
            </div>

            <div className="flex flex-col gap-2 py-1">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-accent animate-glow-pulse">
                        SCA-01 is processing
                    </span>
                    <div className="flex gap-1">
                        <span className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                        <span className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                    </div>
                </div>

                <div className="flex gap-1.5 overflow-hidden">
                    <div className="h-0.5 bg-accent/20 rounded-full w-24 relative overflow-hidden">
                        <div className="absolute inset-0 bg-accent animate-loading-slide" />
                    </div>
                    <span className="text-[10px] text-text-muted font-mono animate-pulse-slow">
                        Analyzing context...
                    </span>
                </div>
            </div>
        </div>
    );
});
