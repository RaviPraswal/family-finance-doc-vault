import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';
import { useNavigate } from 'react-router-dom';
import UploadModal from '../components/UploadModal';
import { LogOut, Upload, FileText, Trash2, Download, Bell, AlertTriangle } from 'lucide-react';

interface Document {
  id: string;
  name: string;
  category: string;
  size: number;
  createdAt: string;
  expiryDate?: string;
  extractedData?: Record<string, any>;
}

interface Notification {
  id: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export default function Dashboard() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const fetchDocuments = async () => {
    try {
      const data = await apiClient('/api/documents');
      setDocuments(data);
    } catch (err) {
      console.error('Failed to fetch documents', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const data = await apiClient('/api/notifications/unread');
      setNotifications(data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchNotifications();
    // Poll for AI extraction updates every 10 seconds
    const interval = setInterval(() => {
      fetchDocuments();
      fetchNotifications();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDownload = async (id: string, name: string) => {
    try {
      const response = await apiClient(`/api/documents/${id}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download document', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await apiClient(`/api/documents/${id}`, { method: 'DELETE' });
      fetchDocuments();
    } catch (err) {
      console.error('Failed to delete document', err);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await apiClient(`/api/notifications/${id}/read`, { method: 'PUT' });
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const getExpiryStyles = (expiryDate?: string) => {
    if (!expiryDate) return '';
    const daysUntil = Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    if (daysUntil <= 7) return 'bg-red-500/10 border-l-4 border-red-500';
    if (daysUntil <= 30) return 'bg-orange-500/10 border-l-4 border-orange-500';
    return '';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">FinNest Dashboard</h1>
          <div className="flex items-center gap-6">
            <div className="relative cursor-pointer" onClick={() => setShowNotifications(!showNotifications)}>
              <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
              
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="p-4 border-b border-border bg-muted/30">
                    <h3 className="font-semibold text-foreground">Notifications</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-sm text-muted-foreground text-center">No new notifications</div>
                    ) : (
                      <div className="divide-y divide-border">
                        {notifications.map(n => (
                          <div key={n.id} className="p-4 hover:bg-muted/50 transition-colors group">
                            <p className="text-sm text-foreground leading-relaxed">{n.message}</p>
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleDateString()}</span>
                              <button onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }} className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">Mark as read</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-semibold text-foreground">Your Vault</h2>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-all shadow-md hover:shadow-lg"
          >
            <Upload className="h-4 w-4" />
            Upload Document
          </button>
        </div>

        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          {documents.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No documents found. Upload your first document to get started.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {documents.map((doc) => (
                <li key={doc.id} className={`p-4 hover:bg-muted/50 transition-colors flex items-center justify-between group ${getExpiryStyles(doc.expiryDate)}`}>
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-md text-primary">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{doc.name}</p>
                        {doc.expiryDate && (
                          <span className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-md text-muted-foreground">
                            <AlertTriangle className="h-3 w-3" /> Expires: {new Date(doc.expiryDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="bg-secondary px-2 py-0.5 rounded-full">{doc.category}</span>
                        <span>{(doc.size / 1024 / 1024).toFixed(2)} MB</span>
                        <span>Uploaded: {new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleDownload(doc.id, doc.name)}
                      className="p-2 text-muted-foreground hover:text-primary transition-colors"
                      title="Download"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {isUploadOpen && (
        <UploadModal 
          onClose={() => setIsUploadOpen(false)} 
          onSuccess={() => {
            setIsUploadOpen(false);
            fetchDocuments();
          }} 
        />
      )}
    </div>
  );
}
