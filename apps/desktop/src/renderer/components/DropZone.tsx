import React, { memo } from 'react';
import { IconPlug } from './icons';

interface DropZoneProps {
    isDragging: boolean;
}

export const DropZone = memo(function DropZone({ isDragging }: DropZoneProps) {
    if (!isDragging) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none animate-fade-in">
            <div className="absolute inset-0 bg-accent/10 backdrop-blur-md" />
            <div className="relative w-[80%] h-[80%] border-4 border-dashed border-accent rounded-[3rem] flex flex-col items-center justify-center gap-6 animate-pulse-ring">
                <div className="w-24 h-24 rounded-full bg-accent flex items-center justify-center text-white shadow-[0_0_50px_rgba(226,0,116,0.5)]">
                    <IconPlug className="w-12 h-12" />
                </div>
                <div className="text-center">
                    <h2 className="text-3xl font-black uppercase tracking-widest text-text-primary mb-2">Drop Intelligence</h2>
                    <p className="text-sm text-text-muted font-bold uppercase tracking-widest">SCA-01 er klar til at analysere din fil</p>
                </div>
            </div>
        </div>
    );
});
