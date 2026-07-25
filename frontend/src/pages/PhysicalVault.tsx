import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Landmark as AlmirahIcon, Search, CheckCircle, XCircle, ArrowLeftRight, X, Download, Printer, AlertTriangle 
} from 'lucide-react';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';

interface PhysicalLocation {
  almirahId: string;
  shelf: string;
  holder: string;
  folder: string;
  subFolder?: string;
  slot?: string;
  originalPresent: boolean;
  lastBorrowedBy?: string;
  lastBorrowedAt?: string;
}

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
  physicalLocation?: PhysicalLocation;
}

interface Log {
  id: string;
  actionType: string;
  performedBy: string;
  borrowerName?: string;
  notes?: string;
  createdAt: string;
}

const SHELF_1_HOLDERS = [
  { code: 'Holder A', name: 'Identity Documents', color: 'border-yellow-500 bg-yellow-500/5 text-yellow-600 dark:text-yellow-400', icon: '🟨', folders: ['Aadhaar', 'PAN', 'Passport', 'Driving Licence', 'Voter ID', 'Birth Certificate', 'Marriage Certificate'] },
  { code: 'Holder B', name: 'Banking Documents', color: 'border-blue-500 bg-blue-500/5 text-blue-600 dark:text-blue-400', icon: '🟦', folders: ['SBI', 'HDFC', 'ICICI', 'Axis', 'Passbooks', 'Cheque Books', 'Debit Cards', 'FD', 'RD'] },
  { code: 'Holder C', name: 'Vehicle Documents', color: 'border-red-500 bg-red-500/5 text-red-600 dark:text-red-400', icon: '🟥', folders: ['Car', 'Bike', 'RC', 'Insurance', 'PUC', 'FASTag', 'Service Records'] },
  { code: 'Holder D', name: 'Medical & Insurance', color: 'border-green-500 bg-green-500/5 text-green-600 dark:text-green-400', icon: '🟩', folders: ['Health Insurance', 'Medical Reports', 'Prescriptions', 'Blood Reports', 'Vaccination Records'] }
];

const SHELF_3_HOLDERS = [
  { code: 'Property', name: 'Property', icon: '🏠', color: 'border-amber-700 bg-amber-700/5 text-amber-700 dark:text-amber-400', folders: ['Sale Deed', 'Registry', 'Mutation', 'Property Tax', 'Builder Documents'] },
  { code: 'Investments', name: 'Investments', icon: '📈', color: 'border-emerald-600 bg-emerald-600/5 text-emerald-600 dark:text-emerald-400', folders: ['Mutual Funds', 'Stocks', 'PF', 'NPS', 'PPF', 'FD', 'RD', 'Bonds'] },
  { code: 'Gold', name: 'Gold', icon: '💰', color: 'border-yellow-600 bg-yellow-600/5 text-yellow-600 dark:text-yellow-400', folders: ['Bills', 'Valuations', 'Storage Logs'] },
  { code: 'Loans', name: 'Loans', icon: '📜', color: 'border-orange-600 bg-orange-600/5 text-orange-600 dark:text-orange-400', folders: ['Home Loan', 'Personal Loan', 'Vehicle Loan', 'Payment Schedule', 'Statements'] },
  { code: 'Tax', name: 'Tax', icon: '📑', color: 'border-sky-600 bg-sky-600/5 text-sky-600 dark:text-sky-400', folders: ['Tax Returns', 'Deductions', 'Receipts'] },
  { code: 'Archive', name: 'Archive', icon: '📦', color: 'border-gray-500 bg-gray-500/5 text-gray-600 dark:text-gray-400', folders: ['Old Policies', 'Closed Accounts', 'Expired Documents', 'Warranty Papers', 'Old Medical Records'] }
];

export default function PhysicalVault() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  
  // Navigation states
  const [expandedShelf, setExpandedShelf] = useState<string | null>('Shelf 1');
  const [selectedHolder, setSelectedHolder] = useState<any | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  
  // Modals / Transaction flows
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [docLogs, setDocLogs] = useState<Log[]>([]);
  const [borrowerName, setBorrowerName] = useState('');
  const [notes, setNotes] = useState('');
  
  // Rule 2: TABLE must be the default
  const [tab, setTab] = useState<'list' | 'almirah' | 'stats'>('list');

  // List View Filter States
  const [docSearch, setDocSearch] = useState('');
  const [docFilterCategory, setDocFilterCategory] = useState('ALL');
  const [docFilterOwner, setDocFilterOwner] = useState('ALL');
  const [docFilterExpiry, setDocFilterExpiry] = useState('ALL');
  
  // List View Sort States
  const [docSortField, setDocSortField] = useState<'name' | 'expiry' | 'size'>('name');
  const [docSortOrder, setDocSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // List View Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const getShelf2Holders = () => {
    if (familyMembers.length === 0) {
      return [
        { code: 'Family Shared', name: 'Family Shared', icon: '👪', color: 'border-cyan-500 bg-cyan-500/5 text-cyan-600 dark:text-cyan-400', folders: ['Identity', 'Education', 'Employment', 'Banking', 'Medical', 'Insurance', 'Investments', 'Tax', 'Legal'] }
      ];
    }
    const colors = [
      'border-indigo-500 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400',
      'border-purple-500 bg-purple-500/5 text-purple-600 dark:text-purple-400',
      'border-pink-500 bg-pink-500/5 text-pink-600 dark:text-pink-400',
      'border-rose-500 bg-rose-500/5 text-rose-600 dark:text-rose-400',
      'border-teal-500 bg-teal-500/5 text-teal-600 dark:text-teal-400',
      'border-orange-500 bg-orange-500/5 text-orange-600 dark:text-orange-400'
    ];
    const icons = ['👨', '👩', '🧑', '👵', '👴', '👧', '👦'];
    const list = familyMembers.map((member, index) => {
      let icon = icons[index % icons.length];
      const nameLower = member.name.toLowerCase();
      if (nameLower.includes('father') || nameLower.includes('dad') || nameLower.includes('papa')) icon = '👴';
      else if (nameLower.includes('mother') || nameLower.includes('mom') || nameLower.includes('mummy') || nameLower.includes('maa')) icon = '👵';
      else if (nameLower.includes('sister')) icon = '👧';
      else if (nameLower.includes('brother')) icon = '👦';

      return {
        code: member.name,
        name: member.name,
        icon: icon,
        color: colors[index % colors.length],
        folders: ['Identity', 'Education', 'Employment', 'Banking', 'Medical', 'Insurance', 'Investments', 'Tax', 'Legal']
      };
    });
    list.push({
      code: 'Family Shared',
      name: 'Family Shared',
      icon: '👪',
      color: 'border-cyan-500 bg-cyan-500/5 text-cyan-600 dark:text-cyan-400',
      folders: ['Identity', 'Education', 'Employment', 'Banking', 'Medical', 'Insurance', 'Investments', 'Tax', 'Legal']
    });
    return list;
  };

  const shelf2Holders = getShelf2Holders();

  useEffect(() => {
    fetchDocuments();
    fetchStats();
    fetchFamilyMembers();
  }, []);

  const fetchDocuments = async () => {
    try {
      const data = await apiClient('/api/documents');
      setDocuments(data);
    } catch (err) {
      console.error('Failed to fetch documents', err);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await apiClient('/api/physical-documents/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const fetchFamilyMembers = async () => {
    try {
      const data = await apiClient('/api/family-members');
      setFamilyMembers(data);
      if (data.length > 0) {
        setBorrowerName(data[0].name);
      }
    } catch (err) {
      console.error('Failed to fetch family members', err);
    }
  };

  const fetchLogs = async (docId: string) => {
    try {
      const data = await apiClient(`/api/physical-documents/${docId}/logs`);
      setDocLogs(data);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    }
  };

  const selectDocument = (doc: Document) => {
    setSelectedDoc(doc);
    fetchLogs(doc.id);
  };

  const handleCheckOut = async () => {
    if (!selectedDoc || !borrowerName) return;
    try {
      await apiClient(`/api/physical-documents/${selectedDoc.id}/check-out`, {
        method: 'POST',
        body: JSON.stringify({ borrowerName, notes })
      });
      setIsCheckOutOpen(false);
      setBorrowerName('');
      setNotes('');
      
      fetchDocuments();
      fetchStats();
      const updated = documents.find(d => d.id === selectedDoc.id);
      if (updated) {
        selectDocument({
          ...updated,
          physicalLocation: {
            ...updated.physicalLocation!,
            originalPresent: false,
            lastBorrowedBy: borrowerName,
            lastBorrowedAt: new Date().toISOString()
          }
        });
      } else {
        setSelectedDoc(null);
      }
    } catch (err) {
      console.error('Check-out failed', err);
    }
  };

  const handleCheckIn = async () => {
    if (!selectedDoc) return;
    try {
      await apiClient(`/api/physical-documents/${selectedDoc.id}/check-in`, {
        method: 'POST',
        body: JSON.stringify({ notes })
      });
      setIsCheckInOpen(false);
      setNotes('');
      
      fetchDocuments();
      fetchStats();
      const updated = documents.find(d => d.id === selectedDoc.id);
      if (updated) {
        selectDocument({
          ...updated,
          physicalLocation: {
            ...updated.physicalLocation!,
            originalPresent: true
          }
        });
      } else {
        setSelectedDoc(null);
      }
    } catch (err) {
      console.error('Check-in failed', err);
    }
  };

  const getFilteredDocs = (shelf: string, holderCode: string, folderName: string) => {
    return documents.filter(doc => {
      const loc = doc.physicalLocation;
      return loc && loc.shelf === shelf && loc.holder === holderCode && loc.folder === folderName;
    });
  };

  const getHolderDocsCount = (shelf: string, holderCode: string) => {
    return documents.filter(doc => {
      const loc = doc.physicalLocation;
      return loc && loc.shelf === shelf && loc.holder === holderCode;
    }).length;
  };

  const getShelfDocsCount = (shelf: string) => {
    return documents.filter(doc => {
      const loc = doc.physicalLocation;
      return loc && loc.shelf === shelf;
    }).length;
  };

  // Searching logic for cupboard view
  const searchResults = documents.filter(doc => {
    if (!searchQuery) return false;
    const query = searchQuery.toLowerCase();
    
    const matchesName = doc.name.toLowerCase().includes(query);
    const matchesTags = doc.tags?.some(t => t.toLowerCase().includes(query)) || false;
    const matchesCategory = doc.category.toLowerCase().includes(query);
    const matchesDescription = doc.description?.toLowerCase().includes(query) || false;
    
    const loc = doc.physicalLocation;
    const matchesLoc = loc ? (
      loc.shelf.toLowerCase().includes(query) ||
      loc.holder.toLowerCase().includes(query) ||
      loc.folder.toLowerCase().includes(query) ||
      (loc.subFolder && loc.subFolder.toLowerCase().includes(query))
    ) : false;

    return matchesName || matchesTags || matchesCategory || matchesDescription || matchesLoc;
  });

  const getDocumentExpiryUrgency = useCallback((expiryDate?: string) => {
    if (!expiryDate) return 'none';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate);
    exp.setHours(0, 0, 0, 0);
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'expired';
    if (diffDays <= 30) return '30d';
    if (diffDays <= 90) return '90d';
    return 'none';
  }, []);

  // Filter List View dataset
  const filteredListDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(docSearch.toLowerCase()) || 
                          (doc.description && doc.description.toLowerCase().includes(docSearch.toLowerCase())) ||
                          doc.category.toLowerCase().includes(docSearch.toLowerCase()) ||
                          doc.tags?.some(t => t.toLowerCase().includes(docSearch.toLowerCase()));

    const matchesCategory = docFilterCategory === 'ALL' || doc.category === docFilterCategory;
    const matchesOwner = docFilterOwner === 'ALL' || doc.physicalLocation?.holder === docFilterOwner;

    const urgency = getDocumentExpiryUrgency(doc.expiryDate);
    let matchesExpiry = true;
    if (docFilterExpiry === '30D') {
      matchesExpiry = urgency === '30d' || urgency === 'expired';
    } else if (docFilterExpiry === '90D') {
      matchesExpiry = urgency === '90d';
    }

    return matchesSearch && matchesCategory && matchesOwner && matchesExpiry;
  });

  // Sort List View dataset (Rule 6: Overdue floats to top)
  const sortedListDocs = [...filteredListDocs].sort((a, b) => {
    const aUrgency = getDocumentExpiryUrgency(a.expiryDate);
    const bUrgency = getDocumentExpiryUrgency(b.expiryDate);
    
    const aOverdue = aUrgency === 'expired' || aUrgency === '30d';
    const bOverdue = bUrgency === 'expired' || bUrgency === '30d';
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    let comparison = 0;
    if (docSortField === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (docSortField === 'expiry') {
      const aTime = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
      const bTime = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
      comparison = aTime - bTime;
    } else if (docSortField === 'size') {
      comparison = a.size - b.size;
    }
    return docSortOrder === 'asc' ? comparison : -comparison;
  });

  // List view Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedListDocs = sortedListDocs.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(sortedListDocs.length / itemsPerPage);

  // Summary Strip Calculations
  const totalDocsCount = filteredListDocs.length;
  const expiring30Count = filteredListDocs.filter(d => {
    const u = getDocumentExpiryUrgency(d.expiryDate);
    return u === '30d' || u === 'expired';
  }).length;
  const expiring90Count = filteredListDocs.filter(d => getDocumentExpiryUrgency(d.expiryDate) === '90d').length;

  const totalStorageBytes = filteredListDocs.reduce((sum, d) => sum + (d.size || 0), 0);
  const storageUsedMB = (totalStorageBytes / (1024 * 1024)).toFixed(1);
  const storageQuotaMB = 1024; // 1 GB quota
  const storageUsedPercent = Math.round((totalStorageBytes / (storageQuotaMB * 1024 * 1024)) * 100);

  const uniqueCategories = Array.from(new Set(documents.map(d => d.category)));
  const uniqueOwners = Array.from(new Set(documents.map(d => d.physicalLocation?.holder).filter(Boolean)));

  // Exporters
  const handleExportCSV = () => {
    const headers = ['Document Name', 'Category', 'Holder', 'Size (KB)', 'Expiry Date', 'Status', 'Almirah Location'];
    const exportData = sortedListDocs.map(d => [
      d.name,
      d.category,
      d.physicalLocation?.holder || '',
      (d.size / 1024).toFixed(1),
      d.expiryDate || '',
      d.physicalLocation?.originalPresent ? 'In-Vault' : 'Borrowed',
      d.physicalLocation ? `${d.physicalLocation.shelf} > ${d.physicalLocation.folder}` : ''
    ]);
    exportToCSV(exportData, headers, 'Physical_Documents_Vault_Report');
  };

  const handleExportPDF = () => {
    const headers = ['Name', 'Category', 'Holder', 'Size', 'Expiry Date', 'Status', 'Location'];
    const exportData = sortedListDocs.map(d => [
      d.name,
      d.category,
      d.physicalLocation?.holder || '-',
      `${(d.size / 1024).toFixed(0)} KB`,
      d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : '-',
      d.physicalLocation?.originalPresent ? 'In-Vault' : 'Borrowed',
      d.physicalLocation ? `${d.physicalLocation.shelf} > ${d.physicalLocation.folder}` : '-'
    ]);
    exportToPDF('Physical Documents Directory', headers, exportData, 'Physical_Documents_Vault_Report');
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-3 bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            <AlmirahIcon className="h-8 w-8 text-primary shrink-0" />
            Physical Document Vault
          </h1>
          <p className="text-sm text-muted-foreground">Manage original physical copies in your Home Almirah</p>
        </div>

        <div className="flex bg-card border border-border/80 p-1 rounded-xl shadow-inner shrink-0">
          <button 
            onClick={() => setTab('list')} 
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'list' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Directory Table
          </button>
          <button 
            onClick={() => setTab('almirah')} 
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'almirah' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Virtual Almirah
          </button>
          <button 
            onClick={() => setTab('stats')} 
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'stats' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Vault Dashboard
          </button>
        </div>
      </div>

      {/* Main content grid based on selected tab */}
      {tab === 'stats' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Statistics Cards */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Vault Documents</span>
            <span className="text-3xl font-bold mt-2">{stats.totalDocuments || 0}</span>
          </div>
          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between border-l-4 border-green-500">
            <span className="text-sm font-medium text-muted-foreground">Digital & Physical Copies</span>
            <span className="text-3xl font-bold mt-2">{stats.bothDigitalAndPhysical || 0}</span>
          </div>
          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between border-l-4 border-yellow-500">
            <span className="text-sm font-medium text-muted-foreground">Physical Only (No Upload)</span>
            <span className="text-3xl font-bold mt-2">{stats.physicalOnly || 0}</span>
          </div>
          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between border-l-4 border-red-500">
            <span className="text-sm font-medium text-muted-foreground">Missing Originals</span>
            <span className="text-3xl font-bold mt-2 text-red-500">{stats.missingOriginals || 0}</span>
          </div>

          {/* Utilization Grid */}
          <div className="glass-panel p-6 rounded-2xl col-span-1 md:col-span-2 lg:col-span-4">
            <h3 className="text-lg font-bold mb-4">Shelf Occupancy & Utilization</h3>
            <div className="space-y-4">
              {['Shelf 1', 'Shelf 2', 'Shelf 3'].map(shelf => {
                const count = stats.shelfUtilization?.[shelf] || 0;
                const totalCount = documents.filter(d => d.physicalLocation).length || 1;
                const pct = Math.round((count / totalCount) * 100);
                return (
                  <div key={shelf}>
                    <div className="flex justify-between text-sm font-medium mb-1">
                      <span>{shelf}</span>
                      <span>{count} files ({pct}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div className="bg-primary h-3 rounded-full" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : tab === 'list' ? (
        /* Rule 2 & 3: Dense Table View (Default) */
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          
          {/* Rule 1: Summary Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-xl border border-border/50">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Total Documents</span>
              <p className="text-lg font-mono font-bold text-foreground mt-1 tabular-nums">{totalDocsCount}</p>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-border/50 bg-gradient-to-br from-red-500/5 to-transparent">
              <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider block">Expiring in 30 Days</span>
              <p className="text-lg font-mono font-bold text-red-500 mt-1 tabular-nums">{expiring30Count}</p>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-border/50 bg-gradient-to-br from-yellow-500/5 to-transparent">
              <span className="text-[10px] uppercase font-bold text-yellow-500 tracking-wider block">Expiring in 90 Days</span>
              <p className="text-lg font-mono font-bold text-yellow-500 mt-1 tabular-nums">{expiring90Count}</p>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-border/50">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Storage Quota</span>
              <p className="text-sm font-mono font-bold text-foreground mt-2 tabular-nums">
                {storageUsedMB} MB / {storageQuotaMB} MB ({storageUsedPercent}%)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
            {/* Left panel Table */}
            <div className="lg:col-span-8 flex flex-col gap-4 min-h-0">
              {/* Search + Filter control row */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-card/30 p-2.5 rounded-xl border border-border/50">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search vault..."
                      value={docSearch}
                      onChange={(e) => setDocSearch(e.target.value)}
                      className="pl-8 pr-3 py-1 w-48 bg-background border border-border rounded text-xs outline-none focus:ring-1 focus:ring-primary text-foreground"
                    />
                  </div>

                  <select
                    value={docFilterCategory}
                    onChange={(e) => setDocFilterCategory(e.target.value)}
                    className="px-2 py-1 bg-background border border-border rounded text-xs text-foreground outline-none cursor-pointer focus:ring-1 focus:ring-primary"
                  >
                    <option value="ALL">All Categories</option>
                    {uniqueCategories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  <select
                    value={docFilterOwner}
                    onChange={(e) => setDocFilterOwner(e.target.value)}
                    className="px-2 py-1 bg-background border border-border rounded text-xs text-foreground outline-none cursor-pointer focus:ring-1 focus:ring-primary"
                  >
                    <option value="ALL">All Holders</option>
                    {uniqueOwners.map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>

                  <select
                    value={docFilterExpiry}
                    onChange={(e) => setDocFilterExpiry(e.target.value)}
                    className="px-2 py-1 bg-background border border-border rounded text-xs text-foreground outline-none cursor-pointer focus:ring-1 focus:ring-primary"
                  >
                    <option value="ALL">All Expiries</option>
                    <option value="30D">Expiring (30 Days)</option>
                    <option value="90D">Expiring (90 Days)</option>
                  </select>
                </div>

                {/* Exporters */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1 px-2 py-1 bg-muted hover:bg-muted/80 border border-border/50 text-[10px] text-muted-foreground hover:text-foreground font-bold uppercase rounded cursor-pointer transition-colors"
                  >
                    <Download className="h-3 w-3" /> CSV
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-1 px-2 py-1 bg-muted hover:bg-muted/80 border border-border/50 text-[10px] text-muted-foreground hover:text-foreground font-bold uppercase rounded cursor-pointer transition-colors"
                  >
                    <Printer className="h-3 w-3" /> PDF
                  </button>
                </div>
              </div>

              {/* Table rendering */}
              <div className="bg-card rounded-xl border border-border/50 overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="overflow-auto custom-scrollbar flex-1">
                  <table className="min-w-full divide-y divide-border/20 dense-table text-left">
                    <thead className="bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
                      <tr>
                        <th 
                          onClick={() => {
                            if (docSortField === 'name') setDocSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                            else { setDocSortField('name'); setDocSortOrder('asc'); }
                          }}
                          className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase cursor-pointer hover:bg-muted select-none"
                        >
                          Document Name {docSortField === 'name' ? (docSortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                        </th>
                        <th className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase select-none">Category</th>
                        <th className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase select-none">Holder</th>
                        <th 
                          onClick={() => {
                            if (docSortField === 'size') setDocSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                            else { setDocSortField('size'); setDocSortOrder('asc'); }
                          }}
                          className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase cursor-pointer hover:bg-muted select-none text-right"
                        >
                          Size {docSortField === 'size' ? (docSortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                        </th>
                        <th 
                          onClick={() => {
                            if (docSortField === 'expiry') setDocSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                            else { setDocSortField('expiry'); setDocSortOrder('asc'); }
                          }}
                          className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase cursor-pointer hover:bg-muted select-none text-right"
                        >
                          Expiry Date {docSortField === 'expiry' ? (docSortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                        </th>
                        <th className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase select-none text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card/50 divide-y divide-border/20">
                      {paginatedListDocs.map((doc, idx) => {
                        const urgency = getDocumentExpiryUrgency(doc.expiryDate);
                        const isExpired = urgency === 'expired';
                        const is30d = urgency === '30d';
                        const is90d = urgency === '90d';
                        return (
                          <tr 
                            key={doc.id} 
                            onClick={() => selectDocument(doc)}
                            className={`hover:bg-muted/30 transition-colors cursor-pointer ${selectedDoc?.id === doc.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''} ${idx % 2 === 0 ? 'bg-background/25' : 'bg-card/15'}`}
                          >
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className="font-semibold text-foreground text-xs">{doc.name}</span>
                              <span className="text-[9px] text-muted-foreground block font-mono">
                                {doc.physicalLocation ? `${doc.physicalLocation.shelf} > ${doc.physicalLocation.folder}` : 'No Loc'}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-foreground font-medium uppercase">{doc.category}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{doc.physicalLocation?.holder || '-'}</td>
                            <td className="px-3 py-2 whitespace-nowrap font-mono text-right tabular-nums text-xs">
                              {(doc.size / 1024).toFixed(0)} KB
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-right font-mono text-xs">
                              {doc.expiryDate ? (
                                <span className={`font-bold ${isExpired || is30d ? 'text-red-500' : is90d ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                                  {new Date(doc.expiryDate).toLocaleDateString()}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-right text-xs">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                                doc.physicalLocation?.originalPresent 
                                  ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                                  : 'bg-red-500/10 text-red-500 border-red-500/20'
                              }`}>
                                {doc.physicalLocation?.originalPresent ? 'Vault' : 'Out'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {sortedListDocs.length > 0 && (
                  <div className="flex items-center justify-between border-t border-border/50 p-2.5 bg-muted/10">
                    <div className="flex flex-1 justify-between sm:hidden">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded border border-border bg-card px-3 py-1 text-xs font-medium text-foreground hover:bg-muted/80 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages || totalPages <= 1}
                        className="relative ml-3 inline-flex items-center rounded border border-border bg-card px-3 py-1 text-xs font-medium text-foreground hover:bg-muted/80 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <p className="text-xs text-muted-foreground">
                          Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{' '}
                          <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, sortedListDocs.length)}</span> of{' '}
                          <span className="font-semibold text-foreground">{sortedListDocs.length}</span> results
                        </p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground">Show</span>
                          <select
                            value={itemsPerPage}
                            onChange={(e) => {
                              setItemsPerPage(Number(e.target.value));
                              setCurrentPage(1);
                            }}
                            className="px-1.5 py-0.5 rounded bg-card border border-border text-foreground text-[10px] outline-none cursor-pointer focus:ring-1 focus:ring-primary"
                          >
                            <option value={15}>15 entries</option>
                            <option value={30}>30 entries</option>
                            <option value={50}>50 entries</option>
                          </select>
                        </div>
                      </div>
                      {totalPages > 1 && (
                        <div>
                          <nav className="isolate inline-flex -space-x-px rounded-md shadow-xs" aria-label="Pagination">
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                              className="relative inline-flex items-center rounded-l px-1.5 py-1 text-muted-foreground ring-1 ring-inset ring-border bg-card hover:bg-muted disabled:opacity-50"
                            >
                              <span className="sr-only">Previous</span>
                              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                              </svg>
                            </button>
                            {Array.from({ length: totalPages }).map((_, idx) => (
                              <button
                                key={idx}
                                onClick={() => setCurrentPage(idx + 1)}
                                className={`relative inline-flex items-center px-3 py-1 text-xs font-semibold ring-1 ring-inset ring-border focus:z-20 ${
                                  currentPage === idx + 1
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-foreground bg-card hover:bg-muted'
                                }`}
                              >
                                {idx + 1}
                              </button>
                            ))}
                            <button
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              disabled={currentPage === totalPages}
                              className="relative inline-flex items-center rounded-r px-1.5 py-1 text-muted-foreground ring-1 ring-inset ring-border bg-card hover:bg-muted disabled:opacity-50"
                            >
                              <span className="sr-only">Next</span>
                              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </nav>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right panel Inspector */}
            <div className="lg:col-span-4 flex flex-col h-[calc(100vh-16rem)] overflow-hidden">
              {selectedDoc ? (
                <div className="glass-panel p-4 rounded-xl flex-1 flex flex-col relative text-xs">
                  <button 
                    onClick={() => setSelectedDoc(null)}
                    className="absolute right-3 top-3 p-1 hover:bg-muted rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <h3 className="font-bold text-sm text-foreground truncate pr-6 leading-tight">{selectedDoc.name}</h3>
                  <p className="text-muted-foreground text-[10px] uppercase font-bold mt-0.5">Category: {selectedDoc.category}</p>

                  {/* Location Info */}
                  {selectedDoc.physicalLocation && (
                    <div className="p-2.5 bg-muted/40 border border-border/50 rounded-xl mt-3 text-[11px]">
                      <span className="font-semibold text-muted-foreground block mb-0.5">📍 Cupboard Location</span>
                      <span className="text-primary font-bold">
                        {selectedDoc.physicalLocation.almirahId} → {selectedDoc.physicalLocation.shelf} → {selectedDoc.physicalLocation.holder} → {selectedDoc.physicalLocation.folder}
                      </span>
                    </div>
                  )}

                  {/* Urgency warning badge */}
                  {selectedDoc.expiryDate && (
                    <div className="mt-3">
                      {(() => {
                        const u = getDocumentExpiryUrgency(selectedDoc.expiryDate);
                        if (u === 'expired') {
                          return (
                            <div className="flex items-center gap-1.5 p-2 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 font-bold uppercase text-[9px]">
                              <AlertTriangle className="h-3.5 w-3.5 animate-bounce" /> Expiry date passed!
                            </div>
                          );
                        } else if (u === '30d') {
                          return (
                            <div className="flex items-center gap-1.5 p-2 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 font-bold uppercase text-[9px]">
                              <AlertTriangle className="h-3.5 w-3.5" /> Expiring within 30 days!
                            </div>
                          );
                        } else if (u === '90d') {
                          return (
                            <div className="flex items-center gap-1.5 p-2 bg-yellow-500/10 text-yellow-500 rounded-lg border border-yellow-500/20 font-bold uppercase text-[9px]">
                              <AlertTriangle className="h-3.5 w-3.5" /> Expiring soon (90 days)
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}

                  {/* Availability */}
                  <div className="flex items-center justify-between mt-3 py-1.5 border-t border-border/30">
                    <span className="font-bold text-muted-foreground text-[10px] uppercase">Availability</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      selectedDoc.physicalLocation?.originalPresent 
                        ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}>
                      {selectedDoc.physicalLocation?.originalPresent ? 'In-Cupboard' : 'Checked Out'}
                    </span>
                  </div>

                  {/* Borrow Action buttons */}
                  <div className="flex gap-2 mt-3">
                    {selectedDoc.physicalLocation?.originalPresent ? (
                      <button 
                        onClick={() => setIsCheckOutOpen(true)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground py-2 rounded-lg font-bold hover:opacity-90 text-[11px] shadow-sm cursor-pointer"
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5" /> Check Out Original
                      </button>
                    ) : (
                      <button 
                        onClick={() => setIsCheckInOpen(true)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 text-[11px] shadow-sm cursor-pointer"
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Check In Original
                      </button>
                    )}
                  </div>

                  {/* Borrow info */}
                  {!selectedDoc.physicalLocation?.originalPresent && selectedDoc.physicalLocation?.lastBorrowedBy && (
                    <div className="mt-3 p-3 bg-red-500/5 border border-red-500/10 rounded-xl space-y-1">
                      <div className="flex justify-between">
                        <span className="font-semibold text-muted-foreground">Borrowed By:</span>
                        <span className="font-bold text-foreground">{selectedDoc.physicalLocation.lastBorrowedBy}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-muted-foreground">Borrowed At:</span>
                        <span className="font-bold text-foreground">
                          {new Date(selectedDoc.physicalLocation.lastBorrowedAt!).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Audit Logs */}
                  <div className="flex-1 flex flex-col pt-3 border-t border-border/30 mt-3 min-h-0">
                    <h4 className="font-bold text-[10px] mb-2 text-muted-foreground uppercase tracking-wide">Activity Logs</h4>
                    <div className="flex-1 overflow-y-auto space-y-2 max-h-[160px] custom-scrollbar">
                      {docLogs.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground py-2">No activity recorded yet.</p>
                      ) : (
                        docLogs.map(log => (
                          <div key={log.id} className="p-2 bg-muted/20 border border-border/30 rounded-lg space-y-0.5">
                            <div className="flex justify-between items-center font-bold text-[10px]">
                              <span className={log.actionType === 'CHECK_IN' ? 'text-green-600' : 'text-red-500'}>
                                {log.actionType}
                              </span>
                              <span className="text-[9px] text-muted-foreground font-normal">
                                {new Date(log.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {log.borrowerName && (
                              <p className="text-muted-foreground"><span className="font-medium text-foreground">Borrower:</span> {log.borrowerName}</p>
                            )}
                            {log.notes && (
                              <p className="text-muted-foreground italic">"{log.notes}"</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-panel p-6 rounded-xl flex-1 flex flex-col justify-center items-center text-center text-muted-foreground">
                  <AlmirahIcon className="h-10 w-10 mb-2 opacity-15" />
                  <p className="font-medium text-xs">Select a document in the table to inspect details.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Visual Cupboard / Almirah */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Search & Virtual Almirah Cabinet */}
          <div className="lg:col-span-7 flex flex-col space-y-6">
            
            {/* Natural Search Bar */}
            <div className="flex items-center bg-card border border-border rounded-2xl px-4 py-3 shadow-md focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all">
              <Search className="h-5 w-5 text-muted-foreground mr-3" />
              <input 
                type="text" 
                placeholder="Search e.g. 'Father Passport', 'Car Insurance'..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-foreground text-base"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-muted rounded-full">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* If searching, render search results */}
            {searchQuery ? (
              <div className="glass-panel p-6 rounded-2xl flex-1 space-y-4">
                <h3 className="text-lg font-bold">Search Results ({searchResults.length})</h3>
                {searchResults.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No physical documents match your query.</p>
                ) : (
                  <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                    {searchResults.map(doc => (
                      <div 
                        key={doc.id} 
                        onClick={() => selectDocument(doc)}
                        className="py-3 flex items-center justify-between cursor-pointer hover:bg-muted/30 px-2 rounded-xl transition-all"
                      >
                        <div>
                          <p className="font-semibold text-foreground">{doc.name}</p>
                          <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                            <span>Category: {doc.category}</span>
                            {doc.physicalLocation && (
                              <span className="text-primary font-medium">
                                📍 {doc.physicalLocation.shelf} → {doc.physicalLocation.holder} → {doc.physicalLocation.folder}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.physicalLocation?.originalPresent ? (
                            <span className="bg-green-500/10 text-green-500 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5" /> Present
                            </span>
                          ) : (
                            <span className="bg-red-500/10 text-red-500 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                              <XCircle className="h-3.5 w-3.5" /> Checked Out
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Visual Cupboard / Almirah */
              <div className="bg-card border-4 border-amber-900 rounded-3xl shadow-2xl overflow-hidden relative p-6 bg-gradient-to-b from-amber-50/20 to-amber-100/10 dark:from-zinc-900 dark:to-zinc-950">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent pointer-events-none"></div>
                <h3 className="text-center font-black tracking-widest text-amber-800 dark:text-amber-600 text-lg mb-6 border-b-2 border-amber-900/30 pb-2">
                  🏛️ MY ALMIRAH
                </h3>

                {/* Cabinet Shelves */}
                <div className="space-y-6">
                  
                  {/* Shelf 1 */}
                  <div className="border border-border/80 rounded-2xl bg-card/65 shadow-md overflow-hidden transition-all hover:shadow-lg">
                    <button 
                      onClick={() => setExpandedShelf(expandedShelf === 'Shelf 1' ? null : 'Shelf 1')}
                      className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-base bg-muted/40 hover:bg-muted/80 transition-colors"
                    >
                      <span className="flex items-center gap-2">📂 Shelf 1 – Frequently Used Documents</span>
                      <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
                        {getShelfDocsCount('Shelf 1')} files
                      </span>
                    </button>
                    
                    <AnimatePresence initial={false}>
                      {expandedShelf === 'Shelf 1' && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/10 border-t border-border/50"
                        >
                          {SHELF_1_HOLDERS.map(holder => (
                            <button
                              key={holder.code}
                              onClick={() => {
                                setSelectedHolder({ ...holder, shelf: 'Shelf 1' });
                                setSelectedFolder(null);
                              }}
                              className={`p-3 border rounded-xl flex flex-col items-center justify-center text-center transition-all ${selectedHolder?.code === holder.code && selectedHolder?.shelf === 'Shelf 1' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border bg-card hover:bg-muted/50'}`}
                            >
                              <span className="text-2xl mb-1">{holder.icon}</span>
                              <span className="font-semibold text-xs leading-tight text-foreground truncate max-w-full">{holder.name}</span>
                              <span className="text-[10px] text-muted-foreground mt-1 font-bold bg-muted px-2 py-0.5 rounded-full">{getHolderDocsCount('Shelf 1', holder.code)} files</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Shelf 2 */}
                  <div className="border border-border/80 rounded-2xl bg-card/65 shadow-md overflow-hidden transition-all hover:shadow-lg">
                    <button 
                      onClick={() => setExpandedShelf(expandedShelf === 'Shelf 2' ? null : 'Shelf 2')}
                      className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-base bg-muted/40 hover:bg-muted/80 transition-colors"
                    >
                      <span className="flex items-center gap-2">📂 Shelf 2 – Individual Family Folders</span>
                      <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
                        {getShelfDocsCount('Shelf 2')} files
                      </span>
                    </button>
                    
                    <AnimatePresence initial={false}>
                      {expandedShelf === 'Shelf 2' && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/10 border-t border-border/50"
                        >
                          {shelf2Holders.map(holder => (
                            <button
                              key={holder.code}
                              onClick={() => {
                                setSelectedHolder({ ...holder, shelf: 'Shelf 2' });
                                setSelectedFolder(null);
                              }}
                              className={`p-3 border rounded-xl flex flex-col items-center justify-center text-center transition-all ${selectedHolder?.code === holder.code && selectedHolder?.shelf === 'Shelf 2' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border bg-card hover:bg-muted/50'}`}
                            >
                              <span className="text-2xl mb-1">{holder.icon}</span>
                              <span className="font-semibold text-xs leading-tight text-foreground truncate max-w-full">{holder.name}</span>
                              <span className="text-[10px] text-muted-foreground mt-1 font-bold bg-muted px-2 py-0.5 rounded-full">{getHolderDocsCount('Shelf 2', holder.code)} files</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Shelf 3 */}
                  <div className="border border-border/80 rounded-2xl bg-card/65 shadow-md overflow-hidden transition-all hover:shadow-lg">
                    <button 
                      onClick={() => setExpandedShelf(expandedShelf === 'Shelf 3' ? null : 'Shelf 3')}
                      className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-base bg-muted/40 hover:bg-muted/80 transition-colors"
                    >
                      <span className="flex items-center gap-2">📂 Shelf 3 – High Value Assets & Deeds</span>
                      <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
                        {getShelfDocsCount('Shelf 3')} files
                      </span>
                    </button>
                    
                    <AnimatePresence initial={false}>
                      {expandedShelf === 'Shelf 3' && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/10 border-t border-border/50"
                        >
                          {SHELF_3_HOLDERS.map(holder => (
                            <button
                              key={holder.code}
                              onClick={() => {
                                setSelectedHolder({ ...holder, shelf: 'Shelf 3' });
                                setSelectedFolder(null);
                              }}
                              className={`p-3 border rounded-xl flex flex-col items-center justify-center text-center transition-all ${selectedHolder?.code === holder.code && selectedHolder?.shelf === 'Shelf 3' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border bg-card hover:bg-muted/50'}`}
                            >
                              <span className="text-2xl mb-1">{holder.icon}</span>
                              <span className="font-semibold text-xs leading-tight text-foreground truncate max-w-full">{holder.name}</span>
                              <span className="text-[10px] text-muted-foreground mt-1 font-bold bg-muted px-2 py-0.5 rounded-full">{getHolderDocsCount('Shelf 3', holder.code)} files</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                </div>
              </div>
            )}

          </div>

          {/* Right Column: Folders & Document Detail Inspector */}
          <div className="lg:col-span-5 flex flex-col space-y-6">
            
            {/* Folder selection within a selected holder */}
            {selectedHolder && !selectedDoc && (
              <div className="glass-panel p-6 rounded-2xl flex-1 flex flex-col space-y-4">
                <div className="flex justify-between items-start border-b border-border/50 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <span>{selectedHolder.icon}</span> {selectedHolder.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Location: {selectedHolder.shelf}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedHolder(null)}
                    className="p-1.5 hover:bg-muted rounded-full"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                {!selectedFolder ? (
                  /* Select Folder */
                  <div className="space-y-4 flex-1 overflow-y-auto">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Select Folder / Category File</p>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedHolder.folders.map((folder: string) => {
                        const count = getFilteredDocs(selectedHolder.shelf, selectedHolder.code, folder).length;
                        return (
                          <button
                            key={folder}
                            onClick={() => setSelectedFolder(folder)}
                            className="p-3 border border-border/40 rounded-xl bg-muted/10 hover:bg-muted/40 transition-all text-left flex justify-between items-center group"
                          >
                            <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">{folder}</span>
                            <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{count} files</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* List Documents in Selected Folder */
                  <div className="space-y-4 flex-1 flex flex-col min-h-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <button onClick={() => setSelectedFolder(null)} className="hover:text-foreground font-semibold">Folders</button>
                      <span>→</span>
                      <span className="text-foreground font-semibold truncate">{selectedFolder}</span>
                    </div>

                    <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                      {getFilteredDocs(selectedHolder.shelf, selectedHolder.code, selectedFolder).length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <p className="text-sm">No files uploaded in this folder.</p>
                          <p className="text-xs opacity-75 mt-1">Files uploaded in general categories matching this path will appear here.</p>
                        </div>
                      ) : (
                        getFilteredDocs(selectedHolder.shelf, selectedHolder.code, selectedFolder).map(doc => (
                          <div 
                            key={doc.id}
                            onClick={() => selectDocument(doc)}
                            className="p-3 bg-muted/20 border border-border/50 hover:bg-muted/50 transition-colors rounded-xl flex items-center justify-between cursor-pointer"
                          >
                            <span className="text-xs font-semibold truncate pr-2">{doc.name}</span>
                            <span>
                              {doc.physicalLocation?.originalPresent ? (
                                <span className="bg-green-500/10 text-green-500 text-[10px] px-2 py-0.5 rounded-full font-bold">In-Vault</span>
                              ) : (
                                <span className="bg-red-500/10 text-red-500 text-[10px] px-2 py-0.5 rounded-full font-bold">Borrowed</span>
                              )}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Document Detail Inspector */}
            {selectedDoc && (
              <div className="glass-panel p-6 rounded-2xl flex-1 flex flex-col relative">
                
                <button 
                  onClick={() => setSelectedDoc(null)}
                  className="absolute right-4 top-4 p-1.5 hover:bg-muted rounded-full"
                >
                  <X className="h-4 w-4" />
                </button>

                <h3 className="text-lg font-bold mb-1 truncate pr-8">{selectedDoc.name}</h3>
                <p className="text-xs text-muted-foreground mb-4">Category: {selectedDoc.category}</p>

                {/* Location Breadcrumbs */}
                {selectedDoc.physicalLocation && (
                  <div className="p-3 bg-muted/30 border border-border/50 rounded-xl text-xs mb-6">
                    <span className="font-semibold text-muted-foreground block mb-1">📍 Physical Location Code</span>
                    <span className="text-primary font-bold">
                      {selectedDoc.physicalLocation.almirahId} → {selectedDoc.physicalLocation.shelf} → {selectedDoc.physicalLocation.holder} → {selectedDoc.physicalLocation.folder}
                    </span>
                  </div>
                )}

                {/* Availability status */}
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-bold text-muted-foreground">Original Copy Availability</span>
                  {selectedDoc.physicalLocation?.originalPresent ? (
                    <span className="bg-green-500/10 text-green-500 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 border border-green-500/20">
                      <CheckCircle className="h-4 w-4" /> Present inside cupboard
                    </span>
                  ) : (
                    <span className="bg-red-500/10 text-red-500 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 border border-red-500/20">
                      <XCircle className="h-4 w-4" /> Borrowed / Checked-Out
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mb-6">
                  {selectedDoc.physicalLocation?.originalPresent ? (
                    <button 
                      onClick={() => setIsCheckOutOpen(true)}
                      className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl font-bold hover:bg-primary/95 transition-all text-xs shadow-md"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                      Check Out Original
                    </button>
                  ) : (
                    <button 
                      onClick={() => setIsCheckInOpen(true)}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 transition-all text-xs shadow-md"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Check In Original
                    </button>
                  )}
                </div>

                {/* Borrower details */}
                {!selectedDoc.physicalLocation?.originalPresent && selectedDoc.physicalLocation?.lastBorrowedBy && (
                  <div className="mb-6 p-4 bg-red-500/5 border border-red-500/20 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="font-semibold text-muted-foreground">Borrowed By:</span>
                      <span className="font-bold text-foreground">{selectedDoc.physicalLocation.lastBorrowedBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-muted-foreground">Borrowed At:</span>
                      <span className="font-bold text-foreground">
                        {new Date(selectedDoc.physicalLocation.lastBorrowedAt!).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Audit Logs */}
                <div className="flex-1 flex flex-col pt-4 border-t border-border/80">
                  <h4 className="font-bold text-xs mb-3 text-muted-foreground uppercase tracking-wide">Activity Logs</h4>
                  <div className="flex-1 overflow-y-auto space-y-3 max-h-[220px]">
                    {docLogs.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No activity recorded yet.</p>
                    ) : (
                      docLogs.map(log => (
                        <div key={log.id} className="p-3 bg-muted/15 border border-border/40 rounded-xl text-xs space-y-1">
                          <div className="flex justify-between items-center font-bold">
                            <span className={log.actionType === 'CHECK_IN' ? 'text-green-600 dark:text-green-400' : log.actionType === 'CHECK_OUT' ? 'text-red-600 dark:text-red-400' : 'text-primary'}>
                              {log.actionType}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-normal">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {log.borrowerName && (
                            <p className="text-muted-foreground"><span className="font-medium text-foreground">Borrower:</span> {log.borrowerName}</p>
                          )}
                          {log.notes && (
                            <p className="text-muted-foreground italic">"{log.notes}"</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* Prompt when nothing selected */}
            {!selectedHolder && !selectedDoc && (
              <div className="glass-panel p-12 rounded-2xl flex-1 flex flex-col justify-center items-center text-center text-muted-foreground">
                <AlmirahIcon className="h-16 w-16 mb-4 opacity-15" />
                <p className="font-medium text-sm">Select a shelf and a holder file to begin browsing.</p>
                <p className="text-xs opacity-75 mt-1">Or search directly using the bar above.</p>
              </div>
            )}

          </div>

        </div>
      )}

      {/* Check Out Modal */}
      {isCheckOutOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsCheckOutOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold mb-4">Check Out Physical Copy</h3>
            <p className="text-xs text-muted-foreground mb-6">Record who is borrowing the original copy of <strong>{selectedDoc.name}</strong>.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-2">BORROWER NAME</label>
                {familyMembers.length > 0 ? (
                  <select
                    value={borrowerName}
                    onChange={(e) => setBorrowerName(e.target.value)}
                    className="w-full p-3 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none text-sm text-foreground"
                  >
                    {familyMembers.map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type="text" 
                    value={borrowerName} 
                    onChange={(e) => setBorrowerName(e.target.value)} 
                    placeholder="e.g. Father, Sister"
                    className="w-full p-3 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none text-sm text-foreground"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-2">REASON / NOTES</label>
                <textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="Reason for borrowing..."
                  rows={3}
                  className="w-full p-3 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none text-sm text-foreground"
                />
              </div>
              <button 
                onClick={handleCheckOut}
                disabled={!borrowerName}
                className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 text-sm shadow-md transition-all disabled:opacity-50"
              >
                Confirm Borrow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check In Modal */}
      {isCheckInOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsCheckInOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold mb-4">Check In / Return Document</h3>
            <p className="text-xs text-muted-foreground mb-6">Confirm return of the original copy of <strong>{selectedDoc.name}</strong> to the designated location.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-2">RETURN NOTES</label>
                <textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="Check-in comments, file condition..."
                  rows={3}
                  className="w-full p-3 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none text-sm text-foreground"
                />
              </div>
              <button 
                onClick={handleCheckIn}
                className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 text-sm shadow-md transition-all"
              >
                Confirm Return to Almirah
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
