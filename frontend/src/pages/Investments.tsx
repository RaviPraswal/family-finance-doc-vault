import { useEffect, useState, useMemo } from 'react';
import { apiClient } from '../api/client';
import { useToastStore } from '../store/toastStore';
import { useConfirmStore } from '../store/confirmStore';
import { Plus, Briefcase, Trash2, Search, Download, Printer, FileText } from 'lucide-react';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';

interface Investment {
  id: string;
  type: string;
  name: string;
  investedAmount: number;
  currentValue: number;
}

export default function Investments() {
  const toast = useToastStore();
  const confirm = useConfirmStore();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Investment>>({
    type: 'Mutual Fund',
    name: '',
    investedAmount: 0,
    currentValue: 0
  });
  const [customType, setCustomType] = useState('');

  // Filter & Search States
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // Sort States
  const [sortField, setSortField] = useState<'name' | 'invested' | 'current' | 'returns'>('current');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // View States
  const [viewMode, setViewMode] = useState<'card' | 'list' | 'detailed'>('list');
  const [selectedInvestmentId, setSelectedInvestmentId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    fetchInvestments();
    fetchExpenses();
  }, []);

  const fetchInvestments = async () => {
    try {
      const data = await apiClient('/api/investments');
      setInvestments(data);
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
      const payload = {
        ...formData,
        type: formData.type === 'CUSTOM' ? customType : formData.type
      };
      await apiClient('/api/investments', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setIsModalOpen(false);
      setFormData({ type: 'Mutual Fund', name: '', investedAmount: 0, currentValue: 0 });
      setCustomType('');
      toast.success('Investment saved', 'Your investment record has been added successfully.');
      fetchInvestments();
    } catch (err: any) {
      toast.error('Failed to save investment', err.message || 'Could not save investment. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    confirm.show({
      title: 'Delete Investment',
      message: 'Are you sure you want to delete this investment? This action cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          await apiClient(`/api/investments/${id}`, { method: 'DELETE' });
          toast.success('Investment deleted', 'The investment record has been removed.');
          fetchInvestments();
        } catch (err: any) {
          toast.error('Cannot delete investment', err.message || 'Failed to delete investment.');
        }
      },
    });
  };

  // Reset page size
  useEffect(() => {
    setItemsPerPage(viewMode === 'card' ? 6 : 15);
    setCurrentPage(1);
  }, [viewMode]);

  // Select first investment if none selected
  useEffect(() => {
    if (investments.length > 0 && !selectedInvestmentId) {
      setSelectedInvestmentId(investments[0].id);
    }
  }, [investments, selectedInvestmentId]);

  const selectedInvestment = investments.find(i => i.id === selectedInvestmentId) || investments[0];

  // Filter dataset
  const filteredInvestments = investments.filter(inv => {
    const matchesSearch = inv.name.toLowerCase().includes(search.toLowerCase()) || 
                          inv.type.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'ALL' || inv.type === filterType;
    return matchesSearch && matchesType;
  });

  // Sort dataset
  const sortedInvestments = [...filteredInvestments].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortField === 'invested') {
      comparison = a.investedAmount - b.investedAmount;
    } else if (sortField === 'current') {
      comparison = a.currentValue - b.currentValue;
    } else if (sortField === 'returns') {
      const aRet = a.investedAmount > 0 ? (a.currentValue - a.investedAmount) / a.investedAmount : 0;
      const bRet = b.investedAmount > 0 ? (b.currentValue - b.investedAmount) / b.investedAmount : 0;
      comparison = aRet - bRet;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Pagination calculations
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInvestments = sortedInvestments.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(sortedInvestments.length / itemsPerPage);

  // Summary Metrics calculations
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Total Invested (Year)
  const yearInvestments = expenses.filter(e => 
    (e.madeAgainst === 'SIP_INVESTMENT' || e.category.toLowerCase().includes('investment') || e.linkedInvestment) &&
    new Date(e.expenseDate) >= startOfYear
  );
  const totalInvestedYear = yearInvestments.reduce((sum, e) => sum + e.amount, 0);

  // Total Invested (This Month)
  const monthInvestments = expenses.filter(e => 
    (e.madeAgainst === 'SIP_INVESTMENT' || e.category.toLowerCase().includes('investment') || e.linkedInvestment) &&
    new Date(e.expenseDate) >= startOfThisMonth
  );
  const totalInvestedMonth = monthInvestments.reduce((sum, e) => sum + e.amount, 0);

  // Active SIPs: unique investments that had a transaction in the last 30 days
  const activeSipsList = investments.filter(inv => {
    const invTx = expenses.filter(e => e.linkedInvestment?.id === inv.id && new Date(e.expenseDate) >= thirtyDaysAgo);
    return invTx.length > 0;
  });
  const activeSipsCount = activeSipsList.length;

  // Paused SIPs: unique investments that had transactions historically, but none in the last 60 days
  const pausedSipsCount = investments.filter(inv => {
    const hasTx = expenses.some(e => e.linkedInvestment?.id === inv.id);
    const hasRecentTx = expenses.some(e => e.linkedInvestment?.id === inv.id && new Date(e.expenseDate) >= sixtyDaysAgo);
    return hasTx && !hasRecentTx;
  }).length;

  const monthlySipOutgo = totalInvestedMonth;

  const uniqueTypes = Array.from(new Set(investments.map(i => i.type)));
  const availableTypes = useMemo(() => {
    const defaultTypes = ['Mutual Fund', 'Stock / Equity', 'Gold', 'Fixed Deposit', 'Crypto'];
    return Array.from(new Set([...defaultTypes, ...investments.map(i => i.type).filter(Boolean)]));
  }, [investments]);

  // Export handlers
  const handleExportCSV = () => {
    const headers = ['Name', 'Type', 'Invested Amount', 'Current Value', 'Returns %'];
    const exportData = sortedInvestments.map(inv => [
      inv.name,
      inv.type,
      inv.investedAmount,
      inv.currentValue,
      inv.investedAmount > 0 ? (((inv.currentValue - inv.investedAmount) / inv.investedAmount) * 100).toFixed(1) : '0'
    ]);
    exportToCSV(exportData, headers, 'Investments_Report');
  };

  const handleExportPDF = () => {
    const headers = ['Name', 'Type', 'Invested Amount', 'Current Value', 'Profit/Loss', 'Returns %'];
    const exportData = sortedInvestments.map(inv => {
      const returnsPercent = inv.investedAmount > 0 ? ((inv.currentValue - inv.investedAmount) / inv.investedAmount) * 100 : 0;
      const profit = inv.currentValue - inv.investedAmount;
      return [
        inv.name,
        inv.type,
        `₹${inv.investedAmount.toLocaleString()}`,
        `₹${inv.currentValue.toLocaleString()}`,
        `₹${profit.toLocaleString()}`,
        `${returnsPercent.toFixed(1)}%`
      ];
    });
    exportToPDF('Investment Portfolio Statement', headers, exportData, 'Investments_Report');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Investments</h1>
          <p className="text-sm text-muted-foreground">Track your asset distribution, values and performance</p>
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
            <Plus className="h-4 w-4" /> Add Investment
          </button>
        </div>
      </div>

      {/* Rule 1: Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Total Invested (Year)</span>
          <p className="text-lg font-mono font-bold text-foreground mt-1 tabular-nums">₹{totalInvestedYear.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Total Invested (Month)</span>
          <p className="text-lg font-mono font-bold text-foreground mt-1 tabular-nums">₹{totalInvestedMonth.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Active SIPs</span>
          <p className="text-lg font-mono font-bold text-green-500 mt-1 tabular-nums">{activeSipsCount}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Paused SIPs</span>
          <p className="text-lg font-mono font-bold text-yellow-500 mt-1 tabular-nums">{pausedSipsCount}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Monthly SIP Outgo</span>
          <p className="text-lg font-mono font-bold text-foreground mt-1 tabular-nums">₹{monthlySipOutgo.toLocaleString()}</p>
        </div>
      </div>

      {/* Rule 3: Search + Filters Control Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-card/30 p-3 rounded-xl border border-border/50">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search assets..."
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
            <option value="ALL">All Asset Types</option>
            {uniqueTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
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

      {investments.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground bg-card border border-border rounded-lg">
          No investment records found. Click Add Investment to start tracking.
        </div>
      ) : viewMode === 'card' ? (
        /* Card View */
        <div className="space-y-6 flex-1 flex flex-col min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-1">
            {paginatedInvestments.map((inv) => {
              const returns = inv.currentValue - inv.investedAmount;
              const returnsPercent = inv.investedAmount > 0 ? (returns / inv.investedAmount) * 100 : 0;
              return (
                <div key={inv.id} className="bg-card p-4 rounded-xl border border-border/50 hover:shadow-md transition-shadow flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
                          <Briefcase className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-foreground">{inv.name}</h3>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">{inv.type}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(inv.id)} className="text-muted-foreground hover:text-red-500 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-1.5 text-xs border-t border-border/30 pt-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Invested Amount:</span>
                        <span className="font-medium text-foreground font-mono tabular-nums">₹{inv.investedAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current Value:</span>
                        <span className="font-bold text-foreground font-mono tabular-nums">₹{inv.currentValue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-border/20">
                        <span className="text-muted-foreground">Profit/Loss:</span>
                        <span className={`font-bold font-mono tabular-nums ${returns >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {returns >= 0 ? '+' : ''}₹{returns.toLocaleString()} ({returnsPercent.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {sortedInvestments.length > 0 && (
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
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{' '}
                  <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, sortedInvestments.length)}</span> of{' '}
                  <span className="font-semibold text-foreground">{sortedInvestments.length}</span> results
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
                        if (sortField === 'name') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        else { setSortField('name'); setSortOrder('asc'); }
                      }}
                      className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80 transition-colors select-none"
                    >
                      Asset Name {sortField === 'name' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      Type
                    </th>
                    <th 
                      onClick={() => {
                        if (sortField === 'invested') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        else { setSortField('invested'); setSortOrder('asc'); }
                      }}
                      className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80 transition-colors select-none"
                    >
                      Invested Amount {sortField === 'invested' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th 
                      onClick={() => {
                        if (sortField === 'current') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        else { setSortField('current'); setSortOrder('asc'); }
                      }}
                      className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80 transition-colors select-none"
                    >
                      Current Value {sortField === 'current' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th 
                      onClick={() => {
                        if (sortField === 'returns') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        else { setSortField('returns'); setSortOrder('asc'); }
                      }}
                      className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80 transition-colors select-none"
                    >
                      Gain/Loss {sortField === 'returns' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card/50 divide-y divide-border/20">
                  {paginatedInvestments.map((inv, idx) => {
                    const profit = inv.currentValue - inv.investedAmount;
                    const returnsPercent = inv.investedAmount > 0 ? (profit / inv.investedAmount) * 100 : 0;
                    return (
                      <tr 
                        key={inv.id} 
                        className={`hover:bg-muted/30 transition-colors group ${idx % 2 === 0 ? 'bg-background/20' : 'bg-card/10'}`}
                      >
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <div className="flex items-center">
                            <Briefcase className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                            <span className="font-semibold text-foreground text-sm">{inv.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-xs text-foreground font-medium uppercase">
                          {inv.type}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap font-mono font-bold text-foreground text-sm tabular-nums">
                          ₹{inv.investedAmount.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap font-mono font-bold text-foreground text-sm tabular-nums">
                          ₹{inv.currentValue.toLocaleString()}
                        </td>
                        <td className={`px-4 py-2.5 whitespace-nowrap font-mono font-bold text-sm tabular-nums ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {profit >= 0 ? '+' : ''}₹{profit.toLocaleString()} ({returnsPercent.toFixed(1)}%)
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right text-xs font-medium">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                            <button 
                              onClick={() => handleDelete(inv.id)} 
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
            {sortedInvestments.length > 0 && (
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
                      <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, sortedInvestments.length)}</span> of{' '}
                      <span className="font-semibold text-foreground">{sortedInvestments.length}</span> results
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
            {sortedInvestments.map((inv) => {
              const returns = inv.currentValue - inv.investedAmount;
              return (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvestmentId(inv.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedInvestment?.id === inv.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:bg-muted/50 bg-card'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${selectedInvestment?.id === inv.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-xs text-foreground truncate max-w-[120px]">{inv.name}</h4>
                        <p className="text-[10px] text-muted-foreground uppercase">{inv.type}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(inv.id);
                      }}
                      className="text-muted-foreground hover:text-red-500 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2.5 flex justify-between items-baseline">
                    <span className="text-[10px] text-muted-foreground">Current Value:</span>
                    <span className={`text-xs font-mono font-bold tabular-nums ${returns >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ₹{inv.currentValue.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-8 bg-card border border-border/50 rounded-2xl p-4 flex flex-col h-[calc(100vh-16rem)] overflow-hidden">
            {selectedInvestment ? (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="border-b border-border/50 pb-3 mb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-base text-foreground">{selectedInvestment.name}</h3>
                      <p className="text-xs text-muted-foreground">Asset Class: {selectedInvestment.type}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block uppercase">Current Portfolio Value</span>
                      <span className="text-xl font-mono font-bold text-primary tabular-nums">₹{selectedInvestment.currentValue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                  {/* Performance Indicators */}
                  <div className="grid grid-cols-3 gap-4 bg-muted/30 p-3 rounded-xl">
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase">Invested Amount</span>
                      <span className="text-xs font-semibold text-foreground font-mono tabular-nums">₹{selectedInvestment.investedAmount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase">Profit / Loss</span>
                      <span className={`text-xs font-bold font-mono tabular-nums ${selectedInvestment.currentValue - selectedInvestment.investedAmount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ₹{(selectedInvestment.currentValue - selectedInvestment.investedAmount).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase">Total Return</span>
                      <span className={`text-xs font-bold font-mono ${selectedInvestment.currentValue - selectedInvestment.investedAmount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {selectedInvestment.investedAmount > 0 ? (((selectedInvestment.currentValue - selectedInvestment.investedAmount) / selectedInvestment.investedAmount) * 100).toFixed(1) : '0'}%
                      </span>
                    </div>
                  </div>

                  {/* Transaction ledger */}
                  <div>
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Repayments & Investment Tranches</h4>
                    <div className="space-y-1.5">
                      {expenses.filter((e) => e.linkedInvestment?.id === selectedInvestment.id).length === 0 ? (
                        <div className="text-center py-6 bg-background/20 rounded-xl border border-border/50">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                          <p className="text-xs text-muted-foreground">No transaction logs logged against this investment.</p>
                        </div>
                      ) : (
                        expenses
                          .filter((e) => e.linkedInvestment?.id === selectedInvestment.id)
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
                <Briefcase className="h-10 w-10 stroke-1 mb-2 opacity-50" />
                <p className="text-xs">Select an investment asset on the left to view statement ledger and returns.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Add Investment</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Asset Class</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm text-foreground">
                  {availableTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                  <option value="CUSTOM">Other / Custom Asset Class...</option>
                </select>
              </div>
              {formData.type === 'CUSTOM' && (
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Custom Asset Class Name</label>
                  <input required value={customType} onChange={e => setCustomType(e.target.value)} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" placeholder="e.g. Real Estate, PPF, NPS" />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Asset Name</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" placeholder="e.g. Parag Parikh Flexi Cap Fund" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Invested Amount (₹)</label>
                  <input required type="number" value={formData.investedAmount || ''} onChange={e => setFormData({...formData, investedAmount: parseFloat(e.target.value)})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Current Value (₹)</label>
                  <input required type="number" value={formData.currentValue || ''} onChange={e => setFormData({...formData, currentValue: parseFloat(e.target.value)})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" placeholder="0.00" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => { setIsModalOpen(false); setCustomType(''); }} className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">Save Investment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
