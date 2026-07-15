import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { X, UploadCloud, Loader2, Sparkles, CheckCircle, HelpCircle } from 'lucide-react';

interface UploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'UPLOAD' | 'ANALYZING' | 'ASK_PHYSICAL' | 'CHOOSE_LOCATION';

const SHELVES: Record<string, Array<{ code: string, name: string, folders: string[] }>> = {
  'Shelf 1': [
    { code: 'Holder A', name: 'Identity Documents', folders: ['Aadhaar', 'PAN', 'Passport', 'Driving Licence', 'Voter ID', 'Birth Certificate', 'Marriage Certificate'] },
    { code: 'Holder B', name: 'Banking Documents', folders: ['SBI', 'HDFC', 'ICICI', 'Axis', 'Passbooks', 'Cheque Books', 'Debit Cards', 'FD', 'RD'] },
    { code: 'Holder C', name: 'Vehicle Documents', folders: ['Car', 'Bike', 'RC', 'Insurance', 'PUC', 'FASTag', 'Service Records'] },
    { code: 'Holder D', name: 'Medical & Insurance', folders: ['Health Insurance', 'Medical Reports', 'Prescriptions', 'Blood Reports', 'Vaccination Records'] }
  ],
  'Shelf 2': [
    { code: 'Ravi', name: 'Ravi', folders: ['Identity', 'Education', 'Employment', 'Banking', 'Medical', 'Insurance', 'Investments', 'Tax', 'Legal'] },
    { code: 'Father', name: 'Father', folders: ['Identity', 'Education', 'Employment', 'Banking', 'Medical', 'Insurance', 'Investments', 'Tax', 'Legal'] },
    { code: 'Mother', name: 'Mother', folders: ['Identity', 'Education', 'Employment', 'Banking', 'Medical', 'Insurance', 'Investments', 'Tax', 'Legal'] },
    { code: 'Sister', name: 'Sister', folders: ['Identity', 'Education', 'Employment', 'Banking', 'Medical', 'Insurance', 'Investments', 'Tax', 'Legal'] },
    { code: 'Brother', name: 'Brother', folders: ['Identity', 'Education', 'Employment', 'Banking', 'Medical', 'Insurance', 'Investments', 'Tax', 'Legal'] },
    { code: 'Family Shared', name: 'Family Shared', folders: ['Identity', 'Education', 'Employment', 'Banking', 'Medical', 'Insurance', 'Investments', 'Tax', 'Legal'] }
  ],
  'Shelf 3': [
    { code: 'Property', name: 'Property', folders: ['Sale Deed', 'Registry', 'Mutation', 'Property Tax', 'Builder Documents'] },
    { code: 'Investments', name: 'Investments', folders: ['Mutual Funds', 'Stocks', 'PF', 'NPS', 'PPF', 'FD', 'RD', 'Bonds'] },
    { code: 'Gold', name: 'Gold', folders: ['Bills', 'Valuations', 'Storage Logs'] },
    { code: 'Loans', name: 'Loans', folders: ['Home Loan', 'Personal Loan', 'Vehicle Loan', 'Payment Schedule', 'Statements'] },
    { code: 'Tax', name: 'Tax', folders: ['Tax Returns', 'Deductions', 'Receipts'] },
    { code: 'Archive', name: 'Archive', folders: ['Old Policies', 'Closed Accounts', 'Expired Documents', 'Warranty Papers', 'Old Medical Records'] }
  ]
};

export default function UploadModal({ onClose, onSuccess }: UploadModalProps) {
  const [step, setStep] = useState<Step>('UPLOAD');
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('TAX');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const token = useAuthStore((state) => state.token);

  // AI & Physical Location States
  const [uploadedDoc, setUploadedDoc] = useState<any>(null);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  
  const [selectedShelf, setSelectedShelf] = useState('Shelf 1');
  const [selectedHolder, setSelectedHolder] = useState('Holder A');
  const [selectedFolder, setSelectedFolder] = useState('');

  // Update default folder list when holder selection changes
  useEffect(() => {
    const shelfHolders = SHELVES[selectedShelf] || [];
    const holder = shelfHolders.find(h => h.code === selectedHolder);
    if (holder && holder.folders.length > 0) {
      setSelectedFolder(holder.folders[0]);
    } else {
      setSelectedFolder('');
    }
  }, [selectedShelf, selectedHolder]);

  const startPolling = (doc: any) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/documents/${doc.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const updatedDoc = await res.json();
          if (updatedDoc.extractedData && Object.keys(updatedDoc.extractedData).length > 0) {
            clearInterval(interval);
            setUploadedDoc(updatedDoc);
            if (updatedDoc.extractedData.physicalSuggestion) {
              setAiSuggestion(updatedDoc.extractedData.physicalSuggestion);
              // Auto-fill form from suggestion
              const sugg = updatedDoc.extractedData.physicalSuggestion;
              if (sugg.shelf && SHELVES[sugg.shelf]) {
                setSelectedShelf(sugg.shelf);
                const holderExists = SHELVES[sugg.shelf].some(h => h.code === sugg.holder);
                if (holderExists) {
                  setSelectedHolder(sugg.holder);
                  const hObj = SHELVES[sugg.shelf].find(h => h.code === sugg.holder);
                  if (hObj && hObj.folders.includes(sugg.folder)) {
                    setSelectedFolder(sugg.folder);
                  }
                }
              }
            }
            setStep('ASK_PHYSICAL');
            return;
          }
        }
      } catch (err) {
        console.error('Error polling AI status', err);
      }
      if (attempts >= 8) {
        clearInterval(interval);
        setUploadedDoc(doc);
        setStep('ASK_PHYSICAL');
      }
    }, 1500);
  };

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
        body: formData,
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

      const doc = await response.json();
      setUploadedDoc(doc);
      setStep('ANALYZING');
      startPolling(doc);

    } catch (err: any) {
      setError(err.message || 'An error occurred during upload');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!uploadedDoc) return;
    try {
      setUploading(true);
      const res = await fetch(`/api/physical-documents/${uploadedDoc.id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          shelf: selectedShelf,
          holder: selectedHolder,
          folder: selectedFolder,
          originalPresent: true
        })
      });
      if (!res.ok) {
        throw new Error('Failed to save location details');
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving physical location');
      setUploading(false);
    }
  };

  const applyAiSuggestion = () => {
    if (!aiSuggestion) return;
    if (aiSuggestion.shelf && SHELVES[aiSuggestion.shelf]) {
      setSelectedShelf(aiSuggestion.shelf);
      const holderObj = SHELVES[aiSuggestion.shelf].find(h => h.code === aiSuggestion.holder);
      if (holderObj) {
        setSelectedHolder(aiSuggestion.holder);
        if (holderObj.folders.includes(aiSuggestion.folder)) {
          setSelectedFolder(aiSuggestion.folder);
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-6 relative overflow-hidden">
        
        {step !== 'ANALYZING' && (
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {step === 'UPLOAD' && (
          <>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-foreground">
              <UploadCloud className="h-6 w-6 text-primary" />
              Upload Document
            </h2>

            {error && <p className="text-destructive text-sm mb-4">{error}</p>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">Document File</label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors bg-muted/20">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                    <UploadCloud className="h-10 w-10 text-muted-foreground mb-3" />
                    <span className="text-sm font-semibold text-primary hover:underline">
                      {file ? file.name : 'Click to select a file'}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">PDF, Images, up to 10MB</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 rounded-lg bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
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
                <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the document"
                  className="w-full p-3 rounded-lg bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">Tags (Optional)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. 2024, personal (comma separated)"
                  className="w-full p-3 rounded-lg bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg font-semibold text-foreground hover:bg-muted transition-colors text-sm"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/95 transition-all disabled:opacity-50 text-sm shadow-md"
                >
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </>
        )}

        {step === 'ANALYZING' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Sparkles className="h-12 w-12 text-primary animate-pulse" />
            <h3 className="font-bold text-lg text-foreground">AI Extractor Running</h3>
            <p className="text-xs text-muted-foreground text-center max-w-xs leading-relaxed">
              We are analyzing your uploaded document with AI to detect type, owner, expiry date and recommend physical cupboard placement...
            </p>
            <Loader2 className="h-6 w-6 text-primary animate-spin mt-4" />
          </div>
        )}

        {step === 'ASK_PHYSICAL' && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <HelpCircle className="h-14 w-14 text-primary mb-4" />
            <h3 className="font-bold text-lg text-foreground">Physical Copy Check</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-2 leading-relaxed">
              Do you have the original, physical paper copy of <strong>{uploadedDoc?.name}</strong> at home?
            </p>

            {aiSuggestion && (
              <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-xl max-w-xs text-left text-xs">
                <span className="font-bold text-primary block mb-1">💡 AI Suggestion:</span>
                Store in: <span className="font-semibold text-foreground">{aiSuggestion.shelf} &rarr; {aiSuggestion.holder} &rarr; {aiSuggestion.folder}</span>
              </div>
            )}

            <div className="flex gap-4 w-full max-w-xs mt-8">
              <button 
                onClick={onSuccess} 
                className="flex-1 py-3 bg-muted text-foreground font-semibold rounded-xl hover:bg-muted/80 text-sm transition-colors border border-border"
              >
                No, Digital Only
              </button>
              <button 
                onClick={() => setStep('CHOOSE_LOCATION')} 
                className="flex-1 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/95 text-sm transition-all shadow-md"
              >
                Yes, Store it
              </button>
            </div>
          </div>
        )}

        {step === 'CHOOSE_LOCATION' && (
          <>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-foreground">
              📍 Select Almirah Shelf & Section
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Click shelves and sections to place the original physical copy.</p>
            
            {error && <p className="text-destructive text-xs mb-3">{error}</p>}

            <div className="space-y-4">
              {/* Shelf Select */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Select Shelf</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.keys(SHELVES).map(shelf => (
                    <button
                      key={shelf}
                      type="button"
                      onClick={() => {
                        setSelectedShelf(shelf);
                        const firstHolder = SHELVES[shelf][0];
                        setSelectedHolder(firstHolder.code);
                      }}
                      className={`py-2 px-3 border text-xs font-semibold rounded-lg transition-all ${selectedShelf === shelf ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}
                    >
                      {shelf}
                    </button>
                  ))}
                </div>
              </div>

              {/* Holder Select */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Select Holder</label>
                <select
                  value={selectedHolder}
                  onChange={(e) => setSelectedHolder(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-muted text-foreground border border-input outline-none text-xs"
                >
                  {(SHELVES[selectedShelf] || []).map(h => (
                    <option key={h.code} value={h.code}>{h.name}</option>
                  ))}
                </select>
              </div>

              {/* Folder Select */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Select Folder / Category</label>
                <select
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-muted text-foreground border border-input outline-none text-xs"
                >
                  {((SHELVES[selectedShelf] || []).find(h => h.code === selectedHolder)?.folders || []).map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              {/* AI suggestion indicator if available */}
              {aiSuggestion && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-[11px] flex justify-between items-center mt-2">
                  <div>
                    <span className="font-bold text-primary block mb-0.5">💡 AI Recommendation</span>
                    <span className="text-muted-foreground">{aiSuggestion.shelf} &rarr; {aiSuggestion.holder} &rarr; {aiSuggestion.folder}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={applyAiSuggestion} 
                    className="bg-primary/10 text-primary hover:bg-primary/20 px-2 py-1 rounded font-bold"
                  >
                    Apply Suggestion
                  </button>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={onSuccess}
                  className="px-4 py-2 rounded-lg font-semibold text-foreground hover:bg-muted text-xs transition-colors"
                >
                  Skip physical mapping
                </button>
                <button
                  type="button"
                  onClick={handleSaveLocation}
                  disabled={uploading || !selectedFolder}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/95 text-xs transition-all shadow-md disabled:opacity-50"
                >
                  {uploading && <Loader2 className="h-4.5 w-4.5 animate-spin" />}
                  Confirm & Save Location
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
