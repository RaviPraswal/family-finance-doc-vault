import { useState } from 'react';

import { X, Send, Loader2 } from 'lucide-react';
import { apiClient } from '../api/client';

interface ShareModalProps {
  documentId: string;
  documentName: string;
  versionId?: string;
  versionNumber?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ShareModal({ documentId, documentName, versionId, versionNumber, onClose, onSuccess }: ShareModalProps) {
  const [email, setEmail] = useState('');
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setSharing(true);
    setError('');

    try {
      const url = versionId 
        ? `/api/documents/${documentId}/versions/${versionId}/share` 
        : `/api/documents/${documentId}/share`;
        
      await apiClient(url, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred while sharing the document');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-6 relative animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        
        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2 text-foreground">
          <Send className="h-6 w-6 text-primary" />
          Share Document
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Securely share <span className="font-semibold text-foreground">{documentName} {versionNumber ? `(v${versionNumber})` : ''}</span> via email attachment.
        </p>

        {error && <p className="text-destructive text-sm mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">Recipient Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. spouse@example.com"
              className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              required
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md font-medium text-foreground hover:bg-muted transition-colors"
              disabled={sharing}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sharing || !email}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sharing && <Loader2 className="h-4 w-4 animate-spin" />}
              {sharing ? 'Sending...' : 'Send securely'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
