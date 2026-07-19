import { create } from 'zustand';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ConfirmStore {
  options: ConfirmOptions | null;
  show: (opts: ConfirmOptions) => void;
  close: () => void;
}

export const useConfirmStore = create<ConfirmStore>((set) => ({
  options: null,
  show: (opts) => set({ options: opts }),
  close: () => set({ options: null }),
}));
