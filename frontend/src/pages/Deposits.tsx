import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useToastStore } from '../store/toastStore';
import { useConfirmStore } from '../store/confirmStore';
import { Plus, Wallet, Trash2, Search, Download, Printer, FileText } from 'lucide-react';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';

interface Deposit {
  id: string;
  type: string;
  institution: string;
  accountHolderName: string;
  principalAmount: number;
  maturityAmount: number;
  interestRate: number;
  startDate: string;
  maturityDate: string;
}

export default function Deposits() {
  const toast = useToastStore();
  const confirm = useConfirmStore();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Deposit>>({
    type: 'FD',
    institution: '',
    accountHolderName: '',
    principalAmount: 0,
    maturityAmount: 0,
    interestRate: 0,
    startDate: '',
    maturityDate: ''
  });

  // Filter States
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, ACTIVE, MATURED

  // Sort States
  const [sortField, setSortField] = useState<'institution' | 'principal' | 'maturityDate'>('maturityDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // View States
  const [viewMode, setViewMode] = useState<'card' | 'list' | 'detailed'>('list');
  const [selectedDepositId, setSelectedDepositId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    fetchDeposits();
    fetchExpenses();
  }, []);

  const fetchDeposits = async () => {
    try {
      const data = await apiClient('/api/deposits');
      setDeposits(data);
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
      await apiClient('/api/deposits', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setIsModalOpen(false);
      setFormData({ type: 'FD', institution: '', accountHolderName: '', principalAmount: 0, maturityAmount: 0, interestRate: 0, startDate: '', maturityDate: '' });
      toast.success('Deposit saved', 'Your deposit record has been added successfully.');
      fetchDeposits();
    } catch (err: any) {
      toast.error('Failed to save deposit', err.message || 'Could not save deposit. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    confirm.show({
      title: 'Delete Deposit',
      message: 'Are you sure you want to delete this deposit? This action cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          await apiClient(`/api/deposits/${id}`, { method: 'DELETE' });
          toast.success('Deposit deleted', 'The deposit record has been removed.');
          fetchDeposits();
        } catch (err: any) {
          toast.error('Cannot delete deposit', err.message || 'Failed to delete deposit.');
        }
      },
    });
  };

  // Reset page when switching view mode
  useEffect(() => {
    setItemsPerPage(viewMode === 'card' ? 6 : 15);
    setCurrentPage(1);
  }, [viewMode]);

  // Select first deposit if none is selected
  useEffect(() => {
    if (deposits.length > 0 && !selectedDepositId) {
      setSelectedDepositId(deposits[0].id);
    }
  }, [deposits, selectedDepositId]);

  const selectedDeposit = deposits.find(d => d.id === selectedDepositId) || deposits[0];

  const getDepositStatus = useCallback((d: Deposit) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maturity = new Date(d.maturityDate);
    maturity.setHours(0, 0, 0, 0);
    return maturity < today ? 'MATURED' : 'ACTIVE';
  }, []);

  // Filter dataset
  const filteredDeposits = deposits.filter(d => {
    const matchesSearch = d.institution.toLowerCase().includes(search.toLowerCase()) || 
                          d.accountHolderName.toLowerCase().includes(search.toLowerCase()) ||
                          d.type.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'ALL' || d.type === filterType;
    
    let matchesStatus = true;
    const status = getDepositStatus(d);
    if (filterStatus === 'ACTIVE') {
      matchesStatus = status === 'ACTIVE';
    } else if (filterStatus === 'MATURED') {
      matchesStatus = status === 'MATURED';
    }

    return matchesSearch && matchesType && matchesStatus;
  });

  // Sort dataset
  const sortedDeposits = [...filteredDeposits].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'institution') {
      comparison = a.institution.localeCompare(b.institution);
    } else if (sortField === 'principal') {
      comparison = a.principalAmount - b.principalAmount;
    } else if (sortField === 'maturityDate') {
      const aTime = new Date(a.maturityDate).getTime();
      const bTime = new Date(b.maturityDate).getTime();
      comparison = aTime - bTime;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Pagination calculations
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDeposits = sortedDeposits.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(sortedDeposits.length / itemsPerPage);

  const activeDeps = deposits.filter(d => getDepositStatus(d) === 'ACTIVE');
  const maturedDeps = deposits.filter(d => getDepositStatus(d) === 'MATURED');

  const totalPrincipalInvested = activeDeps.reduce((sum, d) => sum + d.principalAmount, 0);
  const totalMaturityValue = activeDeps.reduce((sum, d) => sum + d.maturityAmount, 0);
  
  const activeCount = activeDeps.length;
  const maturedCount = maturedDeps.length;
  
  const monthlyRdContribution = activeDeps
    .filter(d => d.type === 'RD')
    .reduce((sum, d) => sum + d.principalAmount, 0);

  // Exporters
  const handleExportCSV = () => {
    const headers = ['Institution', 'Type', 'Holder', 'Principal', 'Maturity Amount', 'Interest Rate', 'Start Date', 'Maturity Date'];
    const exportData = sortedDeposits.map(d => [
      d.institution,
      d.type,
      d.accountHolderName,
      d.principalAmount,
      d.maturityAmount,
      d.interestRate,
      d.startDate,
      d.maturityDate
    ]);
    exportToCSV(exportData, headers, 'Deposits_Report');
  };

  const handleExportPDF = () => {
    const headers = ['Institution', 'Type', 'Holder', 'Principal', 'Maturity Value', 'Interest', 'Start Date', 'Maturity'];
    const exportData = sortedDeposits.map(d => [
      d.institution,
      d.type,
      d.accountHolderName,
      `₹${d.principalAmount.toLocaleString()}`,
      `₹${d.maturityAmount.toLocaleString()}`,
      `${d.interestRate}%`,
      new Date(d.startDate).toLocaleDateString(),
      new Date(d.maturityDate).toLocaleDateString()
    ]);
    exportToPDF('Fixed & Recurring Deposits Register', headers, exportData, 'Deposits_Report');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fixed & Recurring Deposits</h1>
          <p className="text-sm text-muted-foreground">Track maturity progress, interest rates and contributions</p>
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
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Add Deposit
          </button>
        </div>
      </div>

      {/* Rule 1: Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Total Principal Invested</span>
          <p className="text-lg font-mono font-bold text-foreground mt-1 tabular-nums">₹{totalPrincipalInvested.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Est. Maturity Value</span>
          <p className="text-lg font-mono font-bold text-green-500 mt-1 tabular-nums">₹{totalMaturityValue.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Active Deposits</span>
          <p className="text-lg font-mono font-bold text-foreground mt-1 tabular-nums">{activeCount}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Matured / Locked In</span>
          <p className="text-lg font-mono font-bold text-foreground mt-1 tabular-nums">{maturedCount}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Monthly RD Outgo</span>
          <p className="text-lg font-mono font-bold text-foreground mt-1 tabular-nums font-mono">₹{monthlyRdContribution.toLocaleString()}</p>
        </div>
      </div>

      {/* Rule 3: Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-card/30 p-3 rounded-xl border border-border/50">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search deposits..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-background/50 border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none text-foreground w-48 transition-all"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 bg-background/50 border border-border rounded-lg text-sm text-foreground outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
          >
            <option value="ALL">All Deposit Types</option>
            <option value="FD">Fixed Deposit (FD)</option>
            <option value="RD">Recurring Deposit (RD)</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-background/50 border border-border rounded-lg text-sm text-foreground outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
          >
            <option value="ALL">All Maturity Status</option>
            <option value="ACTIVE">Active (Accruing)</option>
            <option value="MATURED">Matured (Completed)</option>
          </select>
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

      {deposits.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground bg-card border border-border rounded-lg">
          No deposits found. Click Add Deposit to begin tracking.
        </div>
      ) : viewMode === 'card' ? (
        /* Card View */
        <div className="space-y-6 flex-1 flex flex-col min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-1">
            {paginatedDeposits.map((dep) => {
              const isMatured = getDepositStatus(dep) === 'MATURED';
              return (
                <div key={dep.id} className="bg-card p-4 rounded-xl border border-border/50 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
                          <Wallet className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-foreground">{dep.institution}</h3>
                          <p className="text-[10px] text-muted-foreground">{dep.type} • {dep.accountHolderName}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(dep.id)} className="text-muted-foreground hover:text-red-500 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-1.5 text-xs border-t border-border/30 pt-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Principal:</span>
                        <span className="font-medium text-foreground font-mono tabular-nums">₹{dep.principalAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Maturity Value:</span>
                        <span className="font-bold text-foreground font-mono tabular-nums">₹{dep.maturityAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Interest Rate:</span>
                        <span className="font-semibold text-foreground font-mono">{dep.interestRate}%</span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-border/20">
                        <span className="text-muted-foreground">Matures On:</span>
                        <span className={`font-semibold ${isMatured ? 'text-red-500' : 'text-foreground'}`}>
                          {new Date(dep.maturityDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {sortedDeposits.length > 0 && (
            <div className="flex items-center justify-between border-t border-border/50 pt-3 mt-4">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages <= 1}
                  className="relative ml-3 inline-flex items-center rounded border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{' '}
                  <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, sortedDeposits.length)}</span> of{' '}
                  <span className="font-semibold text-foreground">{sortedDeposits.length}</span> results
                </p>
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
                        if (sortField === 'institution') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        else { setSortField('institution'); setSortOrder('asc'); }
                      }}
                      className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80 transition-colors select-none"
                    >
                      Institution {sortField === 'institution' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      Type
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      Account Holder
                    </th>
                    <th 
                      onClick={() => {
                        if (sortField === 'principal') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        else { setSortField('principal'); setSortOrder('asc'); }
                      }}
                      className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80 transition-colors select-none"
                    >
                      Principal Amount {sortField === 'principal' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      Est. Maturity Amount
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      Interest Rate
                    </th>
                    <th 
                      onClick={() => {
                        if (sortField === 'maturityDate') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        else { setSortField('maturityDate'); setSortOrder('asc'); }
                      }}
                      className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80 transition-colors select-none"
                    >
                      Maturity Date {sortField === 'maturityDate' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card/50 divide-y divide-border/20">
                  {paginatedDeposits.map((dep, idx) => {
                    const isMatured = getDepositStatus(dep) === 'MATURED';
                    return (
                      <tr 
                        key={dep.id} 
                        className={`hover:bg-muted/30 transition-colors group ${idx % 2 === 0 ? 'bg-background/20' : 'bg-card/10'}`}
                      >
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <div className="flex items-center">
                            <Wallet className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                            <span className="font-semibold text-foreground text-sm">{dep.institution}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-xs text-foreground font-medium uppercase">
                          {dep.type}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                          {dep.accountHolderName}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap font-mono font-bold text-foreground text-sm tabular-nums">
                          ₹{dep.principalAmount.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap font-mono font-bold text-green-500 text-sm tabular-nums">
                          ₹{dep.maturityAmount.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap font-mono text-foreground text-sm">
                          {dep.interestRate}%
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap font-mono text-xs text-muted-foreground">
                          <span className={`font-bold ${isMatured ? 'text-red-500' : 'text-foreground'}`}>
                            {new Date(dep.maturityDate).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right text-xs font-medium">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                            <button 
                              onClick={() => handleDelete(dep.id)} 
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
            {sortedDeposits.length > 0 && (
              <div className="flex items-center justify-between border-t border-border/50 p-3 bg-muted/10">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages <= 1}
                    className="relative ml-3 inline-flex items-center rounded border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-muted-foreground">
                      Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{' '}
                      <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, sortedDeposits.length)}</span> of{' '}
                      <span className="font-semibold text-foreground">{sortedDeposits.length}</span> results
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Show</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="px-2.5 py-1 rounded bg-card border border-border text-foreground text-xs outline-none focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                      >
                        <option value={15}>15 entries</option>
                        <option value={30}>30 entries</option>
                        <option value={50}>50 entries</option>
                      </select>
                    </div>
                  </div>
                  {totalPages > 1 && (
                    <div>
                      <nav className="isolate inline-flex -space-x-px rounded shadow-xs" aria-label="Pagination">
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
            {sortedDeposits.map((dep) => {
              return (
                <div
                  key={dep.id}
                  onClick={() => setSelectedDepositId(dep.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedDeposit?.id === dep.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:bg-muted/50 bg-card'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${selectedDeposit?.id === dep.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <Wallet className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-xs text-foreground truncate max-w-[120px]">{dep.institution}</h4>
                        <p className="text-[10px] text-muted-foreground uppercase">{dep.type} • {dep.accountHolderName}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(dep.id);
                      }}
                      className="text-muted-foreground hover:text-red-500 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2.5 flex justify-between items-baseline">
                    <span className="text-[10px] text-muted-foreground">Principal:</span>
                    <span className="text-xs font-mono font-bold text-foreground tabular-nums">₹{dep.principalAmount.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-8 bg-card border border-border/50 rounded-2xl p-4 flex flex-col h-[calc(100vh-16rem)] overflow-hidden">
            {selectedDeposit ? (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="border-b border-border/50 pb-3 mb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-base text-foreground">{selectedDeposit.institution}</h3>
                      <p className="text-xs text-muted-foreground">Holder: {selectedDeposit.accountHolderName} | Type: {selectedDeposit.type}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block uppercase">Principal Invested</span>
                      <span className="text-xl font-mono font-bold text-primary tabular-nums">₹{selectedDeposit.principalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                  {/* Performance Indicators */}
                  <div className="grid grid-cols-3 gap-4 bg-muted/30 p-3 rounded-xl">
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase">Maturity Value</span>
                      <span className="text-xs font-semibold text-green-500 font-mono tabular-nums">₹{selectedDeposit.maturityAmount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase">Interest Rate</span>
                      <span className="text-xs font-bold text-foreground font-mono">{selectedDeposit.interestRate}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase">Matures On</span>
                      <span className="text-xs font-bold text-foreground font-mono">{new Date(selectedDeposit.maturityDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Transaction ledger */}
                  <div>
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Contribution Transaction History</h4>
                    <div className="space-y-1.5">
                      {expenses.filter((e) => e.linkedDeposit?.id === selectedDeposit.id).length === 0 ? (
                        <div className="text-center py-6 bg-background/20 rounded-xl border border-border/50">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                          <p className="text-xs text-muted-foreground">No deposits or interest payouts logged for this account.</p>
                        </div>
                      ) : (
                        expenses
                          .filter((e) => e.linkedDeposit?.id === selectedDeposit.id)
                          .map((exp) => {
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
                                <span className="font-bold text-xs font-mono text-red-500 tabular-nums">
                                  -₹{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                <Wallet className="h-10 w-10 stroke-1 mb-2 opacity-50" />
                <p className="text-xs">Select a deposit instrument on the left to inspect performance.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Add Deposit</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Deposit Type</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm text-foreground">
                  <option value="FD">Fixed Deposit (FD)</option>
                  <option value="RD">Recurring Deposit (RD)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Institution (Bank Name)</label>
                <input required value={formData.institution} onChange={e => setFormData({...formData, institution: e.target.value})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" placeholder="e.g. SBI, Post Office" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Account Holder Name</label>
                <input required value={formData.accountHolderName} onChange={e => setFormData({...formData, accountHolderName: e.target.value})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Principal (₹)</label>
                  <input required type="number" value={formData.principalAmount || ''} onChange={e => setFormData({...formData, principalAmount: parseFloat(e.target.value)})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Maturity Amount (₹)</label>
                  <input required type="number" value={formData.maturityAmount || ''} onChange={e => setFormData({...formData, maturityAmount: parseFloat(e.target.value)})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Interest Rate (%)</label>
                  <input required type="number" step="0.01" value={formData.interestRate || ''} onChange={e => setFormData({...formData, interestRate: parseFloat(e.target.value)})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" placeholder="e.g. 7.1" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Start Date</label>
                  <input required type="date" value={formData.startDate || ''} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Maturity Date</label>
                <input required type="date" value={formData.maturityDate || ''} onChange={e => setFormData({...formData, maturityDate: e.target.value})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">Save Deposit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
