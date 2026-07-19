import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, default 4000
}

interface ToastStore {
  toasts: Toast[];
  add: (toast: Omit<Toast, 'id'>) => void;
  remove: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  add: (toast) => {
    const id = Math.random().toString(36).slice(2, 9);
    const duration = toast.duration ?? 4000;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    if (duration > 0) {
      setTimeout(() => get().remove(id), duration);
    }
  },

  remove: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  success: (title, message) => get().add({ type: 'success', title, message }),
  error:   (title, message) => get().add({ type: 'error',   title, message, duration: 6000 }),
  warning: (title, message) => get().add({ type: 'warning', title, message }),
  info:    (title, message) => get().add({ type: 'info',    title, message }),
}));
