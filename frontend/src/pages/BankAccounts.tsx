import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useToastStore } from '../store/toastStore';
import { useConfirmStore } from '../store/confirmStore';
import { Plus, Landmark, Trash2 } from 'lucide-react';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<BankAccount>>({
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    accountType: 'Savings',
    currentBalance: 0,
    openingBalance: 0
  });

  useEffect(() => {
    fetchAccounts();
    fetchExpenses();
  }, []);

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

  const [viewMode, setViewMode] = useState<'card' | 'list' | 'detailed'>('card');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset page when switching view mode
  useEffect(() => {
    setItemsPerPage(viewMode === 'card' ? 6 : 10);
    setCurrentPage(1);
  }, [viewMode]);

  // Select the first account if none is selected for detailed view
  useEffect(() => {
    if (accounts.length > 0 && !expandedAccountId) {
      setExpandedAccountId(accounts[0].id);
    }
  }, [accounts, expandedAccountId]);

  const selectedAccount = accounts.find(a => a.id === expandedAccountId) || accounts[0];

  // Pagination calculations
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAccounts = accounts.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(accounts.length / itemsPerPage);

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
            <Plus className="h-4 w-4" /> Add Account
          </button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-card border border-border p-12 text-center text-muted-foreground rounded-lg">
          No bank accounts found. Add one to start tracking your liquid cash.
        </div>
      ) : viewMode === 'card' ? (
        /* Card View */
        <div className="space-y-6 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedAccounts.map((acc) => (
              <div key={acc.id} className="bg-card p-6 rounded-xl border border-border relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-lg">
                        <Landmark className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base text-foreground">{acc.bankName}</h3>
                        <p className="text-xs text-muted-foreground">{acc.accountType} - {acc.accountHolderName}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(acc.id)} className="text-muted-foreground hover:text-red-500 p-1 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-2 mt-4 pt-4 border-t border-border/50 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Number:</span>
                      <span className="font-medium font-mono">XXXX-{acc.accountNumber ? acc.accountNumber.slice(-4) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Opening Balance:</span>
                      <span className="font-medium">₹{(acc.openingBalance ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-muted-foreground">Current Balance:</span>
                      <span className="text-lg font-bold text-primary">₹{(acc.currentBalance ?? 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {accounts.length > 0 && (
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
                    <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, accounts.length)}</span> of{' '}
                    <span className="font-semibold text-foreground">{accounts.length}</span> results
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
        /* List View */
        <div className="space-y-6 flex-1 flex flex-col min-h-0">
          <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden h-[calc(100vh-10rem)] overflow-y-auto custom-scrollbar flex-1">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-background sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Bank Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Account Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Holder / Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Opening Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Balance</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-gray-200">
                {paginatedAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-background/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Landmark className="h-5 w-5 text-muted-foreground mr-3" />
                        <div className="text-sm font-medium text-foreground">{acc.bankName}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {acc.accountNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="text-foreground">{acc.accountHolderName}</div>
                      <div className="text-xs text-muted-foreground">{acc.accountType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground text-sm">
                      ₹{acc.openingBalance.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-foreground text-sm">
                      ₹{(acc.currentBalance ?? 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleDelete(acc.id)} className="text-red-600 hover:text-red-900">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {accounts.length > 0 && (
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
                    <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, accounts.length)}</span> of{' '}
                    <span className="font-semibold text-foreground">{accounts.length}</span> results
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
            {accounts.map((acc) => (
              <div
                key={acc.id}
                onClick={() => setExpandedAccountId(acc.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedAccount?.id === acc.id
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:bg-muted/50 bg-card'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${selectedAccount?.id === acc.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <Landmark className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">{acc.bankName}</h4>
                      <p className="text-xs text-muted-foreground">{acc.accountType}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(acc.id);
                    }}
                    className="text-muted-foreground hover:text-red-500 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex justify-between items-baseline">
                  <span className="text-xs text-muted-foreground">Balance:</span>
                  <span className="text-sm font-bold text-foreground">₹{(acc.currentBalance ?? 0).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-8 bg-card border border-border rounded-xl p-6 flex flex-col h-[calc(100vh-10rem)] overflow-hidden">
            {selectedAccount ? (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="border-b border-border/50 pb-4 mb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{selectedAccount.bankName}</h3>
                      <p className="text-xs text-muted-foreground">Holder: {selectedAccount.accountHolderName} | Number: {selectedAccount.accountNumber}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block">Current Balance</span>
                      <span className="text-2xl font-bold text-primary">₹{(selectedAccount.currentBalance ?? 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto pr-1">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Full Transaction History</h4>
                  <div className="space-y-2">
                    {expenses.filter((e) => e.linkedAccount?.id === selectedAccount.id).length === 0 ? (
                      <p className="text-sm text-muted-foreground py-12 text-center">No transactions logged against this bank account.</p>
                    ) : (
                      expenses
                        .filter((e) => e.linkedAccount?.id === selectedAccount.id)
                        .map((exp) => {
                          const isCredit = exp.type === 'CREDIT';
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
                              <span className={`font-bold text-sm ${isCredit ? 'text-green-500' : 'text-red-500'}`}>
                                {isCredit ? '+' : '-'}₹{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <Landmark className="h-12 w-12 stroke-1 mb-2 opacity-50" />
                <p className="text-sm">Select a bank account on the left to view detailed statements and transaction history.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Add Bank Account</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Bank Name</label>
                <input required value={formData.bankName} onChange={e => setFormData({ ...formData, bankName: e.target.value })} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="HDFC, SBI, etc." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Account Holder Name</label>
                <input required value={formData.accountHolderName} onChange={e => setFormData({ ...formData, accountHolderName: e.target.value })} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Account Number</label>
                <input required value={formData.accountNumber} onChange={e => setFormData({ ...formData, accountNumber: e.target.value })} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Account Type</label>
                <select value={formData.accountType} onChange={e => setFormData({ ...formData, accountType: e.target.value })} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all">
                  <option value="Savings">Savings</option>
                  <option value="Current">Current</option>
                  <option value="Salary">Salary</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Opening Balance (₹)</label>
                <input required type="number" value={formData.openingBalance} onChange={e => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) })} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Current Balance (₹)</label>
                <input required type="number" value={formData.currentBalance} onChange={e => setFormData({ ...formData, currentBalance: parseFloat(e.target.value) })} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90">Save Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
