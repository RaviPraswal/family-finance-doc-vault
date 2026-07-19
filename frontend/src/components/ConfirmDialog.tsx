import { useConfirmStore } from '../store/confirmStore';

export function ConfirmDialog() {
  const { options, close } = useConfirmStore();

  if (!options) return null;

  const handleConfirm = () => {
    close();
    options.onConfirm();
  };

  const handleCancel = () => {
    close();
    options.onCancel?.();
  };

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={handleCancel}
    >
      <div
        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${options.danger !== false ? 'bg-red-500/15' : 'bg-primary/15'}`}>
          {options.danger !== false ? (
            <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
            </svg>
          )}
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold text-foreground text-center mb-2">{options.title}</h2>

        {/* Message */}
        <p className="text-sm text-muted-foreground text-center mb-6 leading-relaxed">{options.message}</p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors"
          >
            {options.cancelLabel ?? 'Cancel'}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors ${
              options.danger !== false
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {options.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
