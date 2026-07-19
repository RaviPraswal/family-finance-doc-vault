import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useToastStore } from '../store/toastStore';
import { useConfirmStore } from '../store/confirmStore';
import { Plus, Briefcase, Trash2 } from 'lucide-react';

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
      await apiClient('/api/investments', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setIsModalOpen(false);
      setFormData({ type: 'Mutual Fund', name: '', investedAmount: 0, currentValue: 0 });
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

  const [viewMode, setViewMode] = useState<'card' | 'list' | 'detailed'>('card');
  const [selectedInvestmentId, setSelectedInvestmentId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset page on viewMode change
  useEffect(() => {
    setItemsPerPage(viewMode === 'card' ? 6 : 10);
    setCurrentPage(1);
  }, [viewMode]);

  // Select first investment if none selected
  useEffect(() => {
    if (investments.length > 0 && !selectedInvestmentId) {
      setSelectedInvestmentId(investments[0].id);
    }
  }, [investments, selectedInvestmentId]);

  const selectedInvestment = investments.find(i => i.id === selectedInvestmentId) || investments[0];

  // Pagination calculations
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInvestments = investments.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(investments.length / itemsPerPage);

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
              title="List View"
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
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Add Investment
          </button>
        </div>
      </div>

      {investments.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground bg-card border border-border rounded-lg">
          No investments found. Add your mutual funds, stocks, or gold to track performance.
        </div>
      ) : viewMode === 'card' ? (
        /* Card View */
        <div className="space-y-6 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedInvestments.map((inv) => {
              const returns = inv.currentValue - inv.investedAmount;
              const returnPercent = inv.investedAmount > 0 ? (returns / inv.investedAmount) * 100 : 0;
              return (
                <div key={inv.id} className="bg-card p-6 rounded-lg shadow-sm border border-border flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                          <Briefcase className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base text-foreground">{inv.name}</h3>
                          <p className="text-xs text-muted-foreground">{inv.type}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(inv.id)} className="text-muted-foreground hover:text-red-500 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Invested:</span>
                        <span className="font-medium text-foreground">₹{inv.investedAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current Value:</span>
                        <span className="font-semibold text-foreground">₹{inv.currentValue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-border">
                        <span className="text-muted-foreground">Returns:</span>
                        <span className={`font-semibold ${returns >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {returns >= 0 ? '+' : ''}₹{returns.toLocaleString()} ({returnPercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {investments.length > 0 && (
            <div className="flex items-center justify-between border-t border-border/50 pt-4 mt-6">
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
                    <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, investments.length)}</span> of{' '}
                    <span className="font-semibold text-foreground">{investments.length}</span> results
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
                      <option value={48}>48 cards</option>
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
        /* List View (Table) */
        <div className="space-y-6 flex-1 flex flex-col min-h-0">
          <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden h-[calc(100vh-10rem)] overflow-y-auto custom-scrollbar flex-1">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-background sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Asset Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Asset Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Invested Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Gain/Loss</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-gray-200">
                {paginatedInvestments.map((inv) => {
                  const gainLoss = inv.currentValue - inv.investedAmount;
                  const isGain = gainLoss >= 0;
                  const percent = inv.investedAmount > 0 ? (gainLoss / inv.investedAmount) * 100 : 0;

                  return (
                    <tr key={inv.id} className="hover:bg-background/80 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Briefcase className="h-5 w-5 text-muted-foreground mr-3" />
                          <div className="text-sm font-medium text-foreground">{inv.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {inv.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground text-sm">
                        ₹{inv.investedAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-foreground text-sm">
                        ₹{inv.currentValue.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center font-semibold ${isGain ? 'text-green-500' : 'text-red-500'}`}>
                          {isGain ? '+' : ''}₹{gainLoss.toLocaleString()} ({percent.toFixed(1)}%)
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleDelete(inv.id)} className="text-red-600 hover:text-red-900">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {investments.length > 0 && (
            <div className="flex items-center justify-between border-t border-border/50 pt-4 mt-2">
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
                    <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, investments.length)}</span> of{' '}
                    <span className="font-semibold text-foreground">{investments.length}</span> results
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
                      <option value={10}>10 entries</option>
                      <option value={20}>20 entries</option>
                      <option value={50}>50 entries</option>
                      <option value={100}>100 entries</option>
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
      ) : (
        /* Detailed Split-Pane View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
          <div className="lg:col-span-4 space-y-3 overflow-y-auto h-[calc(100vh-10rem)] pr-2 custom-scrollbar">
            {investments.map((inv) => (
              <div
                key={inv.id}
                onClick={() => setSelectedInvestmentId(inv.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedInvestment?.id === inv.id
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:bg-muted/50 bg-card'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${selectedInvestment?.id === inv.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">{inv.name}</h4>
                      <p className="text-xs text-muted-foreground">{inv.type}</p>
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
                <div className="mt-3 flex justify-between items-baseline">
                  <span className="text-xs text-muted-foreground">Current Value:</span>
                  <span className="text-sm font-bold text-foreground">₹{inv.currentValue.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-8 bg-card border border-border rounded-xl p-6 flex flex-col h-[calc(100vh-10rem)] overflow-hidden">
            {selectedInvestment ? (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="border-b border-border/50 pb-4 mb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{selectedInvestment.name}</h3>
                      <p className="text-xs text-muted-foreground">Asset Class: {selectedInvestment.type}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block">Current Portfolio Value</span>
                      <span className="text-2xl font-bold text-primary">₹{selectedInvestment.currentValue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-6">
                  {/* Performance Indicators */}
                  <div className="grid grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                    <div>
                      <span className="text-xs text-muted-foreground block">Invested Amount</span>
                      <span className="text-base font-semibold text-foreground">₹{selectedInvestment.investedAmount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Gain/Loss</span>
                      <span className={`text-base font-bold ${selectedInvestment.currentValue - selectedInvestment.investedAmount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ₹{(selectedInvestment.currentValue - selectedInvestment.investedAmount).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Returns %</span>
                      <span className={`text-base font-bold ${selectedInvestment.currentValue - selectedInvestment.investedAmount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {selectedInvestment.investedAmount > 0 
                          ? ((selectedInvestment.currentValue - selectedInvestment.investedAmount) / selectedInvestment.investedAmount * 100).toFixed(2)
                          : '0.00'}%
                      </span>
                    </div>
                  </div>

                  {/* Transaction log */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Transaction History</h4>
                    <div className="space-y-2">
                      {expenses.filter((e) => e.linkedInvestment?.id === selectedInvestment.id).length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center bg-background/30 rounded-lg">No transactions logged against this asset.</p>
                      ) : (
                        expenses
                          .filter((e) => e.linkedInvestment?.id === selectedInvestment.id)
                          .map((exp) => {
                            const isContribution = exp.type === 'DEBIT';
                            return (
                              <div
                                key={exp.id}
                                className="flex justify-between items-center p-3 rounded-lg border border-border/30 bg-background/50 hover:bg-background/85 transition-colors"
                              >
                                <div>
                                  <div className="font-semibold text-sm text-foreground">{exp.category}</div>
                                  <div className="text-xs text-muted-foreground">{exp.expenseDate}</div>
                                  {exp.description && <p className="text-xs text-muted-foreground italic mt-1">{exp.description}</p>}
                                </div>
                                <span className={`font-bold text-sm ${isContribution ? 'text-green-500' : 'text-red-500'}`}>
                                  {isContribution ? '+' : '-'}₹{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                <Briefcase className="h-12 w-12 stroke-1 mb-2 opacity-50" />
                <p className="text-sm">Select an investment asset on the left to view metrics and inflows.</p>
              </div>
            )}
          </div>
        </div>
      )}


      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Add Investment</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Asset Class</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all">
                  <option value="Mutual Fund">Mutual Fund</option>
                  <option value="Stocks">Stocks</option>
                  <option value="Gold">Gold</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="PPF">PPF</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Asset Name (e.g., HDFC Midcap)</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Invested Amount (₹)</label>
                <input required type="number" value={formData.investedAmount} onChange={e => setFormData({...formData, investedAmount: parseFloat(e.target.value)})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Current Value (₹)</label>
                <input required type="number" value={formData.currentValue} onChange={e => setFormData({...formData, currentValue: parseFloat(e.target.value)})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90">Save Investment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
