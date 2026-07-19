import React, { useEffect, useState } from 'react';
import { useToastStore } from '../store/toastStore';
import type { Toast, ToastType } from '../store/toastStore';

// Icons per toast type
const icons: Record<ToastType, React.ReactElement> = {
  success: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  ),
};

const styles: Record<ToastType, { wrapper: string; icon: string; bar: string }> = {
  success: {
    wrapper: 'bg-[#0f2318] border border-green-500/30 shadow-lg shadow-green-900/20',
    icon: 'text-green-400',
    bar: 'bg-green-500',
  },
  error: {
    wrapper: 'bg-[#1f0f0f] border border-red-500/30 shadow-lg shadow-red-900/20',
    icon: 'text-red-400',
    bar: 'bg-red-500',
  },
  warning: {
    wrapper: 'bg-[#1f1a0a] border border-amber-500/30 shadow-lg shadow-amber-900/20',
    icon: 'text-amber-400',
    bar: 'bg-amber-500',
  },
  info: {
    wrapper: 'bg-[#0a1525] border border-blue-500/30 shadow-lg shadow-blue-900/20',
    icon: 'text-blue-400',
    bar: 'bg-blue-500',
  },
};

function ToastItem({ toast }: { toast: Toast }) {
  const remove = useToastStore((s) => s.remove);
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const duration = toast.duration ?? 4000;

  // Animate in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Animate out before remove
  const dismiss = () => {
    setLeaving(true);
    setTimeout(() => remove(toast.id), 300);
  };

  useEffect(() => {
    if (duration <= 0) return;
    const t = setTimeout(() => dismiss(), duration - 350); // leave time before auto-remove
    return () => clearTimeout(t);
  }, []);

  const s = styles[toast.type];

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl w-80 max-w-[calc(100vw-2rem)] backdrop-blur-sm
        transition-all duration-300 ease-out
        ${s.wrapper}
        ${visible && !leaving ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}
      `}
    >
      {/* Content */}
      <div className="flex items-start gap-3 px-4 py-3.5">
        {/* Icon */}
        <span className={`mt-0.5 shrink-0 ${s.icon}`}>{icons[toast.type]}</span>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-snug">{toast.title}</p>
          {toast.message && (
            <p className="text-xs text-white/60 mt-0.5 leading-relaxed">{toast.message}</p>
          )}
        </div>

        {/* Close */}
        <button
          onClick={dismiss}
          className="shrink-0 text-white/30 hover:text-white/70 transition-colors mt-0.5"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      {duration > 0 && (
        <div className="h-[2px] w-full">
          <div
            className={`h-full ${s.bar} origin-left`}
            style={{
              animation: `toast-shrink ${duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <>
      {/* Inject the keyframe animation once */}
      <style>{`
        @keyframes toast-shrink {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>

      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 items-end pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} />
          </div>
        ))}
      </div>
    </>
  );
}
