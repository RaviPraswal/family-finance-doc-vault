import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { X, Download, Loader2, Eye, Share2, Trash2 } from 'lucide-react';
import { apiClient } from '../api/client';
import ShareModal from './ShareModal';
import { useToastStore } from '../store/toastStore';
import { useConfirmStore } from '../store/confirmStore';

interface Version {
  id: string;
  versionNumber: number;
  createdAt: string;
  size: number;
}

interface PreviewModalProps {
  documentId: string;
  documentName: string;
  documentType: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function PreviewModal({ documentId, documentName, documentType, onClose, onUpdate }: PreviewModalProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [activeTab, setActiveTab] = useState<'preview' | 'history'>('preview');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const token = useAuthStore((state) => state.token);

  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewingVersion, setPreviewingVersion] = useState<Version | null>(null);
  const [shareVersion, setShareVersion] = useState<Version | null>(null);

  useEffect(() => {
    fetchVersions();
  }, [documentId]);

  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        window.URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [previewBlobUrl]);

  const fetchVersions = async () => {
    try {
      const data = await apiClient(`/api/documents/${documentId}/versions`);
      setVersions(data);
      if (data.length > 0 && !previewingVersion) {
        // Default to the latest version
        const latest = data[0];
        setPreviewingVersion(latest);
        loadPreview(latest.id);
      }
    } catch (err) {
      console.error('Failed to fetch versions', err);
    }
  };

  const loadPreview = async (versionId: string) => {
    setLoadingPreview(true);
    if (previewBlobUrl) {
      window.URL.revokeObjectURL(previewBlobUrl);
    }
    
    try {
      const response = await fetch(`/api/documents/${documentId}/versions/${versionId}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to load preview');
      let blob = await response.blob();
      if (documentType === 'application/pdf') {
        blob = new Blob([blob], { type: 'application/pdf' });
      } else if (documentType.startsWith('image/')) {
        blob = new Blob([blob], { type: documentType });
      }
      const url = window.URL.createObjectURL(blob);
      setPreviewBlobUrl(url);
    } catch (err) {
      console.error(err);
      setPreviewBlobUrl(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handlePreviewVersion = (version: Version) => {
    setPreviewingVersion(version);
    loadPreview(version.id);
    setActiveTab('preview');
  };

  const handleUploadNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds the 10MB limit.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`/api/documents/${documentId}/versions`, {
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
      
      setFile(null);
      fetchVersions();
      onUpdate();
      setActiveTab('preview');
      
      // We need to re-fetch versions so the new latest is loaded, fetchVersions() handles that 
      // but we need to reset previewingVersion so it picks up the new latest
      setPreviewingVersion(null);
    } catch (err: any) {
      alert(err.message || 'An error occurred during upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadVersion = async (versionId: string, name: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/versions/${versionId}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download version', err);
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    // Use stores via getState() since this is called from an event handler
    useConfirmStore.getState().show({
      title: 'Delete Version',
      message: 'Are you sure you want to delete this version? This action cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          await fetch(`/api/documents/${documentId}/versions/${versionId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          useToastStore.getState().success('Version deleted', 'The document version has been removed.');
          fetchVersions();
          onUpdate();
        } catch (err: any) {
          useToastStore.getState().error('Cannot delete version', err.message || 'Failed to delete version.');
        }
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl h-[90vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col relative overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3 pr-4 truncate">
            <h2 className="text-xl font-semibold text-foreground truncate">{documentName}</h2>
            {previewingVersion && (
              <span className="bg-primary/20 text-primary text-xs font-medium px-2 py-1 rounded-full shrink-0">
                v{previewingVersion.versionNumber}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex border-b border-border">
          <button 
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'preview' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}
            onClick={() => setActiveTab('preview')}
          >
            Live Preview
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'history' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}
            onClick={() => setActiveTab('history')}
          >
            Version History
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-muted/10 p-6 relative">
          {activeTab === 'preview' ? (
            <div className="h-full flex items-center justify-center bg-white rounded-lg border border-border shadow-inner overflow-hidden relative">
              {loadingPreview ? (
                <div className="flex flex-col items-center text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                  <p>Loading secure preview...</p>
                </div>
              ) : previewBlobUrl ? (
                documentType.startsWith('image/') ? (
                  <img 
                    src={previewBlobUrl} 
                    alt={documentName} 
                    className="max-w-full max-h-full object-contain"
                  />
                ) : documentType === 'application/pdf' ? (
                  <iframe 
                    src={previewBlobUrl} 
                    className="w-full h-full border-0"
                    title={documentName}
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <p>Preview not available for this file type.</p>
                    <a href={previewBlobUrl} download className="text-primary hover:underline mt-2 inline-block">Download instead</a>
                  </div>
                )
              ) : (
                <div className="text-center text-destructive">
                  <p>Failed to load preview.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-8">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-4">Upload New Version</h3>
                <form onSubmit={handleUploadNewVersion} className="bg-card p-6 rounded-lg border border-border flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-2 text-foreground">Select File</label>
                    <input
                      type="file"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="w-full p-2 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={uploading || !file}
                    className="flex items-center gap-2 px-6 py-2 h-[42px] bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Upload
                  </button>
                </form>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-4">History</h3>
                <div className="bg-card rounded-lg border border-border divide-y divide-border overflow-hidden">
                  {versions.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">No versions found</div>
                  ) : (
                    versions.map((v) => (
                      <div key={v.id} className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-muted/30 transition-colors gap-4 ${previewingVersion?.id === v.id ? 'bg-primary/5' : ''}`}>
                        <div>
                          <p 
                            className="font-medium text-foreground cursor-pointer hover:text-primary transition-colors flex items-center gap-2"
                            onClick={() => handlePreviewVersion(v)}
                          >
                            Version {v.versionNumber}
                            {previewingVersion?.id === v.id && (
                              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Viewing</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(v.createdAt).toLocaleString()} • {(v.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button 
                            onClick={() => handlePreviewVersion(v)}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors flex items-center gap-2 text-sm font-medium"
                          >
                            <Eye className="h-4 w-4" /> Preview
                          </button>
                          <button 
                            onClick={() => handleDownloadVersion(v.id, documentName)}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors flex items-center gap-2 text-sm font-medium"
                            title="Download"
                          >
                            <Download className="h-4 w-4" /> 
                          </button>
                          <button 
                            onClick={() => setShareVersion(v)}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors flex items-center gap-2 text-sm font-medium"
                            title="Share via Email"
                          >
                            <Share2 className="h-4 w-4" /> 
                          </button>
                          <button 
                            onClick={() => handleDeleteVersion(v.id)}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors flex items-center gap-2 text-sm font-medium"
                            title="Delete Version"
                          >
                            <Trash2 className="h-4 w-4" /> 
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {shareVersion && (
        <ShareModal 
          documentId={documentId}
          documentName={documentName}
          versionId={shareVersion.id}
          versionNumber={shareVersion.versionNumber}
          onClose={() => setShareVersion(null)}
          onSuccess={() => {
            setShareVersion(null);
            alert('Document version shared successfully!');
          }}
        />
      )}
    </div>
  );
}
