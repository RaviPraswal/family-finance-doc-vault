import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';
import { useNavigate } from 'react-router-dom';
import UploadModal from '../components/UploadModal';
import ShareModal from '../components/ShareModal';
import PreviewModal from '../components/PreviewModal';
import { LogOut, Upload, FileText, Trash2, Download, Bell, AlertTriangle, Share2, Search, Eye, ArrowRight, ShieldAlert } from 'lucide-react';
import { useToastStore } from '../store/toastStore';
import { useConfirmStore } from '../store/confirmStore';

interface Document {
  id: string;
  name: string;
  type: string;
  category: string;
  description?: string;
  tags?: string[];
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

interface AlertItem {
  type: 'EXPIRY' | 'OVERDUE' | 'LOW_BALANCE';
  urgency: number; // 0 = expired/critical, 1 = overdue payment, 2 = expiring soon, 3 = low balance
  title: string;
  message: string;
  actionLabel: string;
  actionPath: string;
}

export default function Dashboard() {
  const toast = useToastStore();
  const confirm = useConfirmStore();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [shareDocument, setShareDocument] = useState<{id: string, name: string} | null>(null);
  const [previewDocument, setPreviewDocument] = useState<{id: string, name: string, type: string} | null>(null);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);

  // States for Alert aggregation
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [peerLendings, setPeerLendings] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

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

  const fetchAlertData = async () => {
    try {
      const [banksData, loansData, peersData, expensesData] = await Promise.all([
        apiClient('/api/bankaccounts'),
        apiClient('/api/loans'),
        apiClient('/api/peerlendings'),
        apiClient('/api/expenses')
      ]);
      setBankAccounts(banksData);
      setLoans(loansData);
      setPeerLendings(peersData);
      setExpenses(expensesData);
    } catch (err) {
      console.error('Failed to fetch alert data', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchNotifications();
    fetchAlertData();
    const interval = setInterval(() => {
      fetchDocuments();
      fetchNotifications();
      fetchAlertData();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDownload = async (id: string, name: string) => {
    try {
      const response = await fetch(`/api/documents/${id}/download`, {
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
      console.error('Failed to download document', err);
    }
  };

  const handleDelete = async (id: string) => {
    confirm.show({
      title: 'Delete Document',
      message: 'Are you sure you want to delete this document? This action cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          await apiClient(`/api/documents/${id}`, { method: 'DELETE' });
          toast.success('Document deleted', 'The document has been permanently removed.');
          fetchDocuments();
        } catch (err: any) {
          toast.error('Cannot delete document', err.message || 'Failed to delete document.');
        }
      },
    });
  };

  const markAsRead = async (id: string) => {
    try {
      await apiClient(`/api/notifications/${id}/read`, { method: 'PUT' });
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient(`/api/notifications/read-all`, { method: 'PUT' });
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const getExpiryStyles = (expiryDate?: string) => {
    if (!expiryDate) return '';
    const daysUntil = Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    if (daysUntil <= 7) return 'bg-red-500/10';
    if (daysUntil <= 30) return 'bg-orange-500/10';
    return '';
  };

  const getExpiryIndicator = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const daysUntil = Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    if (daysUntil <= 7) return <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />;
    if (daysUntil <= 30) return <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />;
    return null;
  };

  // Rule 8 Dashboard Cross-Module Alerts Computation
  const getAlertItems = (): AlertItem[] => {
    const alerts: AlertItem[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Expiring/Expired Documents (30 days or less)
    documents.forEach(doc => {
      if (!doc.expiryDate) return;
      const exp = new Date(doc.expiryDate);
      exp.setHours(0, 0, 0, 0);
      const diffTime = exp.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        alerts.push({
          type: 'EXPIRY',
          urgency: 0,
          title: `Expired: ${doc.name}`,
          message: `Document has expired on ${exp.toLocaleDateString()}. Please renew immediately.`,
          actionLabel: 'Manage Vault',
          actionPath: '/vault'
        });
      } else if (diffDays <= 30) {
        alerts.push({
          type: 'EXPIRY',
          urgency: 2,
          title: `Expiring Soon: ${doc.name}`,
          message: `Document will expire in ${diffDays} days (${exp.toLocaleDateString()}).`,
          actionLabel: 'Manage Vault',
          actionPath: '/vault'
        });
      }
    });

    // 2. Overdue Peer Lendings (Udhaar)
    peerLendings.forEach(p => {
      if (p.dueDate && p.amount > 0) {
        const due = new Date(p.dueDate);
        due.setHours(0, 0, 0, 0);
        if (due < today) {
          alerts.push({
            type: 'OVERDUE',
            urgency: 1,
            title: `Overdue Udhaar: ${p.personName}`,
            message: `${p.type === 'TAKEN' ? 'Pay back' : 'Collect'} ₹${p.amount.toLocaleString()} - was due on ${due.toLocaleDateString()}.`,
            actionLabel: 'View Udhaar',
            actionPath: '/peer-lending'
          });
        }
      }
    });

    // 3. Overdue Loan EMIs (Active loans where current month's EMI is unpaid past 5th day)
    loans.forEach(l => {
      const outstanding = l.outstandingAmount ?? 0;
      if (outstanding > 0) {
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        const currentMonthPayments = expenses.filter(e => 
          e.linkedLoan?.id === l.id && 
          new Date(e.expenseDate).getMonth() === currentMonth &&
          new Date(e.expenseDate).getFullYear() === currentYear
        );

        if (currentMonthPayments.length === 0 && today.getDate() > 5) {
          alerts.push({
            type: 'OVERDUE',
            urgency: 1,
            title: `Overdue EMI: ${l.lenderName}`,
            message: `EMI payment of ₹${(l.emiAmount ?? 0).toLocaleString()} is pending past the monthly due date.`,
            actionLabel: 'Manage Loans',
            actionPath: '/loans'
          });
        }
      }
    });

    // 4. Low Bank Balances (Less than ₹5,000 threshold)
    bankAccounts.forEach(b => {
      const balance = b.currentBalance ?? 0;
      if (balance < 5000) {
        alerts.push({
          type: 'LOW_BALANCE',
          urgency: 3,
          title: `Low Balance: ${b.bankName}`,
          message: `Liquid balance is critical: ₹${balance.toLocaleString()} (minimum threshold ₹5,000).`,
          actionLabel: 'Bank Accounts',
          actionPath: '/bank-accounts'
        });
      }
    });

    return alerts.sort((a, b) => a.urgency - b.urgency).slice(0, 5);
  };

  const criticalAlerts = getAlertItems();

  const filteredDocuments = documents.filter(doc => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const matchesName = doc.name.toLowerCase().includes(query);
    const matchesCategory = doc.category.toLowerCase().includes(query);
    const matchesDescription = doc.description?.toLowerCase().includes(query) || false;
    const matchesTags = doc.tags?.some(tag => tag.toLowerCase().includes(query)) || false;
    return matchesName || matchesCategory || matchesDescription || matchesTags;
  });

  return (
    <div className="h-full flex flex-col">
      <header className="flex-none bg-card border-b border-border rounded-t-lg">
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
                  <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
                    <h3 className="font-semibold text-foreground">Notifications</h3>
                    {notifications.length > 0 && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); markAllAsRead(); }} 
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Mark all as read
                      </button>
                    )}
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        
        {/* Rule 8: Dashboard Critical Cross-Module Alert Widget */}
        {criticalAlerts.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-red-500/10 via-orange-500/5 to-transparent border border-red-500/20 p-4 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <ShieldAlert className="h-24 w-24 text-red-500" />
            </div>
            <div className="flex items-center gap-2 text-red-500 font-bold text-xs uppercase tracking-wider mb-3">
              <AlertTriangle className="h-4 w-4 animate-pulse" /> Critical Family Finance Alerts
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {criticalAlerts.map((alert, idx) => (
                <div 
                  key={idx} 
                  className="bg-card/65 backdrop-blur-sm border border-border/80 p-3 rounded-xl hover:border-primary/45 transition-colors cursor-pointer flex flex-col justify-between"
                  onClick={() => navigate(alert.actionPath)}
                >
                  <div>
                    <div className="flex justify-between items-start gap-1">
                      <span className="font-semibold text-xs text-foreground leading-tight">{alert.title}</span>
                      <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                        alert.urgency === 0 ? 'bg-red-500 text-white' :
                        alert.urgency === 1 ? 'bg-red-100 text-red-600 dark:bg-red-500/25 dark:text-red-400' :
                        alert.urgency === 2 ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/25 dark:text-yellow-400' :
                        'bg-blue-100 text-blue-600 dark:bg-blue-500/25 dark:text-blue-400'
                      }`}>
                        {alert.urgency === 0 ? 'Expired' : alert.urgency === 1 ? 'Overdue' : 'Warning'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{alert.message}</p>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-border/30 flex items-center justify-between text-[10px] font-bold text-primary group">
                    <span>{alert.actionLabel}</span>
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">Your Vault</h2>
          
          <div className="flex flex-1 max-w-md w-full items-center bg-card border border-border rounded-md px-3 py-2 shadow-sm focus-within:ring-1 focus-within:ring-primary transition-all">
            <Search className="h-5 w-5 text-muted-foreground mr-2" />
            <input 
              type="text"
              placeholder="Search by name, tag, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-foreground text-sm"
            />
          </div>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-all shadow-md hover:shadow-lg shrink-0"
          >
            <Upload className="h-4 w-4" />
            Upload Document
          </button>
        </div>

        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          {filteredDocuments.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No documents found matching your criteria.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filteredDocuments.map((doc) => (
                <li key={doc.id} className={`relative p-4 hover:bg-muted/50 transition-colors flex items-center justify-between group ${getExpiryStyles(doc.expiryDate)}`}>
                  {getExpiryIndicator(doc.expiryDate)}
                  <div className="flex items-center gap-4 flex-1 pr-4 min-w-0 z-10">
                    <div className="h-16 w-16 bg-muted rounded-md border border-border overflow-hidden shrink-0 flex items-center justify-center relative cursor-pointer" onClick={() => setPreviewDocument({id: doc.id, name: doc.name, type: doc.type})}>
                      {/* Using the image as a background to handle object-cover easily */}
                      <img 
                        src={`/api/documents/${doc.id}/thumbnail`}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement?.classList.add('bg-primary/10');
                          e.currentTarget.parentElement?.querySelector('svg')?.classList.remove('hidden');
                        }}
                      />
                      <FileText className="h-8 w-8 text-primary hidden absolute" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p 
                          className="font-medium text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                          onClick={() => setPreviewDocument({id: doc.id, name: doc.name, type: doc.type})}
                        >
                          {doc.name}
                        </p>
                        {doc.expiryDate && (
                          <span className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-md text-muted-foreground shrink-0">
                            <AlertTriangle className="h-3 w-3" /> Expires: {new Date(doc.expiryDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      
                      {doc.description && (
                        <p className="text-sm text-muted-foreground truncate mb-1">{doc.description}</p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="bg-secondary text-secondary-foreground font-medium px-2 py-0.5 rounded-full">{doc.category}</span>
                        <span>{(doc.size / 1024 / 1024).toFixed(2)} MB</span>
                        <span>Uploaded: {new Date(doc.createdAt).toLocaleDateString()}</span>
                        
                        {doc.tags && doc.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            {doc.tags.map((tag, i) => (
                              <span key={i} className="bg-muted px-2 py-0.5 rounded-sm border border-border">#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button 
                      onClick={() => setPreviewDocument({ id: doc.id, name: doc.name, type: doc.type })}
                      className="p-2 text-muted-foreground hover:text-primary transition-colors"
                      title="Preview"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => handleDownload(doc.id, doc.name)}
                      className="p-2 text-muted-foreground hover:text-primary transition-colors"
                      title="Download"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => setShareDocument({ id: doc.id, name: doc.name })}
                      className="p-2 text-muted-foreground hover:text-primary transition-colors"
                      title="Share via Email"
                    >
                      <Share2 className="h-5 w-5" />
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

      {shareDocument && (
        <ShareModal 
          documentId={shareDocument.id}
          documentName={shareDocument.name}
          onClose={() => setShareDocument(null)}
          onSuccess={() => {
            setShareDocument(null);
            toast.success('Document shared', 'The document has been shared successfully.');
          }}
        />
      )}

      {previewDocument && (
        <PreviewModal
          documentId={previewDocument.id}
          documentName={previewDocument.name}
          documentType={previewDocument.type}
          onClose={() => setPreviewDocument(null)}
          onUpdate={() => fetchDocuments()}
        />
      )}
    </div>
  );
}
