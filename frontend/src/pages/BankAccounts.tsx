import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useToastStore } from '../store/toastStore';
import { useConfirmStore } from '../store/confirmStore';
import { Plus, Landmark, Trash2, Search, Download, Printer, FileText } from 'lucide-react';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';

interface BankAccount {
  id: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  accountType: string;
  currentBalance: number;
  openingBalance: number;
}

export default function BankAccounts() {
  const toast = useToastStore();
  const confirm = useConfirmStore();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);
  
  // Left Panel Search / Sort
  const [accountSearch, setAccountSearch] = useState('');
  const [accountSort, setAccountSort] = useState<'balance-desc' | 'balance-asc' | 'name-asc' | 'recent-activity'>('balance-desc');

  // Right Panel Ledger Filters
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerType, setLedgerType] = useState<'ALL' | 'DEBIT' | 'CREDIT'>('ALL');
  const [ledgerCategory, setLedgerCategory] = useState('ALL');
  const ledgerStartDate = '';
  const ledgerEndDate = '';
  const ledgerMinAmount = '';
  const ledgerMaxAmount = '';

  const [txnPage, setTxnPage] = useState(1);
  const [txnItemsPerPage, setTxnItemsPerPage] = useState(15);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<BankAccount>>({
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    accountType: 'Savings',
    currentBalance: 0,
    openingBalance: 0
  });

  const [viewMode, setViewMode] = useState<'card' | 'list' | 'detailed'>('detailed');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchAccounts();
    fetchExpenses();
  }, []);

  useEffect(() => {
    setTxnPage(1);
  }, [expandedAccountId, ledgerType, ledgerCategory, ledgerStartDate, ledgerEndDate, ledgerMinAmount, ledgerMaxAmount, ledgerSearch]);

  const fetchAccounts = async () => {
    try {
      const data = await apiClient('/api/bankaccounts');
      setAccounts(data);
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
      await apiClient('/api/bankaccounts', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setIsModalOpen(false);
      setFormData({ bankName: '', accountHolderName: '', accountNumber: '', accountType: 'Savings', currentBalance: 0, openingBalance: 0 });
      toast.success('Bank account saved', 'Your bank account has been added successfully.');
      fetchAccounts();
    } catch (err: any) {
      toast.error('Failed to save', err.message || 'Could not save bank account. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    confirm.show({
      title: 'Delete Bank Account',
      message: 'Are you sure you want to delete this bank account? This action cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          await apiClient(`/api/bankaccounts/${id}`, { method: 'DELETE' });
          toast.success('Bank account deleted', 'The account has been removed.');
          fetchAccounts();
        } catch (err: any) {
          toast.error('Cannot delete account', err.message || 'Failed to delete bank account.');
        }
      },
    });
  };

  // Reset page when switching view mode
  useEffect(() => {
    setItemsPerPage(viewMode === 'card' ? 6 : 10);
    setCurrentPage(1);
  }, [viewMode]);

  // Select first account if none is selected for detailed view
  useEffect(() => {
    if (accounts.length > 0 && !expandedAccountId) {
      setExpandedAccountId(accounts[0].id);
    }
  }, [accounts, expandedAccountId]);

  const selectedAccount = accounts.find(a => a.id === expandedAccountId) || accounts[0];

  // Filter & Sort Left Panel Accounts List
  const filteredAccounts = accounts.filter(acc => {
    return acc.bankName.toLowerCase().includes(accountSearch.toLowerCase()) || 
           acc.accountType.toLowerCase().includes(accountSearch.toLowerCase());
  });

  const sortedAccounts = [...filteredAccounts].sort((a, b) => {
    if (accountSort === 'balance-desc') {
      return (b.currentBalance ?? 0) - (a.currentBalance ?? 0);
    } else if (accountSort === 'balance-asc') {
      return (a.currentBalance ?? 0) - (b.currentBalance ?? 0);
    } else if (accountSort === 'name-asc') {
      return a.bankName.localeCompare(b.bankName);
    } else if (accountSort === 'recent-activity') {
      const aTx = expenses.filter(e => e.linkedAccount?.id === a.id);
      const bTx = expenses.filter(e => e.linkedAccount?.id === b.id);
      const aLatest = aTx.length > 0 ? Math.max(...aTx.map(e => new Date(e.expenseDate).getTime())) : 0;
      const bLatest = bTx.length > 0 ? Math.max(...bTx.map(e => new Date(e.expenseDate).getTime())) : 0;
      return bLatest - aLatest;
    }
    return 0;
  });

  // Calculate Running Balances for Selected Account Statement Ledger
  const selectedAccountTransactions = selectedAccount ? expenses.filter((e) => e.linkedAccount?.id === selectedAccount.id) : [];
  
  const sortedTxnsAsc = [...selectedAccountTransactions].sort(
    (a, b) => new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime()
  );

  let runningBalanceTemp = selectedAccount ? (selectedAccount.openingBalance ?? 0) : 0;
  const txnsWithRunningBalance = sortedTxnsAsc.map(tx => {
    if (tx.type === 'CREDIT') {
      runningBalanceTemp += tx.amount;
    } else {
      runningBalanceTemp -= tx.amount;
    }
    return {
      ...tx,
      runningBalance: runningBalanceTemp
    };
  });

  const sortedLedgerTxns = [...txnsWithRunningBalance].sort(
    (a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()
  );

  // Filter statement ledger
  const filteredLedgerTxns = sortedLedgerTxns.filter(tx => {
    const matchesSearch = (tx.description || '').toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                          tx.category.toLowerCase().includes(ledgerSearch.toLowerCase());
    const matchesType = ledgerType === 'ALL' || tx.type === ledgerType;
    const matchesCategory = ledgerCategory === 'ALL' || tx.category === ledgerCategory;
    
    let matchesDate = true;
    if (ledgerStartDate) {
      matchesDate = matchesDate && new Date(tx.expenseDate) >= new Date(ledgerStartDate);
    }
    if (ledgerEndDate) {
      matchesDate = matchesDate && new Date(tx.expenseDate) <= new Date(ledgerEndDate);
    }

    let matchesAmount = true;
    if (ledgerMinAmount) {
      matchesAmount = matchesAmount && tx.amount >= parseFloat(ledgerMinAmount);
    }
    if (ledgerMaxAmount) {
      matchesAmount = matchesAmount && tx.amount <= parseFloat(ledgerMaxAmount);
    }

    return matchesSearch && matchesType && matchesCategory && matchesDate && matchesAmount;
  });

  // Pagination for Right Panel Ledger
  const txnStartIndex = (txnPage - 1) * txnItemsPerPage;
  const paginatedTransactions = filteredLedgerTxns.slice(txnStartIndex, txnStartIndex + txnItemsPerPage);
  const totalTxnPages = Math.ceil(filteredLedgerTxns.length / txnItemsPerPage);

  // Pagination for Left panel card view
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAccounts = sortedAccounts.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(sortedAccounts.length / itemsPerPage);

  // Summary Metrics calculations
  const totalBalanceAll = accounts.reduce((sum, a) => sum + (a.currentBalance ?? 0), 0);
  
  const now = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthTxns = expenses.filter(e => new Date(e.expenseDate) >= firstOfThisMonth);
  
  const thisMonthInflow = thisMonthTxns.filter(e => e.type === 'CREDIT').reduce((sum, e) => sum + e.amount, 0);
  const thisMonthOutflow = thisMonthTxns.filter(e => e.type === 'DEBIT').reduce((sum, e) => sum + e.amount, 0);
  
  const netChangeThisMonth = thisMonthInflow - thisMonthOutflow;
  const balanceEndOfLastMonth = totalBalanceAll - netChangeThisMonth;
  const netChangePercent = balanceEndOfLastMonth > 0 ? (netChangeThisMonth / balanceEndOfLastMonth) * 100 : 0;

  const uniqueLedgerCategories = Array.from(new Set(selectedAccountTransactions.map(t => t.category)));

  // Sparkline Generator
  const renderSparkline = useCallback((accId: string) => {
    const accTx = expenses
      .filter(e => e.linkedAccount?.id === accId)
      .sort((a, b) => new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime());
    
    if (accTx.length < 2) return null;
    
    let running = accounts.find(a => a.id === accId)?.openingBalance ?? 0;
    const runningBalances: number[] = [running];
    
    for (const tx of accTx) {
      if (tx.type === 'CREDIT') {
        running += tx.amount;
      } else {
        running -= tx.amount;
      }
      runningBalances.push(running);
    }
    
    const plotPoints = runningBalances.slice(-7);
    if (plotPoints.length < 2) return null;

    const min = Math.min(...plotPoints);
    const max = Math.max(...plotPoints);
    const range = max - min === 0 ? 1 : max - min;
    
    const width = 50;
    const height = 12;
    const padding = 1;
    
    const svgPoints = plotPoints.map((val, idx) => {
      const x = (idx / (plotPoints.length - 1)) * (width - 2 * padding) + padding;
      const y = height - ((val - min) / range) * (height - 2 * padding) - padding;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="inline-block opacity-70 ml-2">
        <polyline
          fill="none"
          stroke="#a78bfa"
          strokeWidth="1.5"
          points={svgPoints}
        />
      </svg>
    );
  }, [accounts, expenses]);

  const getAccountLastTxDate = useCallback((accId: string) => {
    const accTx = expenses.filter(e => e.linkedAccount?.id === accId);
    if (accTx.length === 0) return 'No tx';
    const dates = accTx.map(e => new Date(e.expenseDate).getTime());
    const latest = new Date(Math.max(...dates));
    return latest.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }, [expenses]);

  // Export handlers
  const handleExportLedgerCSV = () => {
    if (!selectedAccount) return;
    const headers = ['Date', 'Description', 'Category', 'Reference/UTR', 'Debit', 'Credit', 'Running Balance'];
    const exportData = filteredLedgerTxns.map(tx => [
      tx.expenseDate,
      tx.description || '',
      tx.category,
      tx.referenceNumber || tx.utr || '',
      tx.type === 'DEBIT' ? tx.amount : '',
      tx.type === 'CREDIT' ? tx.amount : '',
      tx.runningBalance
    ]);
    exportToCSV(exportData, headers, `${selectedAccount.bankName}_Ledger_Report`);
  };

  const handleExportLedgerPDF = () => {
    if (!selectedAccount) return;
    const headers = ['Date', 'Description', 'Category', 'Ref/UTR', 'Debit', 'Credit', 'Running Balance'];
    const exportData = filteredLedgerTxns.map(tx => [
      new Date(tx.expenseDate).toLocaleDateString(),
      tx.description || 'No description',
      tx.category,
      tx.referenceNumber || tx.utr || '-',
      tx.type === 'DEBIT' ? `₹${tx.amount.toLocaleString()}` : '-',
      tx.type === 'CREDIT' ? `₹${tx.amount.toLocaleString()}` : '-',
      `₹${tx.runningBalance.toLocaleString()}`
    ]);
    exportToPDF(`${selectedAccount.bankName} - Statement Ledger`, headers, exportData, `${selectedAccount.bankName}_Ledger_Report`);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bank Accounts</h1>
          <p className="text-sm text-muted-foreground">Manage your bank balances and view transaction sub-ledgers</p>
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
              onClick={() => setViewMode('detailed')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'detailed' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              title="Detailed Split-Ledger View (Default)"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Add Account
          </button>
        </div>
      </div>

      {/* Rule 1: Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Total Balance</span>
          <p className="text-lg font-mono font-bold text-foreground mt-1 tabular-nums">₹{totalBalanceAll.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">This Month Inflow</span>
          <p className="text-lg font-mono font-bold text-green-500 mt-1 tabular-nums">+₹{thisMonthInflow.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">This Month Outflow</span>
          <p className="text-lg font-mono font-bold text-red-500 mt-1 tabular-nums">-₹{thisMonthOutflow.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Net Monthly Delta</span>
          <p className={`text-lg font-mono font-bold mt-1 tabular-nums ${netChangeThisMonth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {netChangeThisMonth >= 0 ? '▲' : '▼'} {Math.abs(netChangePercent).toFixed(1)}%
          </p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Accounts Count</span>
          <p className="text-lg font-mono font-bold text-foreground mt-1 tabular-nums">{accounts.length}</p>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground bg-card border border-border rounded-lg">
          No bank accounts added yet. Track your liquid assets and bank balances here.
        </div>
      ) : viewMode === 'card' ? (
        /* Grid Card View */
        <div className="space-y-6 flex-1 flex flex-col min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-1">
            {paginatedAccounts.map((acc) => (
              <div key={acc.id} className="p-5 rounded-xl shadow-sm border border-border/50 bg-card hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 text-primary rounded-lg">
                        <Landmark className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-foreground">{acc.bankName}</h3>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">{acc.accountType}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(acc.id)} className="text-muted-foreground hover:text-red-500 p-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mb-4">
                    <span className="text-[10px] text-muted-foreground uppercase">Holder</span>
                    <p className="font-medium text-sm text-foreground">{acc.accountHolderName}</p>
                  </div>

                  <div className="flex justify-between items-end border-t border-border/30 pt-3">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase">Number</span>
                      <p className="font-mono text-xs text-foreground mt-0.5">{acc.accountNumber}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground uppercase">Balance</span>
                      <p className="font-mono font-bold text-sm text-foreground tabular-nums">₹{(acc.currentBalance ?? 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {sortedAccounts.length > 0 && (
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
                  <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, sortedAccounts.length)}</span> of{' '}
                  <span className="font-semibold text-foreground">{sortedAccounts.length}</span> results
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
      ) : (
        /* Rule 4: Detailed Split-Pane Ledger View (Default) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
          
          {/* Left panel Account Selection */}
          <div className="lg:col-span-4 flex flex-col gap-3 min-h-0 bg-card/20 border border-border/50 p-3 rounded-2xl">
            {/* Search & Sort above account list */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search accounts..."
                  value={accountSearch}
                  onChange={(e) => setAccountSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 w-full bg-background border border-border rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>
              <select
                value={accountSort}
                onChange={(e) => setAccountSort(e.target.value as any)}
                className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground outline-none cursor-pointer focus:ring-1 focus:ring-primary"
              >
                <option value="balance-desc">Sort by: Balance (High-Low)</option>
                <option value="balance-asc">Sort by: Balance (Low-High)</option>
                <option value="name-asc">Sort by: Name (A-Z)</option>
                <option value="recent-activity">Sort by: Most Recent Activity</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {sortedAccounts.map((acc) => (
                <div
                  key={acc.id}
                  onClick={() => setExpandedAccountId(acc.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedAccount?.id === acc.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:bg-muted/50 bg-card'
                  }`}
                >
                  {/* Line 1: Bank/Account name + Account type badge + Balance (right-aligned) */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-xs text-foreground truncate leading-tight">{acc.bankName}</h4>
                      <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase block mt-1 w-max">
                        {acc.accountType}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-foreground tabular-nums">
                        ₹{(acc.currentBalance ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Line 2: Last 4 digits • Last transaction date • Sparkline */}
                  <div className="mt-2.5 pt-2 border-t border-border/30 flex items-center justify-between text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-mono">**{acc.accountNumber.slice(-4)}</span>
                      <span>•</span>
                      <span>Last: {getAccountLastTxDate(acc.id)}</span>
                    </div>
                    <div className="shrink-0 flex items-center">
                      {renderSparkline(acc.id)}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(acc.id);
                        }}
                        className="text-muted-foreground hover:text-red-500 p-1 ml-2 rounded hover:bg-muted"
                        title="Delete Bank Account"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel statement ledger */}
          <div className="lg:col-span-8 bg-card border border-border/50 rounded-2xl p-4 flex flex-col h-[calc(100vh-16rem)] overflow-hidden">
            {selectedAccount ? (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
                
                {/* Header Information Panel */}
                <div className="border-b border-border/50 pb-3 mb-3 shrink-0">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <h3 className="font-bold text-base text-foreground leading-tight">{selectedAccount.bankName}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                        Holder: {selectedAccount.accountHolderName} | Number: {selectedAccount.accountNumber}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-bold leading-tight">Opening Balance</span>
                        <span className="text-xs font-semibold text-foreground font-mono tabular-nums">
                          ₹{(selectedAccount.openingBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-bold leading-tight">Current Balance</span>
                        <span className="text-sm font-bold text-primary font-mono tabular-nums">
                          ₹{(selectedAccount.currentBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ledger Filters + Export Options */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3 bg-muted/20 p-2.5 rounded-xl border border-border/50 shrink-0">
                  {/* Search Description */}
                  <div className="relative md:col-span-1">
                    <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search ledger..."
                      value={ledgerSearch}
                      onChange={(e) => setLedgerSearch(e.target.value)}
                      className="pl-7 pr-2 py-1 w-full bg-background border border-border rounded text-xs outline-none focus:ring-1 focus:ring-primary text-foreground"
                    />
                  </div>

                  {/* Filter Selects */}
                  <select
                    value={ledgerType}
                    onChange={(e) => setLedgerType(e.target.value as any)}
                    className="px-2 py-1 bg-background border border-border rounded text-xs text-foreground outline-none cursor-pointer focus:ring-1 focus:ring-primary"
                  >
                    <option value="ALL">All Types</option>
                    <option value="DEBIT">Debits Only</option>
                    <option value="CREDIT">Credits Only</option>
                  </select>

                  <select
                    value={ledgerCategory}
                    onChange={(e) => setLedgerCategory(e.target.value)}
                    className="px-2 py-1 bg-background border border-border rounded text-xs text-foreground outline-none cursor-pointer focus:ring-1 focus:ring-primary"
                  >
                    <option value="ALL">All Categories</option>
                    {uniqueLedgerCategories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  {/* Export Options */}
                  <div className="flex items-center justify-end gap-1.5 md:col-span-1">
                    <button
                      onClick={handleExportLedgerCSV}
                      className="flex items-center gap-1 px-2.5 py-1 bg-muted hover:bg-muted/80 border border-border/50 text-muted-foreground hover:text-foreground text-[10px] font-bold uppercase rounded cursor-pointer transition-colors"
                      title="Export CSV"
                    >
                      <Download className="h-3 w-3" /> CSV
                    </button>
                    <button
                      onClick={handleExportLedgerPDF}
                      className="flex items-center gap-1 px-2.5 py-1 bg-muted hover:bg-muted/80 border border-border/50 text-muted-foreground hover:text-foreground text-[10px] font-bold uppercase rounded cursor-pointer transition-colors"
                      title="Export PDF"
                    >
                      <Printer className="h-3 w-3" /> PDF
                    </button>
                  </div>
                </div>

                {/* Rule 5 Statement Ledger Table */}
                <div className="flex-1 overflow-auto custom-scrollbar border border-border/20 rounded-xl min-h-0">
                  {paginatedTransactions.length === 0 ? (
                    <div className="text-center py-12 bg-background/10">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                      <p className="text-xs text-muted-foreground">
                        {selectedAccountTransactions.length === 0 
                          ? 'No transactions logged against this account.' 
                          : 'No transactions match the active filters.'}
                      </p>
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-border/20 dense-table text-left">
                      <thead className="bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
                        <tr>
                          <th className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                          <th className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Description</th>
                          <th className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Category</th>
                          <th className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ref/UTR</th>
                          <th className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Debit</th>
                          <th className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Credit</th>
                          <th className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Running Balance</th>
                        </tr>
                      </thead>
                      <tbody className="bg-card/50 divide-y divide-border/20">
                        {paginatedTransactions.map((tx, idx) => {
                          const isDebit = tx.type === 'DEBIT';
                          return (
                            <tr 
                              key={tx.id} 
                              className={`hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? 'bg-background/25' : 'bg-card/15'}`}
                            >
                              <td className="px-3 py-2 whitespace-nowrap font-mono tabular-nums text-muted-foreground text-xs">
                                {new Date(tx.expenseDate).toLocaleDateString()}
                              </td>
                              <td className="px-3 py-2 text-foreground font-medium text-xs max-w-[150px] truncate" title={tx.description}>
                                {tx.description || '-'}
                              </td>
                              <td className="px-3 py-2 text-xs">
                                <span className="px-1.5 py-0.5 rounded bg-muted/65 text-muted-foreground text-[10px] font-medium border border-border/30">
                                  {tx.category}
                                </span>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-muted-foreground text-[10px] font-mono">
                                {tx.referenceNumber || tx.utr || '-'}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-right font-mono text-red-500 font-semibold tabular-nums text-xs">
                                {isDebit ? `₹${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-right font-mono text-green-500 font-semibold tabular-nums text-xs">
                                {!isDebit ? `₹${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-right font-mono text-foreground font-bold tabular-nums text-xs">
                                ₹{tx.runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Ledger Pagination Controls */}
                {filteredLedgerTxns.length > 0 && (
                  <div className="border-t border-border/50 pt-2 mt-2 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                      <span>
                        Showing <span className="font-semibold text-foreground">{txnStartIndex + 1}</span> to{' '}
                        <span className="font-semibold text-foreground">{Math.min(txnStartIndex + txnItemsPerPage, filteredLedgerTxns.length)}</span> of{' '}
                        <span className="font-semibold text-foreground">{filteredLedgerTxns.length}</span> txns
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span>Show</span>
                        <select
                          value={txnItemsPerPage}
                          onChange={(e) => {
                            setTxnItemsPerPage(Number(e.target.value));
                            setTxnPage(1);
                          }}
                          className="px-1.5 py-0.5 rounded bg-card border border-border text-foreground text-[10px] outline-none cursor-pointer focus:ring-1 focus:ring-primary"
                        >
                          <option value={15}>15 entries</option>
                          <option value={30}>30 entries</option>
                          <option value={50}>50 entries</option>
                        </select>
                      </div>
                    </div>
                    {totalTxnPages > 1 && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setTxnPage(prev => Math.max(prev - 1, 1))}
                          disabled={txnPage === 1}
                          className="p-1 rounded border border-border bg-card hover:bg-muted text-muted-foreground disabled:opacity-40"
                          title="Previous Page"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <span className="text-[10px] text-muted-foreground px-2">
                          Page <span className="font-semibold text-foreground">{txnPage}</span> of {totalTxnPages}
                        </span>
                        <button
                          onClick={() => setTxnPage(prev => Math.min(prev + 1, totalTxnPages))}
                          disabled={txnPage === totalTxnPages}
                          className="p-1 rounded border border-border bg-card hover:bg-muted text-muted-foreground disabled:opacity-40"
                          title="Next Page"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )}

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <Landmark className="h-10 w-10 stroke-1 mb-2 opacity-50" />
                <p className="text-xs">Select a bank account on the left to view statement ledger sheets.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Add Bank Account</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Bank Name</label>
                <input required value={formData.bankName} onChange={e => setFormData({ ...formData, bankName: e.target.value })} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" placeholder="HDFC, SBI, etc." />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Account Holder Name</label>
                <input required value={formData.accountHolderName} onChange={e => setFormData({ ...formData, accountHolderName: e.target.value })} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Account Number</label>
                <input required value={formData.accountNumber} onChange={e => setFormData({ ...formData, accountNumber: e.target.value })} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" placeholder="Full Account Number" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Account Type</label>
                <select value={formData.accountType} onChange={e => setFormData({ ...formData, accountType: e.target.value })} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm text-foreground">
                  <option value="Savings">Savings</option>
                  <option value="Current">Current</option>
                  <option value="Salary">Salary</option>
                  <option value="Credit Card">Credit Card</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Opening Balance (₹)</label>
                  <input required type="number" value={formData.openingBalance || ''} onChange={e => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) })} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Current Balance (₹)</label>
                  <input required type="number" value={formData.currentBalance || ''} onChange={e => setFormData({ ...formData, currentBalance: parseFloat(e.target.value) })} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" placeholder="0.00" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">Save Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
