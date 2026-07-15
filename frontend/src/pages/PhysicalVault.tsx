import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Landmark as AlmirahIcon, Search, CheckCircle, XCircle, ArrowLeftRight, X 
} from 'lucide-react';

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
  const [tab, setTab] = useState<'almirah' | 'stats'>('almirah');

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

  useEffect(() => {
    fetchDocuments();
    fetchStats();
    fetchFamilyMembers();
  }, []);

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
      
      // Refresh
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
      
      // Refresh
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

  // Searching logic
  const searchResults = documents.filter(doc => {
    if (!searchQuery) return false;
    const query = searchQuery.toLowerCase();
    
    const matchesName = doc.name.toLowerCase().includes(query);
    const matchesTags = doc.tags?.some(t => t.toLowerCase().includes(query)) || false;
    const matchesCategory = doc.category.toLowerCase().includes(query);
    const matchesDescription = doc.description?.toLowerCase().includes(query) || false;
    
    // Check location hierarchy matches
    const loc = doc.physicalLocation;
    const matchesLoc = loc ? (
      loc.shelf.toLowerCase().includes(query) ||
      loc.holder.toLowerCase().includes(query) ||
      loc.folder.toLowerCase().includes(query) ||
      (loc.subFolder && loc.subFolder.toLowerCase().includes(query))
    ) : false;

    return matchesName || matchesTags || matchesCategory || matchesDescription || matchesLoc;
  });

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
      ) : (
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
                              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center font-semibold transition-all hover:scale-105 hover:shadow-md ${holder.color} ${selectedHolder?.code === holder.code ? 'ring-2 ring-primary border-transparent' : ''}`}
                            >
                              <span className="text-2xl mb-1">{holder.icon}</span>
                              <span className="text-xs tracking-tight">{holder.name}</span>
                              <span className="text-[10px] mt-1 opacity-70">({getHolderDocsCount('Shelf 1', holder.code)} files)</span>
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
                      <span className="flex items-center gap-2">👨‍👩‍👧‍👦 Shelf 2 – Family Member Zone</span>
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
                          className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3 bg-muted/10 border-t border-border/50"
                        >
                          {shelf2Holders.map(holder => (
                            <button
                              key={holder.code}
                              onClick={() => {
                                setSelectedHolder({ ...holder, shelf: 'Shelf 2' });
                                setSelectedFolder(null);
                              }}
                              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center font-semibold transition-all hover:scale-105 hover:shadow-md ${holder.color} ${selectedHolder?.code === holder.code ? 'ring-2 ring-primary border-transparent' : ''}`}
                            >
                              <span className="text-2xl mb-1">{holder.icon}</span>
                              <span className="text-xs tracking-tight">{holder.name}</span>
                              <span className="text-[10px] mt-1 opacity-70">({getHolderDocsCount('Shelf 2', holder.code)} files)</span>
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
                      <span className="flex items-center gap-2">🏢 Shelf 3 – Wealth & Archive Zone</span>
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
                          className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3 bg-muted/10 border-t border-border/50"
                        >
                          {SHELF_3_HOLDERS.map(holder => (
                            <button
                              key={holder.code}
                              onClick={() => {
                                setSelectedHolder({ ...holder, shelf: 'Shelf 3' });
                                setSelectedFolder(null);
                              }}
                              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center font-semibold transition-all hover:scale-105 hover:shadow-md ${holder.color} ${selectedHolder?.code === holder.code ? 'ring-2 ring-primary border-transparent' : ''}`}
                            >
                              <span className="text-2xl mb-1">{holder.icon}</span>
                              <span className="text-xs tracking-tight">{holder.name}</span>
                              <span className="text-[10px] mt-1 opacity-70">({getHolderDocsCount('Shelf 3', holder.code)} files)</span>
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

          {/* Right Column: Dynamic Explorer Panel */}
          <div className="lg:col-span-5 flex flex-col space-y-6">
            
            {/* If holder chosen, list categories/folders */}
            {selectedHolder && !selectedDoc && (
              <div className="glass-panel p-6 rounded-2xl flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <span>{selectedHolder.icon}</span>
                    <span>{selectedHolder.name}</span>
                  </h3>
                  <button 
                    onClick={() => {
                      setSelectedHolder(null);
                      setSelectedFolder(null);
                    }}
                    className="p-1.5 hover:bg-muted rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Subfolder list */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {selectedHolder.folders.map((folder: string) => {
                    const count = getFilteredDocs(selectedHolder.shelf, selectedHolder.code, folder).length;
                    return (
                      <button
                        key={folder}
                        onClick={() => setSelectedFolder(folder)}
                        className={`flex justify-between items-center px-4 py-3 rounded-xl border text-sm font-semibold transition-all hover:bg-muted/40 ${selectedFolder === folder ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}
                      >
                        <span>📂 {folder}</span>
                        <span className="text-xs opacity-75">({count})</span>
                      </button>
                    );
                  })}
                </div>

                {/* Document List for selected subfolder */}
                {selectedFolder && (
                  <div className="flex-1 flex flex-col border-t border-border/80 pt-4">
                    <h4 className="font-bold text-sm mb-3">Documents in: {selectedFolder}</h4>
                    
                    <div className="flex-1 space-y-2 overflow-y-auto max-h-[300px]">
                      {getFilteredDocs(selectedHolder.shelf, selectedHolder.code, selectedFolder).length === 0 ? (
                        <p className="text-xs text-muted-foreground py-4 text-center">No documents in this folder yet.</p>
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
