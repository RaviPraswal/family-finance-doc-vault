import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { X, UploadCloud, Loader2 } from 'lucide-react';

interface UploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadModal({ onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('TAX');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const token = useAuthStore((state) => state.token);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10MB limit.');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    if (description) formData.append('description', description);
    if (tags) formData.append('tags', tags);

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData, // Do not set Content-Type, let browser handle boundaries
      });

      if (!response.ok) {
        let errorMsg = 'Upload failed';
        try {
          const text = await response.text();
          if (text) {
            try {
              const json = JSON.parse(text);
              if (json.message) errorMsg = json.message;
              else if (json.error) errorMsg = json.error;
              else errorMsg = text;
            } catch (e) {
              errorMsg = text;
            }
          }
        } catch (e) {}
        throw new Error(errorMsg);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-6 relative">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-foreground">
          <UploadCloud className="h-6 w-6 text-primary" />
          Upload Document
        </h2>

        {error && <p className="text-destructive text-sm mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">Document File</label>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors bg-muted/30">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                <UploadCloud className="h-10 w-10 text-muted-foreground mb-3" />
                <span className="text-sm font-medium text-primary hover:underline">
                  {file ? file.name : 'Click to select a file'}
                </span>
                <span className="text-xs text-muted-foreground mt-1">PDF, Images, up to 10MB</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            >
              <option value="TAX">Tax Returns & W2s</option>
              <option value="INSURANCE">Insurance Policies</option>
              <option value="PROPERTY">Property & Vehicles</option>
              <option value="ESTATE">Estate Planning</option>
              <option value="IDENTIFICATION">IDs & Passports</option>
              <option value="INVESTMENT">Investments</option>
              <option value="MEDICAL">Medical Records</option>
              <option value="LEGAL">Legal Documents</option>
              <option value="RECEIPTS">Receipts</option>
              <option value="BILLS">Bills</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the document"
              className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">Tags (Optional)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. 2024, personal, urgent (comma separated)"
              className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md font-medium text-foreground hover:bg-muted transition-colors"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
