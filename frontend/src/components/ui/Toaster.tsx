import React, { createContext, useContext, useState, useCallback } from 'react';

interface Toast { id: number; message: string; type: 'success' | 'error' | 'info'; }
interface ToastContextValue { toast: (message: string, type?: Toast['type']) => void; }

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function Toaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span className="toast-icon">{icons[t.type]}</span>
            <span className="toast-text">{t.message}</span>
            <button className="toast-close" onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within Toaster');
  return ctx.toast;
}
