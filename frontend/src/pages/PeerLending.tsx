import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useToastStore } from '../store/toastStore';
import { useConfirmStore } from '../store/confirmStore';
import { Plus, Trash2, ArrowRightLeft } from 'lucide-react';

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

  const [viewMode, setViewMode] = useState<'card' | 'list' | 'detailed'>('card');
  const [selectedLendingId, setSelectedLendingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset page when switching viewMode
  useEffect(() => {
    setItemsPerPage(viewMode === 'card' ? 6 : 10);
    setCurrentPage(1);
  }, [viewMode]);

  // Select first lending if none selected
  useEffect(() => {
    if (lendings.length > 0 && !selectedLendingId) {
      setSelectedLendingId(lendings[0].id);
    }
  }, [lendings, selectedLendingId]);

  const selectedLending = lendings.find(l => l.id === selectedLendingId) || lendings[0];

  // Pagination calculations
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLendings = lendings.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(lendings.length / itemsPerPage);

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
            <Plus className="h-4 w-4" /> Add Record
          </button>
        </div>
      </div>

      {lendings.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground bg-card border border-border rounded-lg">
          No Udhaar records found. Track money lent to friends or taken from relatives here.
        </div>
      ) : viewMode === 'card' ? (
        /* Card View */
        <div className="space-y-6 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedLendings.map((lending) => {
              const isGiven = lending.type === 'GIVEN';
              return (
                <div key={lending.id} className={`p-6 rounded-lg shadow-sm border flex flex-col justify-between hover:shadow-md transition-shadow ${lending.settled ? 'bg-background border-border opacity-75' : 'bg-card border-border'}`}>
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isGiven ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          <ArrowRightLeft className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base text-foreground">{lending.personName}</h3>
                          <p className={`text-xs font-semibold ${isGiven ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isGiven ? 'Udhaar Given' : 'Udhaar Taken'}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(lending.id)} className="text-muted-foreground hover:text-red-500 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Amount</p>
                        <p className="text-lg font-bold text-foreground">₹{lending.amount.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground mb-1">Status</p>
                        <button 
                          onClick={() => handleToggleSettled(lending)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${lending.settled ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'}`}
                        >
                          {lending.settled ? 'Settled ✓' : 'Pending'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span className="font-semibold text-foreground">{new Date(lending.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expected Return:</span>
                        <span className="font-semibold text-foreground">{new Date(lending.expectedReturnDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {lendings.length > 0 && (
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
                    <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, lendings.length)}</span> of{' '}
                    <span className="font-semibold text-foreground">{lendings.length}</span> results
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Person</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Expected Return</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-gray-200">
                {paginatedLendings.map((lending) => {
                  const isGiven = lending.type === 'GIVEN';
                  return (
                    <tr key={lending.id} className="hover:bg-background/80 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <ArrowRightLeft className="h-5 w-5 text-muted-foreground mr-3" />
                          <div className="text-sm font-medium text-foreground">{lending.personName}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${isGiven ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {isGiven ? 'Given' : 'Taken'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-foreground text-sm">
                        ₹{lending.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(lending.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(lending.expectedReturnDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button 
                          onClick={() => handleToggleSettled(lending)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${lending.settled ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'}`}
                        >
                          {lending.settled ? 'Settled ✓' : 'Pending'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleDelete(lending.id)} className="text-red-600 hover:text-red-900">
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
          {lendings.length > 0 && (
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
                    <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, lendings.length)}</span> of{' '}
                    <span className="font-semibold text-foreground">{lendings.length}</span> results
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
            {lendings.map((lending) => {
              const isGiven = lending.type === 'GIVEN';
              return (
                <div
                  key={lending.id}
                  onClick={() => setSelectedLendingId(lending.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedLending?.id === lending.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:bg-muted/50 bg-card'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isGiven ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        <ArrowRightLeft className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">{lending.personName}</h4>
                        <p className="text-xs text-muted-foreground">{isGiven ? 'Given' : 'Taken'}</p>
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
                  <div className="mt-3 flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Status:</span>
                    <span className={`text-xs font-semibold ${lending.settled ? 'text-green-500' : 'text-yellow-500'}`}>
                      {lending.settled ? 'Settled' : 'Pending'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-8 bg-card border border-border rounded-xl p-6 flex flex-col h-[calc(100vh-10rem)] overflow-hidden">
            {selectedLending ? (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="border-b border-border/50 pb-4 mb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">Peer Loan with {selectedLending.personName}</h3>
                      <p className="text-xs text-muted-foreground">Type: Udhaar {selectedLending.type === 'GIVEN' ? 'Given (Receivable)' : 'Taken (Payable)'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block">Principal Amount</span>
                      <span className="text-2xl font-bold text-foreground">₹{selectedLending.amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-6">
                  {/* Performance Indicators */}
                  <div className="grid grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                    <div>
                      <span className="text-xs text-muted-foreground block">Date Logged</span>
                      <span className="text-base font-semibold text-foreground">{new Date(selectedLending.date).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Expected Settlement</span>
                      <span className="text-base font-semibold text-foreground">{new Date(selectedLending.expectedReturnDate).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Settled Status</span>
                      <button 
                        onClick={() => handleToggleSettled(selectedLending)}
                        className={`text-xs font-bold px-2 py-0.5 rounded ${selectedLending.settled ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}
                      >
                        {selectedLending.settled ? 'Settled ✓' : 'Mark Settled'}
                      </button>
                    </div>
                  </div>

                  {/* Transaction log */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Installment & Repayment Ledger</h4>
                    <div className="space-y-2">
                      {expenses.filter((e) => e.linkedPeerLending?.id === selectedLending.id).length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center bg-background/30 rounded-lg">No payments or adjustments logged for this peer transaction.</p>
                      ) : (
                        expenses
                          .filter((e) => e.linkedPeerLending?.id === selectedLending.id)
                          .map((exp) => {
                            const isGiven = selectedLending.type === 'GIVEN';
                            const isRepayment = isGiven ? exp.type === 'CREDIT' : exp.type === 'DEBIT';
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
                <ArrowRightLeft className="h-12 w-12 stroke-1 mb-2 opacity-50" />
                <p className="text-sm">Select an udhaar record on the left to view metrics and inflows.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Add Udhaar Record</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input type="radio" checked={formData.type === 'GIVEN'} onChange={() => setFormData({...formData, type: 'GIVEN'})} className="mr-2" />
                    I Gave Udhaar
                  </label>
                  <label className="flex items-center">
                    <input type="radio" checked={formData.type === 'TAKEN'} onChange={() => setFormData({...formData, type: 'TAKEN'})} className="mr-2" />
                    I Took Udhaar
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Person Name</label>
                <input required value={formData.personName} onChange={e => setFormData({...formData, personName: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount (₹)</label>
                <input required type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Expected Return</label>
                  <input required type="date" value={formData.expectedReturnDate} onChange={e => setFormData({...formData, expectedReturnDate: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90">Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
