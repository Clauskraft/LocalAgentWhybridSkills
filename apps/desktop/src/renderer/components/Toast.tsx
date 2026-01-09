import { useState, useEffect, useCallback, createContext, useContext } from 'react';

interface Toast {
    id: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
}

interface ToastContextType {
    showToast: (message: string, type: Toast['type']) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
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
              px-5 py-3 rounded-xl shadow-2xl border backdrop-blur-xl animate-slide-left pointer-events-auto
              flex items-center gap-3 min-w-[300px]
              ${toast.type === 'success' ? 'bg-success/20 border-success/30 text-success' :
                                toast.type === 'error' ? 'bg-error/20 border-error/30 text-error' :
                                    toast.type === 'warning' ? 'bg-warning/20 border-warning/30 text-warning' :
                                        'bg-accent/20 border-accent/30 text-accent'}
            `}
                    >
                        <div className="text-lg">
                            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : 'ℹ️'}
                        </div>
                        <div className="text-sm font-medium">{toast.message}</div>
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
