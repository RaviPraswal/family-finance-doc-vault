import { useEffect, useState, useMemo } from 'react';
import { apiClient } from '../api/client';
import { useToastStore } from '../store/toastStore';
import { useConfirmStore } from '../store/confirmStore';
import { Plus, Banknote, Trash2, Search, Download, Printer, Calendar, TrendingUp, BarChart3, PieChart } from 'lucide-react';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';

interface IncomeSource {
  id: string;
  sourceName: string;
  ownerName: string;
  amount: number;
  frequency: string;
  dateReceived: string;
}

interface BankAccount {
  id: string;
  name: string;
  bankName: string;
}

export default function SideIncome() {
  const toast = useToastStore();
  const confirm = useConfirmStore();
  const [incomes, setIncomes] = useState<IncomeSource[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  
  // Modals / Quick Actions
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  
  // Form states
  const [formData, setFormData] = useState<Partial<IncomeSource>>({
    sourceName: '',
    ownerName: ''
  });

  const [receiveForm, setReceiveForm] = useState({
    amount: '',
    bankAccountId: '',
    expenseDate: new Date().toISOString().split('T')[0],
    description: '',
    category: 'Side Income'
  });

  // Table filtering and pagination states
  const [search, setSearch] = useState('');
  const [filterSourceId, setFilterSourceId] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchIncomes();
    fetchExpenses();
    fetchBankAccounts();
  }, []);

  const fetchIncomes = async () => {
    try {
      const data = await apiClient('/api/incomesources');
      setIncomes(data);
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

  const fetchBankAccounts = async () => {
    try {
      const data = await apiClient('/api/bankaccounts');
      setBankAccounts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/api/incomesources', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          amount: 0,
          frequency: 'One-time'
        })
      });
      setIsModalOpen(false);
      setFormData({ sourceName: '', ownerName: '' });
      toast.success('Income source saved', 'Your side income source has been added successfully.');
      fetchIncomes();
    } catch (err: any) {
      toast.error('Failed to save', err.message || 'Could not save income source. Please try again.');
    }
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSourceId) return;
    try {
      await apiClient('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat(receiveForm.amount),
          category: receiveForm.category,
          expenseDate: receiveForm.expenseDate,
          description: receiveForm.description,
          type: 'CREDIT',
          madeAgainst: 'INCOME_SOURCE',
          linkedAccount: receiveForm.bankAccountId ? { id: receiveForm.bankAccountId } : null,
          linkedIncomeSource: { id: selectedSourceId }
        })
      });

      // Update dateReceived in the income source
      const matchedSource = incomes.find(i => i.id === selectedSourceId);
      if (matchedSource) {
        await apiClient(`/api/incomesources/${selectedSourceId}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...matchedSource,
            dateReceived: receiveForm.expenseDate
          })
        });
      }

      setIsReceiveOpen(false);
      setReceiveForm({ amount: '', bankAccountId: '', expenseDate: new Date().toISOString().split('T')[0], description: '', category: 'Side Income' });
      toast.success('Inflow recorded', 'The credit transaction was successfully logged.');
      fetchExpenses();
      fetchIncomes();
    } catch (err: any) {
      toast.error('Failed to save credit transaction', err.message || 'Error occurred.');
    }
  };

  const handleDelete = async (id: string) => {
    confirm.show({
      title: 'Delete Income Source',
      message: 'Are you sure you want to delete this income source? This action cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          await apiClient(`/api/incomesources/${id}`, { method: 'DELETE' });
          toast.success('Income source deleted', 'The income source has been removed.');
          fetchIncomes();
        } catch (err: any) {
          toast.error('Cannot delete income source', err.message || 'Failed to delete income source.');
        }
      },
    });
  };

  const handleDeleteTx = async (id: string) => {
    confirm.show({
      title: 'Delete Transaction',
      message: 'Are you sure you want to delete this credit statement entry?',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          await apiClient(`/api/expenses/${id}`, { method: 'DELETE' });
          toast.success('Transaction deleted', 'The entry has been deleted.');
          fetchExpenses();
        } catch (err: any) {
          toast.error('Cannot delete transaction', err.message || 'Failed.');
        }
      }
    });
  };

  // 1. Expected and Received Income Calculations
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const creditTransactions = useMemo(() => {
    return expenses.filter(e => e.type === 'CREDIT' && e.madeAgainst === 'INCOME_SOURCE');
  }, [expenses]);

  const receivedThisMonth = useMemo(() => {
    return creditTransactions
      .filter(e => {
        const d = new Date(e.expenseDate);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + e.amount, 0);
  }, [creditTransactions, currentMonth, currentYear]);

  const expectedMonthly = useMemo(() => {
    return incomes
      .filter(i => i.frequency === 'Monthly')
      .reduce((sum, i) => sum + i.amount, 0);
  }, [incomes]);

  const outstandingCollect = Math.max(0, expectedMonthly - receivedThisMonth);
  const coverageRatio = expectedMonthly > 0 ? Math.round((receivedThisMonth / expectedMonthly) * 100) : 0;
  const allTimeTotal = creditTransactions.reduce((sum, e) => sum + e.amount, 0);

  // 2. Filter & Sort Inflow History Statement Table
  const filteredTxns = useMemo(() => {
    return creditTransactions
      .filter(tx => {
        const sourceName = tx.linkedIncomeSource?.sourceName || '';
        const matchesSearch = sourceName.toLowerCase().includes(search.toLowerCase()) ||
                              (tx.category || '').toLowerCase().includes(search.toLowerCase()) ||
                              (tx.description || '').toLowerCase().includes(search.toLowerCase());
        const matchesSource = filterSourceId === 'ALL' || tx.linkedIncomeSource?.id === filterSourceId;
        return matchesSearch && matchesSource;
      })
      .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
  }, [creditTransactions, search, filterSourceId]);

  // Paginated Ledger History
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTxns = filteredTxns.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(filteredTxns.length / itemsPerPage);

  // 3. Calendar Day Grid mapping side-inflow collections
  const calendarDays = useMemo(() => {
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysArr = [];
    for (let day = 1; day <= totalDays; day++) {
      const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTxns = creditTransactions.filter(e => e.expenseDate === formattedDate);
      const totalAmt = dayTxns.reduce((sum, e) => sum + e.amount, 0);
      daysArr.push({ day, amount: totalAmt });
    }
    return daysArr;
  }, [creditTransactions, currentMonth, currentYear]);

  // 4. Monthly Trend (6 months history calculation)
  const monthlyTrendData = useMemo(() => {
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const total = creditTransactions
        .filter(e => {
          const date = new Date(e.expenseDate);
          return date.getMonth() === m && date.getFullYear() === y;
        })
        .reduce((sum, e) => sum + e.amount, 0);
      
      trend.push({ monthStr: `${months[m]}`, amount: total });
    }
    return trend;
  }, [creditTransactions, now]);

  // Max value in trend for scale
  const maxTrendVal = useMemo(() => {
    const max = Math.max(...monthlyTrendData.map(t => t.amount));
    return max > 0 ? max : 10000;
  }, [monthlyTrendData]);

  // 5. Projected Upcoming Inflows pipeline (30 Days window prediction)
  const upcomingInflows = useMemo(() => {
    const predicted = [];
    const today = new Date();
    for (const source of incomes) {
      if (source.frequency === 'Monthly') {
        const lastDate = source.dateReceived ? new Date(source.dateReceived) : new Date(now.getFullYear(), now.getMonth() - 1, 15);
        const nextDate = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, lastDate.getDate());
        
        // check if nextDate is in future or today
        if (nextDate >= today) {
          predicted.push({
            sourceName: source.sourceName,
            amount: source.amount,
            nextDate: nextDate.toLocaleDateString(),
            daysLeft: Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
          });
        }
      }
    }
    return predicted.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [incomes, now]);

  // Exporters
  const handleExportCSV = () => {
    const headers = ['Date', 'Source Channel', 'Inflow Category', 'Bank Received', 'Description', 'Amount Received'];
    const exportData = filteredTxns.map(tx => [
      tx.expenseDate,
      tx.linkedIncomeSource?.sourceName || 'Direct',
      tx.category,
      tx.linkedAccount?.name || '-',
      tx.description || '',
      tx.amount
    ]);
    exportToCSV(exportData, headers, 'Side_Income_Statement');
  };

  const handleExportPDF = () => {
    const headers = ['Date', 'Source Channel', 'Category', 'Bank account', 'Amount'];
    const exportData = filteredTxns.map(tx => [
      tx.expenseDate,
      tx.linkedIncomeSource?.sourceName || 'Direct',
      tx.category,
      tx.linkedAccount?.name || '-',
      `₹${tx.amount.toLocaleString()}`
    ]);
    exportToPDF('Side Inflows Statement Ledger', headers, exportData, 'Side_Income_Statement');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-sans">Side Income Dashboard</h1>
          <p className="text-sm text-muted-foreground">Monitor freelancing, rental yields, and business cashflow with real-time statement ledgers</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 text-sm font-medium transition-all"
        >
          <Plus className="h-4 w-4" /> Add Income Channel
        </button>
      </div>


      {/* Main Single Screen Dense Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* Left Columns (col-span-8): Graphs, Heatmap, Ledger */}
        <div className="lg:col-span-8 flex flex-col gap-6 h-full min-h-0">
          

          {/* Bottom Panel: Ledger history list table */}
          <div className="bg-card border border-border/50 rounded-2xl flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="p-3.5 border-b border-border/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search history..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 pr-2.5 py-1 bg-background border border-border rounded text-xs outline-none focus:ring-1 focus:ring-primary w-48 text-foreground"
                  />
                </div>
                
                <select
                  value={filterSourceId}
                  onChange={(e) => setFilterSourceId(e.target.value)}
                  className="px-2 py-1 bg-background border border-border rounded text-xs text-foreground outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="ALL">All Source Channels</option>
                  {incomes.map(inc => (
                    <option key={inc.id} value={inc.id}>{inc.sourceName}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded text-[10px] font-medium border border-border/50 transition-all cursor-pointer"
                >
                  <Download className="h-3 w-3" /> CSV
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded text-[10px] font-medium border border-border/50 transition-all cursor-pointer"
                >
                  <Printer className="h-3 w-3" /> PDF
                </button>
              </div>
            </div>

            <div className="overflow-auto custom-scrollbar flex-1">
              <table className="min-w-full divide-y divide-border dense-table">
                <thead className="bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Income Source</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Category</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Target Bank</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Description</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Inflow credit</th>
                    <th className="px-4 py-2 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card/50">
                  {paginatedTxns.map((tx, idx) => (
                    <tr key={tx.id} className={`hover:bg-muted/30 transition-colors group ${idx % 2 === 0 ? 'bg-background/20' : 'bg-card/10'}`}>
                      <td className="px-4 py-2 whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {tx.expenseDate}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center text-xs font-semibold text-foreground">
                          <Banknote className="h-3.5 w-3.5 text-muted-foreground mr-1.5 shrink-0" />
                          {tx.linkedIncomeSource?.sourceName || 'Direct Inflow'}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-foreground font-medium">
                        {tx.category}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-muted-foreground font-medium">
                        {tx.linkedAccount?.name || '-'}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground max-w-[150px] truncate" title={tx.description}>
                        {tx.description || '-'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap font-mono font-bold text-green-500 text-sm tabular-nums">
                        +₹{tx.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right text-xs whitespace-nowrap">
                        <button 
                          onClick={() => handleDeleteTx(tx.id)} 
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all p-0.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredTxns.length > 0 && (
              <div className="flex items-center justify-between border-t border-border/50 p-2.5 bg-muted/10 shrink-0 text-xs">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded border border-border bg-card px-3 py-1.5 font-medium text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded border border-border bg-card px-3 py-1.5 font-medium text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between font-sans">
                  <p className="text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{' '}
                    <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, filteredTxns.length)}</span> of{' '}
                    <span className="font-semibold text-foreground">{filteredTxns.length}</span> results
                  </p>
                  {totalPages > 1 && (
                    <nav className="isolate inline-flex -space-x-px rounded shadow-xs" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-1.5 text-muted-foreground ring-1 ring-inset ring-border bg-card hover:bg-muted disabled:opacity-50 rounded-l"
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-1.5 text-muted-foreground ring-1 ring-inset ring-border bg-card hover:bg-muted disabled:opacity-50 rounded-r"
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (col-span-4): Source Channels Directory, Projections, Share */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-full min-h-0 overflow-y-auto pr-1 custom-scrollbar">
          
          {/* Income Source Channels */}
          <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-col">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3.5 flex items-center justify-between">
              <span>Income Channels Directory</span>
              <span className="text-[10px] text-muted-foreground font-mono">{incomes.length} channels</span>
            </h3>

            <div className="space-y-2">
              {incomes.map(source => {
                const isReceived = creditTransactions.some(e => {
                  const d = new Date(e.expenseDate);
                  return e.linkedIncomeSource?.id === source.id && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                });

                // Calculate upcoming projection if pending and monthly
                let projectionInfo = null;
                if (!isReceived && source.frequency === 'Monthly') {
                  const today = new Date();
                  const lastDate = source.dateReceived ? new Date(source.dateReceived) : new Date(now.getFullYear(), now.getMonth() - 1, 15);
                  const nextDate = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, lastDate.getDate());
                  const daysLeft = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
                  projectionInfo = {
                    nextDate: nextDate.toLocaleDateString(),
                    daysLeft
                  };
                }

                const channelTxns = creditTransactions.filter(e => e.linkedIncomeSource?.id === source.id);
                const lastTxn = channelTxns.length > 0 
                  ? [...channelTxns].sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime())[0]
                  : null;

                const totalCollected = channelTxns.reduce((sum, e) => sum + e.amount, 0);

                return (
                  <div key={source.id} className="p-3 rounded-lg border border-border/40 bg-card/65 hover:bg-muted/15 transition-all flex items-center justify-between group">
                    <div>
                      <h4 className="text-xs font-bold text-foreground leading-tight flex items-center gap-1.5">
                        {source.sourceName}
                        {isReceived ? (
                          <span className="text-[8px] bg-green-500/10 text-green-500 font-bold px-1 rounded uppercase">Collected</span>
                        ) : (
                          <span className="text-[8px] bg-amber-500/10 text-amber-500 font-bold px-1 rounded uppercase">Pending</span>
                        )}
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-medium uppercase">
                        {source.frequency} • {source.ownerName}
                      </p>
                      {projectionInfo && (
                        <p className="text-[9px] text-amber-500 font-bold mt-1">
                          Due: {projectionInfo.nextDate} ({projectionInfo.daysLeft} days left)
                        </p>
                      )}
                      <p className="text-[9px] text-muted-foreground font-mono mt-1">
                        Last credit: {lastTxn ? `₹${lastTxn.amount.toLocaleString()} on ${new Date(lastTxn.expenseDate).toLocaleDateString()}` : 'Never'}
                      </p>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1.5">
                      <span className="text-xs font-mono font-bold text-green-500 tabular-nums">
                        ₹{totalCollected.toLocaleString()}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedSourceId(source.id);
                            setReceiveForm(prev => ({
                              ...prev,
                              amount: '0'
                            }));
                            setIsReceiveOpen(true);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-[10px] bg-primary/10 text-primary hover:bg-primary hover:text-white px-2 py-0.5 rounded font-bold transition-all cursor-pointer"
                        >
                          + Receive
                        </button>
                        <button
                          onClick={() => handleDelete(source.id)}
                          className="text-muted-foreground hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>



        </div>
      </div>

      {/* Add Income Source Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-5 max-w-sm w-full shadow-2xl">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">Add Side Income Channel</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Source Name</label>
                <input required value={formData.sourceName} onChange={e => setFormData({...formData, sourceName: e.target.value})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary outline-none transition-all text-xs" placeholder="e.g. Rent, Freelancing" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Owner Name</label>
                <input required value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary outline-none transition-all text-xs" placeholder="e.g. Self, Partner" />
              </div>
              {/* Removed Expected Amount and Frequency fields */}
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs text-muted-foreground hover:bg-muted rounded-lg font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs bg-primary text-white rounded-lg hover:bg-primary/90 font-bold transition-all">Save Channel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Receive Collection Modal */}
      {isReceiveOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-5 max-w-sm w-full shadow-2xl">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">Log Received credit Inflow</h2>
            <form onSubmit={handleReceiveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Inflow Amount (₹)</label>
                <input required type="number" value={receiveForm.amount} onChange={e => setReceiveForm({...receiveForm, amount: e.target.value})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary outline-none transition-all text-xs font-mono" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Receive Bank Account</label>
                <select required value={receiveForm.bankAccountId} onChange={e => setReceiveForm({...receiveForm, bankAccountId: e.target.value})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary outline-none transition-all text-xs cursor-pointer">
                  <option value="">-- Select Destination Bank --</option>
                  {bankAccounts.map(ba => (
                    <option key={ba.id} value={ba.id}>{ba.name} ({ba.bankName})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Receive Date</label>
                <input required type="date" value={receiveForm.expenseDate} onChange={e => setReceiveForm({...receiveForm, expenseDate: e.target.value})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary outline-none transition-all text-xs" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Credit Category</label>
                <input required value={receiveForm.category} onChange={e => setReceiveForm({...receiveForm, category: e.target.value})} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary outline-none transition-all text-xs" placeholder="e.g. Side Income, Rental Inflow" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Optional Memo / Description</label>
                <textarea value={receiveForm.description} onChange={e => setReceiveForm({...receiveForm, description: e.target.value})} className="w-full p-2 rounded-lg bg-background text-foreground border border-border focus:border-primary outline-none text-xs" placeholder="Transaction details..." rows={2} />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsReceiveOpen(false)} className="px-4 py-2 text-xs text-muted-foreground hover:bg-muted rounded-lg font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs bg-primary text-white rounded-lg hover:bg-primary/90 font-bold transition-all">Submit Inflow</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
