import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useToastStore } from '../store/toastStore';
import { useConfirmStore } from '../store/confirmStore';
import { Plus, CreditCard, Trash2 } from 'lucide-react';

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

  const [viewMode, setViewMode] = useState<'card' | 'list' | 'detailed'>('card');
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset page when switching viewMode
  useEffect(() => {
    setItemsPerPage(viewMode === 'card' ? 6 : 10);
    setCurrentPage(1);
  }, [viewMode]);

  // Select first loan if none selected
  useEffect(() => {
    if (loans.length > 0 && !selectedLoanId) {
      setSelectedLoanId(loans[0].id);
    }
  }, [loans, selectedLoanId]);

  const selectedLoan = loans.find(l => l.id === selectedLoanId) || loans[0];

  // Pagination calculations
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLoans = loans.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(loans.length / itemsPerPage);

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
            <Plus className="h-4 w-4" /> Add Loan
          </button>
        </div>
      </div>

      {loans.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground bg-card border border-border rounded-lg">
          No active loans found. Add your Home, Auto, or Personal loans here.
        </div>
      ) : viewMode === 'card' ? (
        /* Card View */
        <div className="space-y-6 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedLoans.map((loan) => {
              const progress = ((loan.principalAmount - loan.outstandingAmount) / loan.principalAmount) * 100;
              return (
                <div key={loan.id} className="bg-card p-6 rounded-lg shadow-sm border border-border flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
                          <CreditCard className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base text-foreground">{loan.lenderName}</h3>
                          <p className="text-xs text-muted-foreground">{loan.loanType}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(loan.id)} className="text-muted-foreground hover:text-red-500 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Paid Off</span>
                        <span>{progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}></div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Principal:</span>
                        <span className="font-medium text-foreground">₹{loan.principalAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Outstanding:</span>
                        <span className="font-bold text-red-500">₹{loan.outstandingAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-border">
                        <span className="text-muted-foreground">Monthly EMI:</span>
                        <span className="font-semibold text-foreground">₹{loan.emiAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Interest Rate:</span>
                        <span className="font-semibold text-foreground">{loan.interestRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {loans.length > 0 && (
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
                    <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, loans.length)}</span> of{' '}
                    <span className="font-semibold text-foreground">{loans.length}</span> results
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Lender</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type / Borrower</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Principal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Outstanding</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">EMI</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Paid Progress</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-gray-200">
                {paginatedLoans.map((loan) => {
                  const progress = ((loan.principalAmount - loan.outstandingAmount) / loan.principalAmount) * 100;
                  return (
                    <tr key={loan.id} className="hover:bg-background/80 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <CreditCard className="h-5 w-5 text-muted-foreground mr-3" />
                          <div className="text-sm font-medium text-foreground">{loan.lenderName}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-foreground">{loan.loanType}</div>
                        <div className="text-xs text-muted-foreground">{loan.borrowerName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground text-sm">
                        ₹{loan.principalAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-red-500 text-sm">
                        ₹{loan.outstandingAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-foreground text-sm">
                        ₹{loan.emiAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-muted rounded-full h-1.5">
                            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}></div>
                          </div>
                          <span className="text-xs text-muted-foreground">{progress.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleDelete(loan.id)} className="text-red-600 hover:text-red-900">
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
          {loans.length > 0 && (
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
                    <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, loans.length)}</span> of{' '}
                    <span className="font-semibold text-foreground">{loans.length}</span> results
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
            {loans.map((loan) => (
              <div
                key={loan.id}
                onClick={() => setSelectedLoanId(loan.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedLoan?.id === loan.id
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:bg-muted/50 bg-card'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${selectedLoan?.id === loan.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">{loan.lenderName}</h4>
                      <p className="text-xs text-muted-foreground">{loan.loanType} | Holder: {loan.borrowerName}</p>
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
                <div className="mt-3 flex justify-between items-baseline">
                  <span className="text-xs text-muted-foreground">Outstanding:</span>
                  <span className="text-sm font-bold text-red-500">₹{loan.outstandingAmount.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-8 bg-card border border-border rounded-xl p-6 flex flex-col h-[calc(100vh-10rem)] overflow-hidden">
            {selectedLoan ? (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="border-b border-border/50 pb-4 mb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{selectedLoan.lenderName}</h3>
                      <p className="text-xs text-muted-foreground">{selectedLoan.loanType} Loan | Borrower: {selectedLoan.borrowerName}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block">Monthly EMI Amount</span>
                      <span className="text-2xl font-bold text-red-500">₹{selectedLoan.emiAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-6">
                  {/* Performance Indicators */}
                  <div className="grid grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                    <div>
                      <span className="text-xs text-muted-foreground block">Principal Amount</span>
                      <span className="text-base font-semibold text-foreground">₹{selectedLoan.principalAmount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Outstanding Balance</span>
                      <span className="text-base font-bold text-red-500">₹{selectedLoan.outstandingAmount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Interest Rate</span>
                      <span className="text-base font-semibold text-foreground">{selectedLoan.interestRate}%</span>
                    </div>
                  </div>

                  {/* Transaction log */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">EMI Repayment Ledger</h4>
                    <div className="space-y-2">
                      {expenses.filter((e) => e.linkedLoan?.id === selectedLoan.id).length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center bg-background/30 rounded-lg">No EMIs or payments logged for this loan.</p>
                      ) : (
                        expenses
                          .filter((e) => e.linkedLoan?.id === selectedLoan.id)
                          .map((exp) => {
                            const isRepayment = exp.type === 'DEBIT';
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
                                <span className={`font-bold text-sm ${isRepayment ? 'text-green-500' : 'text-red-500'}`}>
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
                <CreditCard className="h-12 w-12 stroke-1 mb-2 opacity-50" />
                <p className="text-sm">Select a loan account on the left to view ledger details and logs.</p>
              </div>
            )}
          </div>
        </div>
      )}


      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Add Loan</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Lender (Bank Name)</label>
                <input required value={formData.lenderName} onChange={e => setFormData({...formData, lenderName: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Loan Type</label>
                <select value={formData.loanType} onChange={e => setFormData({...formData, loanType: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all">
                  <option value="Home Loan">Home Loan</option>
                  <option value="Auto Loan">Auto Loan</option>
                  <option value="Personal Loan">Personal Loan</option>
                  <option value="Education Loan">Education Loan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Borrower Name</label>
                <input required value={formData.borrowerName} onChange={e => setFormData({...formData, borrowerName: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Total Principal Amount (₹)</label>
                <input required type="number" value={formData.principalAmount} onChange={e => setFormData({...formData, principalAmount: parseFloat(e.target.value)})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Current Outstanding (₹)</label>
                <input required type="number" value={formData.outstandingAmount} onChange={e => setFormData({...formData, outstandingAmount: parseFloat(e.target.value)})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">EMI Amount (₹)</label>
                  <input required type="number" value={formData.emiAmount} onChange={e => setFormData({...formData, emiAmount: parseFloat(e.target.value)})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Interest Rate (%)</label>
                  <input required type="number" step="0.01" value={formData.interestRate} onChange={e => setFormData({...formData, interestRate: parseFloat(e.target.value)})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90">Save Loan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
