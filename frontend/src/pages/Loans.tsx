import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useToastStore } from '../store/toastStore';
import { useConfirmStore } from '../store/confirmStore';
import { Plus, CreditCard, Trash2, Search, Download, Printer, FileText } from 'lucide-react';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';

interface Loan {
  id: string;
  lenderName: string;
  loanType: string;
  borrowerName: string;
  principalAmount: number;
  outstandingAmount: number;
  emiAmount: number;
  interestRate: number;
}

export default function Loans() {
  const toast = useToastStore();
  const confirm = useConfirmStore();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Loan>>({
    lenderName: '',
    loanType: 'Home Loan',
    borrowerName: '',
    principalAmount: 0,
    outstandingAmount: 0,
    emiAmount: 0,
    interestRate: 0
  });

  // Filter States
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'CLOSED'>('ACTIVE');
  const [filterLender, setFilterLender] = useState('ALL');

  // Sort States
  const [sortField, setSortField] = useState<'lenderName' | 'outstanding' | 'emi'>('outstanding');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // View States
  const [viewMode, setViewMode] = useState<'card' | 'list' | 'detailed'>('list');
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    fetchLoans();
    fetchExpenses();
  }, []);

  const fetchLoans = async () => {
    try {
      const data = await apiClient('/api/loans');
      setLoans(data);
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
      await apiClient('/api/loans', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setIsModalOpen(false);
      setFormData({ lenderName: '', loanType: 'Home Loan', borrowerName: '', principalAmount: 0, outstandingAmount: 0, emiAmount: 0, interestRate: 0 });
      toast.success('Loan saved', 'Loan record has been added successfully.');
      fetchLoans();
    } catch (err: any) {
      toast.error('Failed to save loan', err.message || 'Could not save loan. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    confirm.show({
      title: 'Delete Loan',
      message: 'Are you sure you want to delete this loan record? This action cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          await apiClient(`/api/loans/${id}`, { method: 'DELETE' });
          toast.success('Loan deleted', 'The loan record has been removed.');
          fetchLoans();
        } catch (err: any) {
          toast.error('Cannot delete loan', err.message || 'Failed to delete loan.');
        }
      },
    });
  };

  // Reset page when switching viewMode
  useEffect(() => {
    setItemsPerPage(viewMode === 'card' ? 6 : 15);
    setCurrentPage(1);
  }, [viewMode]);

  // Select first loan if none selected
  useEffect(() => {
    if (loans.length > 0 && !selectedLoanId) {
      setSelectedLoanId(loans[0].id);
    }
  }, [loans, selectedLoanId]);

  const isLoanActive = useCallback((l: Loan) => {
    return (l.outstandingAmount ?? 0) > 0;
  }, []);

  const getLoanEmiStatus = useCallback((l: Loan) => {
    if (!isLoanActive(l)) return 'PAID';
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const currentMonthPayments = expenses.filter(e => 
      e.linkedLoan?.id === l.id && 
      new Date(e.expenseDate).getMonth() === currentMonth &&
      new Date(e.expenseDate).getFullYear() === currentYear
    );
    
    if (currentMonthPayments.length > 0) return 'PAID';
    if (today.getDate() > 5) return 'OVERDUE';
    return 'PENDING';
  }, [expenses, isLoanActive]);

  const getLoanNextDueDate = useCallback((l: Loan) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const status = getLoanEmiStatus(l);
    if (status === 'PAID') {
      return new Date(currentYear, currentMonth + 1, 5);
    }
    return new Date(currentYear, currentMonth, 5);
  }, [getLoanEmiStatus]);

  // Filter dataset
  const filteredLoans = loans.filter(l => {
    const matchesSearch = l.lenderName.toLowerCase().includes(search.toLowerCase()) || 
                          l.borrowerName.toLowerCase().includes(search.toLowerCase()) || 
                          l.loanType.toLowerCase().includes(search.toLowerCase());
    
    const matchesLender = filterLender === 'ALL' || l.lenderName === filterLender;
    
    let matchesStatus = true;
    const isActive = isLoanActive(l);
    if (filterStatus === 'ACTIVE') {
      matchesStatus = isActive;
    } else if (filterStatus === 'CLOSED') {
      matchesStatus = !isActive;
    }
    
    return matchesSearch && matchesLender && matchesStatus;
  });

  // Sort dataset (Rule 6: Overdue floats to top)
  const sortedLoans = [...filteredLoans].sort((a, b) => {
    const aOverdue = isLoanActive(a) && getLoanEmiStatus(a) === 'OVERDUE';
    const bOverdue = isLoanActive(b) && getLoanEmiStatus(b) === 'OVERDUE';
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    let comparison = 0;
    if (sortField === 'lenderName') {
      comparison = a.lenderName.localeCompare(b.lenderName);
    } else if (sortField === 'outstanding') {
      comparison = (a.outstandingAmount ?? 0) - (b.outstandingAmount ?? 0);
    } else if (sortField === 'emi') {
      comparison = (a.emiAmount ?? 0) - (b.emiAmount ?? 0);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const selectedLoan = loans.find(l => l.id === selectedLoanId) || loans[0];

  // Pagination calculations
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLoans = sortedLoans.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(sortedLoans.length / itemsPerPage);

  // Summary Metrics calculations
  const activeLoans = filteredLoans.filter(l => isLoanActive(l));
  const foreclosedLoans = filteredLoans.filter(l => !isLoanActive(l));
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + (l.outstandingAmount ?? 0), 0);
  const totalEmiOutgo = activeLoans.reduce((sum, l) => sum + (l.emiAmount ?? 0), 0);
  
  const activeDueDates = activeLoans.map(l => getLoanNextDueDate(l).getTime());
  const nextEmiDueDate = activeDueDates.length > 0 ? new Date(Math.min(...activeDueDates)) : null;

  const uniqueLenders = Array.from(new Set(loans.map(l => l.lenderName)));

  // Export handlers
  const handleExportCSV = () => {
    const headers = ['Lender', 'Type', 'Borrower', 'Principal', 'Outstanding', 'EMI', 'Interest Rate', 'Status'];
    const exportData = sortedLoans.map(l => [
      l.lenderName,
      l.loanType,
      l.borrowerName,
      l.principalAmount,
      l.outstandingAmount,
      l.emiAmount,
      l.interestRate,
      isLoanActive(l) ? (getLoanEmiStatus(l) === 'OVERDUE' ? 'Overdue' : 'Active') : 'Closed'
    ]);
    exportToCSV(exportData, headers, 'Loans_Report');
  };

  const handleExportPDF = () => {
    const headers = ['Lender', 'Type', 'Borrower', 'Principal', 'Outstanding', 'EMI', 'Interest', 'Status'];
    const exportData = sortedLoans.map(l => [
      l.lenderName,
      l.loanType,
      l.borrowerName,
      `₹${l.principalAmount.toLocaleString()}`,
      `₹${l.outstandingAmount.toLocaleString()}`,
      `₹${l.emiAmount.toLocaleString()}`,
      `${l.interestRate}%`,
      isLoanActive(l) ? (getLoanEmiStatus(l) === 'OVERDUE' ? 'Overdue' : 'Active') : 'Closed'
    ]);
    exportToPDF('Loans & EMI Repayments Report', headers, exportData, 'Loans_Report');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Loans & EMI</h1>
          <p className="text-sm text-muted-foreground">Track outstanding balances, EMIs, interest rates and repayments</p>
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
            <Plus className="h-4 w-4" /> Add Loan
          </button>
        </div>
      </div>

      {/* Rule 1: Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Total Outstanding Principal</span>
          <p className="text-lg font-mono font-bold text-foreground mt-1 tabular-nums">₹{totalOutstanding.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Monthly EMI Outgo</span>
          <p className="text-lg font-mono font-bold text-red-500 mt-1 tabular-nums">₹{totalEmiOutgo.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Active Loans</span>
          <p className="text-lg font-mono font-bold text-foreground mt-1 tabular-nums">{activeLoans.length}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Closed/Foreclosed</span>
          <p className="text-lg font-mono font-bold text-foreground mt-1 tabular-nums">{foreclosedLoans.length}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-border/50 bg-gradient-to-br from-red-500/5 to-transparent">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Next EMI Due</span>
          <p className="text-sm font-mono font-bold text-foreground mt-2 tabular-nums">
            {nextEmiDueDate ? nextEmiDueDate.toLocaleDateString() : 'No EMIs Pending'}
          </p>
        </div>
      </div>

      {/* Rule 3: Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-card/30 p-3 rounded-xl border border-border/50">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search loans..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-background/50 border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none text-foreground w-48 transition-all"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-1.5 bg-background/50 border border-border rounded-lg text-sm text-foreground outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Loans</option>
            <option value="CLOSED">Closed Loans</option>
          </select>

          <select
            value={filterLender}
            onChange={(e) => setFilterLender(e.target.value)}
            className="px-3 py-1.5 bg-background/50 border border-border rounded-lg text-sm text-foreground outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
          >
            <option value="ALL">All Lenders</option>
            {uniqueLenders.map(l => (
              <option key={l} value={l}>{l}</option>
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

      {loans.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground bg-card border border-border rounded-lg">
          No active loans found. Add your Home, Auto, or Personal loans here.
        </div>
      ) : viewMode === 'card' ? (
        /* Card View */
        <div className="space-y-6 flex-1 flex flex-col min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-1">
            {paginatedLoans.map((loan) => {
              const progress = ((loan.principalAmount - loan.outstandingAmount) / loan.principalAmount) * 100;
              const emiStatus = getLoanEmiStatus(loan);
              return (
                <div key={loan.id} className="bg-card p-4 rounded-xl shadow-sm border border-border/50 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-red-500/10 text-red-500 rounded-lg">
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-foreground">{loan.lenderName}</h3>
                          <p className="text-[10px] text-muted-foreground">{loan.loanType} • {loan.borrowerName}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(loan.id)} className="text-muted-foreground hover:text-red-500 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="mb-3">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                        <span>Paid Off</span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}></div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Principal:</span>
                        <span className="font-medium text-foreground font-mono tabular-nums">₹{loan.principalAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Outstanding:</span>
                        <span className="font-bold text-red-500 font-mono tabular-nums">₹{loan.outstandingAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-border/30">
                        <span className="text-muted-foreground">Monthly EMI:</span>
                        <span className="font-semibold text-foreground font-mono tabular-nums">₹{loan.emiAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-bold">Status:</span>
                        <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded font-bold ${
                          emiStatus === 'OVERDUE' 
                            ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                            : 'bg-green-500/10 text-green-500 border border-green-500/20'
                        }`}>
                          {emiStatus === 'OVERDUE' ? 'Overdue' : 'Active'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {sortedLoans.length > 0 && (
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
                  <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, sortedLoans.length)}</span> of{' '}
                  <span className="font-semibold text-foreground">{sortedLoans.length}</span> results
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
                        if (sortField === 'lenderName') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        else { setSortField('lenderName'); setSortOrder('asc'); }
                      }}
                      className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80 transition-colors select-none"
                    >
                      Lender {sortField === 'lenderName' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      Type / Borrower
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      Principal
                    </th>
                    <th 
                      onClick={() => {
                        if (sortField === 'outstanding') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        else { setSortField('outstanding'); setSortOrder('asc'); }
                      }}
                      className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80 transition-colors select-none"
                    >
                      Outstanding {sortField === 'outstanding' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th 
                      onClick={() => {
                        if (sortField === 'emi') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        else { setSortField('emi'); setSortOrder('asc'); }
                      }}
                      className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80 transition-colors select-none"
                    >
                      EMI {sortField === 'emi' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      Repayment Status
                    </th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card/50 divide-y divide-border/20">
                  {paginatedLoans.map((loan, idx) => {
                    const emiStatus = getLoanEmiStatus(loan);
                    return (
                      <tr 
                        key={loan.id} 
                        className={`hover:bg-muted/30 transition-colors group ${idx % 2 === 0 ? 'bg-background/20' : 'bg-card/10'}`}
                      >
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <div className="flex items-center">
                            <CreditCard className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                            <span className="font-semibold text-foreground text-sm">{loan.lenderName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-xs">
                          <span className="text-foreground font-medium">{loan.loanType}</span>
                          <span className="text-muted-foreground block text-[10px]">{loan.borrowerName}</span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap font-mono font-bold text-foreground text-sm tabular-nums">
                          ₹{loan.principalAmount.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap font-mono font-bold text-red-500 text-sm tabular-nums">
                          ₹{loan.outstandingAmount.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap font-mono font-semibold text-foreground text-sm tabular-nums">
                          ₹{loan.emiAmount.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-xs">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            emiStatus === 'OVERDUE' 
                              ? 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse' 
                              : 'bg-green-500/10 text-green-500 border-green-500/20'
                          }`}>
                            {emiStatus === 'OVERDUE' ? 'Overdue' : 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right text-xs font-medium">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                            <button 
                              onClick={() => handleDelete(loan.id)} 
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
            {sortedLoans.length > 0 && (
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
                      <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, sortedLoans.length)}</span> of{' '}
                      <span className="font-semibold text-foreground">{sortedLoans.length}</span> results
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
            {sortedLoans.map((loan) => {
              return (
                <div
                  key={loan.id}
                  onClick={() => setSelectedLoanId(loan.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedLoan?.id === loan.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:bg-muted/50 bg-card'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${selectedLoan?.id === loan.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-xs text-foreground">{loan.lenderName}</h4>
                        <p className="text-[10px] text-muted-foreground">{loan.loanType} | {loan.borrowerName}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(loan.id);
                      }}
                      className="text-muted-foreground hover:text-red-500 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2.5 flex justify-between items-baseline">
                    <span className="text-[10px] text-muted-foreground">Outstanding:</span>
                    <span className="text-xs font-mono font-bold text-red-500 tabular-nums">₹{loan.outstandingAmount.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-8 bg-card border border-border/50 rounded-2xl p-4 flex flex-col h-[calc(100vh-16rem)] overflow-hidden">
            {selectedLoan ? (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="border-b border-border/50 pb-3 mb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-base text-foreground">{selectedLoan.lenderName}</h3>
                      <p className="text-xs text-muted-foreground">{selectedLoan.loanType} Loan | Borrower: {selectedLoan.borrowerName}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block uppercase">Monthly EMI Amount</span>
                      <span className="text-xl font-mono font-bold text-red-500 tabular-nums">₹{selectedLoan.emiAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                  {/* Performance Indicators */}
                  <div className="grid grid-cols-3 gap-4 bg-muted/30 p-3 rounded-xl">
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase">Principal Amount</span>
                      <span className="text-xs font-semibold text-foreground font-mono tabular-nums">₹{selectedLoan.principalAmount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase">Outstanding Balance</span>
                      <span className="text-xs font-bold text-red-500 font-mono tabular-nums">₹{selectedLoan.outstandingAmount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase">Interest Rate</span>
                      <span className="text-xs font-semibold text-foreground font-mono">{selectedLoan.interestRate}%</span>
                    </div>
                  </div>

                  {/* Repayment log */}
                  <div>
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Repayment & Installment Ledger</h4>
                    <div className="space-y-1.5">
                      {expenses.filter((e) => e.linkedLoan?.id === selectedLoan.id).length === 0 ? (
                        <div className="text-center py-6 bg-background/20 rounded-xl border border-border/50">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                          <p className="text-xs text-muted-foreground">No payments or adjustments logged for this loan.</p>
                        </div>
                      ) : (
                        expenses
                          .filter((e) => e.linkedLoan?.id === selectedLoan.id)
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
                <CreditCard className="h-10 w-10 stroke-1 mb-2 opacity-50" />
                <p className="text-xs">Select a loan account on the left to view metrics and details.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Add Loan</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Lender (Bank Name)</label>
                <input required value={formData.lenderName} onChange={e => setFormData({...formData, lenderName: e.target.value})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" placeholder="e.g. ICICI Bank" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Loan Type</label>
                <select value={formData.loanType} onChange={e => setFormData({...formData, loanType: e.target.value})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm text-foreground">
                  <option value="Home Loan">Home Loan</option>
                  <option value="Auto Loan">Auto Loan</option>
                  <option value="Personal Loan">Personal Loan</option>
                  <option value="Education Loan">Education Loan</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Borrower Name</label>
                <input required value={formData.borrowerName} onChange={e => setFormData({...formData, borrowerName: e.target.value})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Total Principal Amount (₹)</label>
                <input required type="number" value={formData.principalAmount || ''} onChange={e => setFormData({...formData, principalAmount: parseFloat(e.target.value)})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Current Outstanding (₹)</label>
                <input required type="number" value={formData.outstandingAmount || ''} onChange={e => setFormData({...formData, outstandingAmount: parseFloat(e.target.value)})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" placeholder="0.00" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">EMI Amount (₹)</label>
                  <input required type="number" value={formData.emiAmount || ''} onChange={e => setFormData({...formData, emiAmount: parseFloat(e.target.value)})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Interest Rate (%)</label>
                  <input required type="number" step="0.01" value={formData.interestRate || ''} onChange={e => setFormData({...formData, interestRate: parseFloat(e.target.value)})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" placeholder="e.g. 8.5" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">Save Loan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
