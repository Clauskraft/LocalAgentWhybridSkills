import { useState, useEffect, useCallback, createContext, useContext } from 'react';

interface Toast {
    id: string;
    message: React.ReactNode;
    type: 'info' | 'success' | 'warning' | 'error';
}

interface ToastContextType {
    showToast: (message: React.ReactNode, type?: Toast['type']) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: React.ReactNode, type: Toast['type'] = 'info') => {
        const id = crypto.randomUUID();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`
              px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-white/5 backdrop-blur-3xl animate-slide-left pointer-events-auto
              flex items-center gap-4 min-w-[320px] max-w-[450px]
              ${toast.type === 'success' ? 'bg-success/10 text-success' :
                                toast.type === 'error' ? 'bg-error/10 text-error' :
                                    toast.type === 'warning' ? 'bg-warning/10 text-warning' :
                                        'bg-accent/10 text-accent'}
            `}
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${toast.type === 'success' ? 'bg-success/20' :
                            toast.type === 'error' ? 'bg-error/20' :
                                toast.type === 'warning' ? 'bg-warning/20' :
                                    'bg-accent/20'
                            }`}>
                            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : 'ℹ️'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold uppercase tracking-widest opacity-50 mb-0.5">
                                {toast.type === 'info' ? 'System' : toast.type}
                            </div>
                            <div className="text-sm font-medium text-text-primary leading-tight">{toast.message}</div>
                        </div>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
}
