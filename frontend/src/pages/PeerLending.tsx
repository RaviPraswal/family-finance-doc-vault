import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useToastStore } from '../store/toastStore';
import { useConfirmStore } from '../store/confirmStore';
import { Plus, Trash2, ArrowRightLeft, Download, Printer, Search, FileText } from 'lucide-react';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';


interface PeerLending {
  id: string;
  type: string;
  personName: string;
  ownerName: string;
  amount: number;
  date: string;
  expectedReturnDate: string;
  settled: boolean;
}

export default function PeerLending() {
  const toast = useToastStore();
  const confirm = useConfirmStore();
  const [lendings, setLendings] = useState<PeerLending[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<PeerLending>>({
    type: 'GIVEN',
    personName: '',
    ownerName: '',
    amount: 0,
    date: '',
    expectedReturnDate: '',
    settled: false
  });

  // Filter States
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterPerson, setFilterPerson] = useState('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  
  // Sort States
  const [sortField, setSortField] = useState<'dueDate' | 'amount' | 'personName'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // View States
  const [viewMode, setViewMode] = useState<'card' | 'list' | 'detailed'>('list');
  const [selectedLendingId, setSelectedLendingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    fetchLendings();
    fetchExpenses();
  }, []);

  const fetchLendings = async () => {
    try {
      const data = await apiClient('/api/peerlendings');
      setLendings(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchExpenses = async () => {
    try {
      const data = await apiClient('/api/expenses');
      setExpenses(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/api/peerlendings', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setIsModalOpen(false);
      setFormData({ type: 'GIVEN', personName: '', ownerName: '', amount: 0, date: '', expectedReturnDate: '', settled: false });
      toast.success('Record saved', 'Udhaar record has been added successfully.');
      fetchLendings();
    } catch (err: any) {
      toast.error('Failed to save record', err.message || 'Could not save. Please try again.');
    }
  };

  const handleToggleSettled = async (lending: PeerLending) => {
    try {
      await apiClient(`/api/peerlendings/${lending.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...lending, settled: !lending.settled })
      });
      toast.success(
        `Marked as ${!lending.settled ? 'Settled' : 'Pending'}`,
        `${lending.personName}'s record updated successfully.`
      );
      fetchLendings();
    } catch (err: any) {
      toast.error('Failed to update status', err.message || 'Could not update record.');
    }
  };

  const handleDelete = async (id: string) => {
    confirm.show({
      title: 'Delete Record',
      message: 'Are you sure you want to delete this udhaar record? This action cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          await apiClient(`/api/peerlendings/${id}`, { method: 'DELETE' });
          toast.success('Record deleted', 'The udhaar record has been removed.');
          fetchLendings();
        } catch (err: any) {
          toast.error('Cannot delete record', err.message || 'Failed to delete record.');
        }
      },
    });
  };

  // Reset page size
  useEffect(() => {
    setItemsPerPage(viewMode === 'card' ? 6 : 15);
    setCurrentPage(1);
  }, [viewMode]);

  // Select first lending if none selected
  useEffect(() => {
    if (lendings.length > 0 && !selectedLendingId) {
      setSelectedLendingId(lendings[0].id);
    }
  }, [lendings, selectedLendingId]);

  const isLendingOverdue = useCallback((lending: PeerLending) => {
    if (lending.settled) return false;
    if (!lending.expectedReturnDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expectedDate = new Date(lending.expectedReturnDate);
    expectedDate.setHours(0, 0, 0, 0);
    return expectedDate.getTime() < today.getTime();
  }, []);

  // Filter dataset
  const filteredLendings = lendings.filter(item => {
    const matchesSearch = item.personName.toLowerCase().includes(search.toLowerCase()) || 
                          (item.ownerName && item.ownerName.toLowerCase().includes(search.toLowerCase()));
    
    const matchesPerson = filterPerson === 'ALL' || item.personName === filterPerson;
    
    let matchesDate = true;
    if (filterStartDate) {
      matchesDate = matchesDate && new Date(item.date) >= new Date(filterStartDate);
    }
    if (filterEndDate) {
      matchesDate = matchesDate && new Date(item.date) <= new Date(filterEndDate);
    }
    
    const isOverdue = isLendingOverdue(item);
    let matchesStatus = true;
    if (filterStatus === 'SETTLED') {
      matchesStatus = item.settled;
    } else if (filterStatus === 'PENDING') {
      matchesStatus = !item.settled && !isOverdue;
    } else if (filterStatus === 'OVERDUE') {
      matchesStatus = isOverdue;
    }
    
    return matchesSearch && matchesPerson && matchesDate && matchesStatus;
  });

  // Sort dataset (Rule 6: Overdue floats to top)
  const sortedLendings = [...filteredLendings].sort((a, b) => {
    const aOverdue = isLendingOverdue(a);
    const bOverdue = isLendingOverdue(b);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    let comparison = 0;
    if (sortField === 'dueDate') {
      const aDate = a.expectedReturnDate ? new Date(a.expectedReturnDate).getTime() : 0;
      const bDate = b.expectedReturnDate ? new Date(b.expectedReturnDate).getTime() : 0;
      comparison = aDate - bDate;
    } else if (sortField === 'amount') {
      comparison = a.amount - b.amount;
    } else if (sortField === 'personName') {
      comparison = a.personName.localeCompare(b.personName);
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const selectedLending = lendings.find(l => l.id === selectedLendingId) || lendings[0];

  // Pagination calculations
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLendings = sortedLendings.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(sortedLendings.length / itemsPerPage);

  // Summary Metrics calculations
  const totalGivenSum = filteredLendings.filter(l => l.type === 'GIVEN').reduce((sum, l) => sum + l.amount, 0);
  const totalPendingSum = filteredLendings.filter(l => !l.settled && !isLendingOverdue(l)).reduce((sum, l) => sum + l.amount, 0);
  const totalOverdueSum = filteredLendings.filter(l => !l.settled && isLendingOverdue(l)).reduce((sum, l) => sum + l.amount, 0);
  const totalReceivedSum = filteredLendings.filter(l => l.type === 'GIVEN' && l.settled).reduce((sum, l) => sum + l.amount, 0);
  
  const outstandingGiven = filteredLendings.filter(l => l.type === 'GIVEN' && !l.settled).reduce((sum, l) => sum + l.amount, 0);
  const outstandingTaken = filteredLendings.filter(l => l.type === 'TAKEN' && !l.settled).reduce((sum, l) => sum + l.amount, 0);
  const netOutstanding = outstandingGiven - outstandingTaken;

  const countPending = filteredLendings.filter(l => !l.settled && !isLendingOverdue(l)).length;
  const countOverdue = filteredLendings.filter(l => !l.settled && isLendingOverdue(l)).length;
  const countSettled = filteredLendings.filter(l => l.settled).length;

  const uniquePersons = Array.from(new Set(lendings.map(l => l.personName)));

  // Export handlers
  const handleExportCSV = () => {
    const headers = ['Person', 'Type', 'Amount (INR)', 'Date', 'Expected Return', 'Status'];
    const exportData = sortedLendings.map(l => [
      l.personName,
      l.type,
      l.amount,
      l.date,
      l.expectedReturnDate,
      l.settled ? 'Settled' : (isLendingOverdue(l) ? 'Overdue' : 'Pending')
    ]);
    exportToCSV(exportData, headers, 'Udhaar_Report');
  };

  const handleExportPDF = () => {
    const headers = ['Person', 'Type', 'Amount', 'Date', 'Expected Return', 'Status'];
    const exportData = sortedLendings.map(l => [
      l.personName,
      l.type === 'GIVEN' ? 'Given (Lent)' : 'Taken (Borrowed)',
      `₹${l.amount.toLocaleString()}`,
      new Date(l.date).toLocaleDateString(),
      new Date(l.expectedReturnDate).toLocaleDateString(),
      l.settled ? 'Settled' : (isLendingOverdue(l) ? 'Overdue' : 'Pending')
    ]);
    exportToPDF('Udhaar (Peer Lending) Report', headers, exportData, 'Udhaar_Report');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Udhaar (Given & Taken)</h1>
          <p className="text-sm text-muted-foreground">Manage peer-to-peer loans, expectations and settlement statuses</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'card' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              title="Card View"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              title="List View (Table)"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'detailed' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              title="Detailed View"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 text-sm"
          >
            <Plus className="h-4 w-4" /> Add Record
          </button>
        </div>
      </div>

      {/* Rule 1: Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Total Given</span>
          <p className="text-lg font-mono font-bold text-foreground mt-1 tabular-nums">₹{totalGivenSum.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Total Pending</span>
          <p className="text-lg font-mono font-bold text-foreground mt-1 tabular-nums">₹{totalPendingSum.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-border/50 bg-gradient-to-br from-red-500/5 to-transparent">
          <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider block">Total Overdue</span>
          <p className="text-lg font-mono font-bold text-red-500 mt-1 tabular-nums">₹{totalOverdueSum.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Total Received</span>
          <p className="text-lg font-mono font-bold text-foreground mt-1 tabular-nums">₹{totalReceivedSum.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Net Outstanding</span>
          <p className={`text-lg font-mono font-bold mt-1 tabular-nums ${netOutstanding >= 0 ? 'text-green-500' : 'text-rose-500'}`}>
            ₹{netOutstanding.toLocaleString()}
          </p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Count by Status</span>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            <span className="text-[9px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded font-bold">P: {countPending}</span>
            <span className="text-[9px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded font-bold">O: {countOverdue}</span>
            <span className="text-[9px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded font-bold">S: {countSettled}</span>
          </div>
        </div>
      </div>

      {/* Rule 3: Search + Filter + Sort Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-card/30 p-3 rounded-xl border border-border/50">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-background/50 border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none text-foreground w-48 transition-all"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-background/50 border border-border rounded-lg text-sm text-foreground outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Only</option>
            <option value="OVERDUE">Overdue Only</option>
            <option value="SETTLED">Settled Only</option>
          </select>

          <select
            value={filterPerson}
            onChange={(e) => setFilterPerson(e.target.value)}
            className="px-3 py-1.5 bg-background/50 border border-border rounded-lg text-sm text-foreground outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
          >
            <option value="ALL">All Persons</option>
            {uniquePersons.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <div className="flex items-center gap-1">
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="px-2 py-1.5 bg-background/50 border border-border rounded-lg text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
              placeholder="Start Date"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="px-2 py-1.5 bg-background/50 border border-border rounded-lg text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
              placeholder="End Date"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Rule 9: Export Buttons */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg text-xs font-medium border border-border/50 transition-all cursor-pointer"
            title="Export CSV"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg text-xs font-medium border border-border/50 transition-all cursor-pointer"
            title="Export PDF/Print"
          >
            <Printer className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      </div>

      {lendings.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground bg-card border border-border rounded-lg">
          No Udhaar records found. Track money lent to friends or taken from relatives here.
        </div>
      ) : viewMode === 'card' ? (
        /* Card View */
        <div className="space-y-6 flex-1 flex flex-col min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-1">
            {paginatedLendings.map((lending) => {
              const isGiven = lending.type === 'GIVEN';
              const isOverdue = isLendingOverdue(lending);
              return (
                <div key={lending.id} className={`p-4 rounded-xl shadow-sm border flex flex-col justify-between hover:shadow-md transition-shadow ${lending.settled ? 'bg-background border-border opacity-75' : 'bg-card border-border/50'}`}>
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${isGiven ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          <ArrowRightLeft className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-foreground">{lending.personName}</h3>
                          <p className={`text-[10px] font-bold uppercase ${isGiven ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isGiven ? 'Given' : 'Taken'}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(lending.id)} className="text-muted-foreground hover:text-red-500 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-border/50">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Amount</p>
                        <p className="text-base font-mono font-bold text-foreground tabular-nums">₹{lending.amount.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase font-medium mb-0.5">Status</p>
                        <button 
                          onClick={() => handleToggleSettled(lending)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            lending.settled 
                              ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                              : isOverdue 
                                ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                                : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                          }`}
                        >
                          {lending.settled ? 'Settled ✓' : isOverdue ? 'Settle (Overdue)' : 'Settle'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span className="font-medium text-foreground font-mono tabular-nums">{new Date(lending.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expected Return:</span>
                        <span className={`font-semibold font-mono tabular-nums ${isOverdue ? 'text-red-500' : 'text-foreground'}`}>
                          {new Date(lending.expectedReturnDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {sortedLendings.length > 0 && (
            <div className="flex items-center justify-between border-t border-border/50 pt-3 mt-4">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages <= 1}
                  className="relative ml-3 inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{' '}
                    <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, sortedLendings.length)}</span> of{' '}
                    <span className="font-semibold text-foreground">{sortedLendings.length}</span> results
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Show</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-card border border-border text-foreground text-xs outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all cursor-pointer"
                    >
                      <option value={6}>6 cards</option>
                      <option value={12}>12 cards</option>
                      <option value={24}>24 cards</option>
                    </select>
                  </div>
                </div>
                {totalPages > 1 && (
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-xs" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-border bg-card hover:bg-muted disabled:opacity-50"
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                        </svg>
                      </button>
                      {Array.from({ length: totalPages }).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentPage(idx + 1)}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-border focus:z-20 ${
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
                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-border bg-card hover:bg-muted disabled:opacity-50"
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
      ) : viewMode === 'list' ? (
        /* List View (Table) - DEFAULT */
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="overflow-auto custom-scrollbar flex-1">
              <table className="min-w-full divide-y divide-border/20 dense-table">
                <thead className="bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th 
                      onClick={() => {
                        if (sortField === 'personName') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        else { setSortField('personName'); setSortOrder('asc'); }
                      }}
                      className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80 transition-colors select-none"
                    >
                      Person {sortField === 'personName' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      Type
                    </th>
                    <th 
                      onClick={() => {
                        if (sortField === 'amount') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        else { setSortField('amount'); setSortOrder('asc'); }
                      }}
                      className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80 transition-colors select-none"
                    >
                      Amount {sortField === 'amount' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      Date
                    </th>
                    <th 
                      onClick={() => {
                        if (sortField === 'dueDate') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        else { setSortField('dueDate'); setSortOrder('asc'); }
                      }}
                      className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80 transition-colors select-none"
                    >
                      Expected Return {sortField === 'dueDate' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card/50 divide-y divide-border/20">
                  {paginatedLendings.map((lending, idx) => {
                    const isGiven = lending.type === 'GIVEN';
                    const isOverdue = isLendingOverdue(lending);
                    return (
                      <tr 
                        key={lending.id} 
                        className={`hover:bg-muted/30 transition-colors group ${idx % 2 === 0 ? 'bg-background/20' : 'bg-card/10'}`}
                      >
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <div className="flex items-center">
                            <ArrowRightLeft className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                            <span className="font-medium text-foreground text-sm">{lending.personName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-xs">
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${isGiven ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {isGiven ? 'Given' : 'Taken'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap font-mono font-bold text-foreground text-sm tabular-nums">
                          ₹{lending.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted-foreground font-mono tabular-nums">
                          {new Date(lending.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted-foreground font-mono tabular-nums">
                          <span className={isOverdue ? 'text-red-500 font-bold' : ''}>
                            {new Date(lending.expectedReturnDate).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-xs">
                          <button 
                            onClick={() => handleToggleSettled(lending)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              lending.settled 
                                ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                                : isOverdue 
                                  ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                                  : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                            }`}
                          >
                            {lending.settled ? 'Settled ✓' : isOverdue ? 'Settle (Overdue)' : 'Settle'}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right text-xs font-medium">
                          {/* Reveal on hover */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                            <button 
                              onClick={() => handleDelete(lending.id)} 
                              className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                              title="Delete Record"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {sortedLendings.length > 0 && (
              <div className="flex items-center justify-between border-t border-border/50 p-3 bg-muted/10">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages <= 1}
                    className="relative ml-3 inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-muted-foreground">
                      Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{' '}
                      <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, sortedLendings.length)}</span> of{' '}
                      <span className="font-semibold text-foreground">{sortedLendings.length}</span> results
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Show</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-card border border-border text-foreground text-xs outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all cursor-pointer"
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
                          className="relative inline-flex items-center rounded-l-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-border bg-card hover:bg-muted disabled:opacity-50"
                        >
                          <span className="sr-only">Previous</span>
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                          </svg>
                        </button>
                        {Array.from({ length: totalPages }).map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentPage(idx + 1)}
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-border focus:z-20 ${
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
                          className="relative inline-flex items-center rounded-r-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-border bg-card hover:bg-muted disabled:opacity-50"
                        >
                          <span className="sr-only">Next</span>
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
      ) : (
        /* Detailed Split-Pane View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
          <div className="lg:col-span-4 space-y-2 overflow-y-auto h-[calc(100vh-16rem)] pr-2 custom-scrollbar">
            {sortedLendings.map((lending) => {
              const isGiven = lending.type === 'GIVEN';
              const isOverdue = isLendingOverdue(lending);
              return (
                <div
                  key={lending.id}
                  onClick={() => setSelectedLendingId(lending.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedLending?.id === lending.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:bg-muted/50 bg-card'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${isGiven ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        <ArrowRightLeft className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-xs text-foreground">{lending.personName}</h4>
                        <p className="text-[10px] text-muted-foreground">{isGiven ? 'Given' : 'Taken'}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(lending.id);
                      }}
                      className="text-muted-foreground hover:text-red-500 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex justify-between items-baseline">
                    <span className="text-[10px] font-mono font-bold text-foreground tabular-nums">₹{lending.amount.toLocaleString()}</span>
                    <span className={`text-[10px] font-bold uppercase ${
                      lending.settled 
                        ? 'text-green-500' 
                        : isOverdue 
                          ? 'text-red-500' 
                          : 'text-yellow-500'
                    }`}>
                      {lending.settled ? 'Settled' : isOverdue ? 'Overdue' : 'Pending'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-8 bg-card border border-border/50 rounded-2xl p-4 flex flex-col h-[calc(100vh-16rem)] overflow-hidden">
            {selectedLending ? (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="border-b border-border/50 pb-3 mb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-base text-foreground">Peer Loan with {selectedLending.personName}</h3>
                      <p className="text-xs text-muted-foreground">Type: Udhaar {selectedLending.type === 'GIVEN' ? 'Given (Receivable)' : 'Taken (Payable)'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block uppercase">Principal Amount</span>
                      <span className="text-xl font-mono font-bold text-foreground tabular-nums">₹{selectedLending.amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                  {/* Performance Indicators */}
                  <div className="grid grid-cols-3 gap-4 bg-muted/30 p-3 rounded-xl">
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase">Date Logged</span>
                      <span className="text-xs font-semibold text-foreground font-mono tabular-nums">{new Date(selectedLending.date).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase">Expected Settlement</span>
                      <span className={`text-xs font-semibold font-mono tabular-nums ${isLendingOverdue(selectedLending) ? 'text-red-500' : 'text-foreground'}`}>
                        {new Date(selectedLending.expectedReturnDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase mb-0.5">Settled Status</span>
                      <button 
                        onClick={() => handleToggleSettled(selectedLending)}
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                          selectedLending.settled 
                            ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                            : isLendingOverdue(selectedLending)
                              ? 'bg-red-500/10 text-red-500 border-red-500/20'
                              : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                        }`}
                      >
                        {selectedLending.settled ? 'Settled ✓' : isLendingOverdue(selectedLending) ? 'Settle (Overdue)' : 'Settle Loan'}
                      </button>
                    </div>
                  </div>

                  {/* Transaction log */}
                  <div>
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Installment & Repayment Ledger</h4>
                    <div className="space-y-1.5">
                      {expenses.filter((e) => e.linkedPeerLending?.id === selectedLending.id).length === 0 ? (
                        <div className="text-center py-6 bg-background/20 rounded-xl border border-border/50">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                          <p className="text-xs text-muted-foreground">No payments or adjustments logged for this peer transaction.</p>
                        </div>
                      ) : (
                        expenses
                          .filter((e) => e.linkedPeerLending?.id === selectedLending.id)
                          .map((exp) => {
                            const isGiven = selectedLending.type === 'GIVEN';
                            const isRepayment = isGiven ? exp.type === 'CREDIT' : exp.type === 'DEBIT';
                            return (
                              <div
                                key={exp.id}
                                className="flex justify-between items-center p-2 rounded-lg border border-border/30 bg-background/50 hover:bg-background/80 transition-colors"
                              >
                                <div>
                                  <div className="font-semibold text-xs text-foreground">{exp.category}</div>
                                  <div className="text-[10px] text-muted-foreground font-mono tabular-nums">{exp.expenseDate}</div>
                                  {exp.description && <p className="text-[10px] text-muted-foreground italic mt-0.5">{exp.description}</p>}
                                </div>
                                <span className={`font-bold text-xs font-mono tabular-nums ${isRepayment ? 'text-green-500' : 'text-red-500'}`}>
                                  {isRepayment ? '+' : '-'}₹{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <ArrowRightLeft className="h-10 w-10 stroke-1 mb-2 opacity-50" />
                <p className="text-xs">Select an udhaar record on the left to view metrics and inflows.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Add Udhaar Record</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center text-sm text-foreground">
                    <input type="radio" checked={formData.type === 'GIVEN'} onChange={() => setFormData({...formData, type: 'GIVEN'})} className="mr-2 accent-primary" />
                    I Gave Udhaar
                  </label>
                  <label className="flex items-center text-sm text-foreground">
                    <input type="radio" checked={formData.type === 'TAKEN'} onChange={() => setFormData({...formData, type: 'TAKEN'})} className="mr-2 accent-primary" />
                    I Took Udhaar
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Person Name</label>
                <input required value={formData.personName} onChange={e => setFormData({...formData, personName: e.target.value})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Amount (₹)</label>
                <input required type="number" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" placeholder="0.00" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Date</label>
                  <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Expected Return</label>
                  <input required type="date" value={formData.expectedReturnDate} onChange={e => setFormData({...formData, expectedReturnDate: e.target.value})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
