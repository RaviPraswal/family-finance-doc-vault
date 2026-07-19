import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useToastStore } from '../store/toastStore';
import { useConfirmStore } from '../store/confirmStore';
import { Plus, Users, Trash2 } from 'lucide-react';

interface ChitFund {
  id: string;
  organizerName: string;
  memberName: string;
  totalValue: number;
  monthlyInstallment: number;
  durationMonths: number;
  pendingInstallments: number;
  startDate: string;
  isAllotted: boolean;
  allottedAmount: number | null;
  linkedAccount: { id: string; name?: string } | null;
  paymentSchedule?: string;
}

interface BankAccount {
  id: string;
  name: string;
  bankName: string;
}

export default function ChitFunds() {
  const toast = useToastStore();
  const confirm = useConfirmStore();
  const [chitFunds, setChitFunds] = useState<ChitFund[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<ChitFund & { linkedAccountId: string }>>({
    organizerName: '',
    memberName: '',
    totalValue: 100000,
    monthlyInstallment: 8333,
    durationMonths: 12,
    pendingInstallments: 12,
    startDate: new Date().toISOString().split('T')[0],
    isAllotted: false,
    allottedAmount: null,
    linkedAccountId: '',
  });

  interface ScheduleRow {
    srNo: number;
    monthCycle: string;
    calendarMonth: string;
    calendarYear: number;
    actualAmount: number;
    chitAmountAllocated: number;
    status: 'Paid & Closed' | 'Allotted' | 'Open / Pending';
  }

  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([]);
  const [activeTab, setActiveTab] = useState<'schedule' | 'transactions'>('schedule');
  const [localSchedule, setLocalSchedule] = useState<ScheduleRow[]>([]);

  const generateDefaultSchedule = (duration: number, totalValue: number, startDateStr: string): ScheduleRow[] => {
    if (!duration || !totalValue || !startDateStr) return [];
    const rows: ScheduleRow[] = [];
    const start = new Date(startDateStr);
    let currentMonth = start.getMonth();
    let currentYear = start.getFullYear();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const commission = totalValue * 0.05;
    const baseInstallment = totalValue / duration;
    
    for (let i = 1; i <= duration; i++) {
      let allocated = 0;
      if (i > 1) {
        if (duration === 20) {
          if (i >= 2 && i <= 10) {
            allocated = Math.round(totalValue * (0.70 + (i - 2) * (4000 / 300000)));
          } else if (i >= 11 && i <= 19) {
            allocated = Math.round(totalValue * (0.8066666666666666 + (i - 10) * (4250 / 300000)));
          } else if (i === 20) {
            allocated = Math.round(totalValue * 0.95);
          }
        } else {
          const fraction = duration > 2 ? (i - 2) / (duration - 2) : 0;
          allocated = Math.round(totalValue * (0.70 + fraction * 0.25));
        }
      }
      
      let actual = baseInstallment;
      if (i > 1) {
        const discount = totalValue - allocated;
        const memberDividendPool = discount - commission;
        const dividendPerMember = memberDividendPool / duration;
        actual = baseInstallment - dividendPerMember;
      }
      
      rows.push({
        srNo: i,
        monthCycle: `Month ${i}`,
        calendarMonth: months[currentMonth],
        calendarYear: currentYear,
        actualAmount: Math.round(actual),
        chitAmountAllocated: allocated,
        status: 'Open / Pending'
      });
      
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }
    return rows;
  };

  const handleMetaChange = (field: string, value: any) => {
    const updatedForm = { ...formData, [field]: value };
    setFormData(updatedForm);
    
    const duration = updatedForm.durationMonths || 12;
    const totalVal = updatedForm.totalValue || 0;
    const startD = updatedForm.startDate || new Date().toISOString().split('T')[0];
    
    if (field === 'durationMonths' || field === 'totalValue' || field === 'startDate') {
      setScheduleRows(generateDefaultSchedule(duration, totalVal, startD));
    }
  };

  const handleStatusChange = async (rowIndex: number, newStatus: 'Paid & Closed' | 'Allotted' | 'Open / Pending') => {
    try {
      const currentSchedule = selectedChitFund.paymentSchedule
        ? (JSON.parse(selectedChitFund.paymentSchedule) as ScheduleRow[])
        : generateDefaultSchedule(selectedChitFund.durationMonths || 20, selectedChitFund.totalValue || 300000, selectedChitFund.startDate || new Date().toISOString().split('T')[0]);
      
      const updatedSchedule = [...currentSchedule];
      updatedSchedule[rowIndex] = { ...updatedSchedule[rowIndex], status: newStatus };
      
      const isAllotted = updatedSchedule.some(r => r.status === 'Allotted');
      const allottedAmount = updatedSchedule.find(r => r.status === 'Allotted')?.chitAmountAllocated || null;
      const pendingInstallments = updatedSchedule.filter(r => r.status === 'Open / Pending').length;
      
      const payload = {
        ...selectedChitFund,
        paymentSchedule: JSON.stringify(updatedSchedule),
        isAllotted,
        allottedAmount,
        pendingInstallments,
      };
      if (selectedChitFund.linkedAccount) {
        payload.linkedAccount = { id: selectedChitFund.linkedAccount.id };
      }
      
      await apiClient(`/api/chitfunds/${selectedChitFund.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      
      toast.success('Status updated', `Installment status changed to ${newStatus}.`);
      fetchChitFunds();
    } catch (err: any) {
      toast.error('Failed to update status', err.message || 'Could not update status.');
    }
  };


  const openAddModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      organizerName: '',
      memberName: '',
      totalValue: 300000,
      monthlyInstallment: 15000,
      durationMonths: 20,
      pendingInstallments: 20,
      startDate: today,
      isAllotted: false,
      allottedAmount: null,
      linkedAccountId: '',
    });
    setScheduleRows(generateDefaultSchedule(20, 300000, today));
    setIsModalOpen(true);
  };

  const updateScheduleField = (index: number, field: keyof ScheduleRow, value: any) => {
    const updated = [...scheduleRows];
    updated[index] = { ...updated[index], [field]: value };
    setScheduleRows(updated);
  };

  const rebuildSchedule = () => {
    const duration = formData.durationMonths || 20;
    const totalVal = formData.totalValue || 0;
    const startD = formData.startDate || new Date().toISOString().split('T')[0];
    setScheduleRows(generateDefaultSchedule(duration, totalVal, startD));
  };

  useEffect(() => {
    fetchChitFunds();
    fetchBankAccounts();
    fetchExpenses();
  }, []);

  const fetchChitFunds = async () => {
    try {
      const data = await apiClient('/api/chitfunds');
      setChitFunds(data);
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
      const isAllotted = scheduleRows.some(r => r.status === 'Allotted');
      const allottedAmount = scheduleRows.find(r => r.status === 'Allotted')?.chitAmountAllocated || null;
      const pendingInstallments = scheduleRows.filter(r => r.status === 'Open / Pending').length;

      const payload: any = {
        ...formData,
        isAllotted,
        allottedAmount,
        pendingInstallments,
        paymentSchedule: JSON.stringify(scheduleRows),
      };
      if (formData.linkedAccountId) {
        payload.linkedAccount = { id: formData.linkedAccountId };
      }
      delete payload.linkedAccountId;
      await apiClient('/api/chitfunds', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setIsModalOpen(false);
      setFormData({ organizerName: '', memberName: '', totalValue: 100000, monthlyInstallment: 8333, durationMonths: 12, pendingInstallments: 12, startDate: new Date().toISOString().split('T')[0], isAllotted: false, allottedAmount: null, linkedAccountId: '' });
      setScheduleRows([]);
      toast.success('Chit fund saved', 'Your chit fund record has been added successfully.');
      fetchChitFunds();
    } catch (err: any) {
      toast.error('Failed to save chit fund', err.message || 'Could not save chit fund. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    confirm.show({
      title: 'Delete Chit Fund',
      message: 'Are you sure you want to delete this chit fund? This action cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          await apiClient(`/api/chitfunds/${id}`, { method: 'DELETE' });
          toast.success('Chit fund deleted', 'The chit fund record has been removed.');
          fetchChitFunds();
        } catch (err: any) {
          toast.error('Cannot delete chit fund', err.message || 'Failed to delete chit fund.');
        }
      },
    });
  };

  const [viewMode, setViewMode] = useState<'card' | 'list' | 'detailed'>('card');
  const [selectedChitFundId, setSelectedChitFundId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset page when switching viewMode
  useEffect(() => {
    setItemsPerPage(viewMode === 'card' ? 6 : 10);
    setCurrentPage(1);
  }, [viewMode]);

  // Select first chit fund if none selected
  useEffect(() => {
    if (chitFunds.length > 0 && !selectedChitFundId) {
      setSelectedChitFundId(chitFunds[0].id);
    }
  }, [chitFunds, selectedChitFundId]);

  const selectedChitFund = chitFunds.find(cf => cf.id === selectedChitFundId) || chitFunds[0];

  useEffect(() => {
    if (selectedChitFund) {
      const schedule = selectedChitFund.paymentSchedule
        ? (JSON.parse(selectedChitFund.paymentSchedule) as ScheduleRow[])
        : generateDefaultSchedule(selectedChitFund.durationMonths || 20, selectedChitFund.totalValue || 300000, selectedChitFund.startDate || new Date().toISOString().split('T')[0]);
      setLocalSchedule(schedule);
    } else {
      setLocalSchedule([]);
    }
  }, [selectedChitFund, chitFunds]);

  // Pagination calculations
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedChitFunds = chitFunds.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(chitFunds.length / itemsPerPage);

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Chit Funds</h1>
          <p className="text-sm text-muted-foreground">Manage your chit fund deposits, payouts, durations and banks</p>
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
            onClick={openAddModal}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 font-semibold text-sm"
          >
            <Plus className="h-4 w-4" /> Add Chit Fund
          </button>
        </div>
      </div>

      {chitFunds.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground bg-card border border-border rounded-lg">
          No chit funds found. Register one to organize or participate in cooperative savings!
        </div>
      ) : viewMode === 'card' ? (
        /* Card View */
        <div className="space-y-6 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedChitFunds.map((cf) => {
              const paid = (cf.durationMonths ?? 0) - (cf.pendingInstallments ?? 0);
              const progress = cf.durationMonths ? Math.min(100, (paid / cf.durationMonths) * 100) : 0;

              const schedule = cf.paymentSchedule
                ? (JSON.parse(cf.paymentSchedule) as ScheduleRow[])
                : generateDefaultSchedule(cf.durationMonths || 20, cf.totalValue || 300000, cf.startDate || new Date().toISOString().split('T')[0]);

              const upcomingRow = schedule.find(row => row.status === 'Open / Pending');
              const upcomingText = upcomingRow
                ? `₹${upcomingRow.actualAmount.toLocaleString()} (${upcomingRow.calendarMonth} ${upcomingRow.calendarYear})`
                : 'None';

              const paidRows = schedule.filter(row => row.status === 'Paid & Closed' || row.status === 'Allotted');
              const lastPaidRow = paidRows.length > 0 ? paidRows[paidRows.length - 1] : null;
              const lastPaidText = lastPaidRow
                ? `₹${lastPaidRow.actualAmount.toLocaleString()} (${lastPaidRow.calendarMonth} ${lastPaidRow.calendarYear})`
                : 'N/A';

              const totalDeposited = schedule.reduce((sum, row) => {
                if (row.status === 'Paid & Closed' || row.status === 'Allotted') {
                  return sum + row.actualAmount;
                }
                return sum;
              }, 0);

              return (
                <div key={cf.id} className="bg-card p-6 rounded-lg shadow-sm border border-border flex flex-col hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-500/10 text-violet-500 rounded-lg">
                          <Users className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base text-foreground">{cf.organizerName}</h3>
                          <p className="text-xs text-muted-foreground">Member: {cf.memberName}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(cf.id)} className="text-muted-foreground hover:text-red-500 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>{paid} / {cf.durationMonths} Months</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-violet-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Value:</span>
                        <span className="font-bold text-violet-500">₹{cf.totalValue?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Deposited:</span>
                        <span className="font-semibold text-foreground">₹{totalDeposited.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Upcoming Installment:</span>
                        <span className="font-semibold text-foreground">{upcomingText}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Paid:</span>
                        <span className="font-semibold text-foreground">{lastPaidText}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-border">
                        <span className="text-muted-foreground">Allotted Amount:</span>
                        <span className="font-semibold text-foreground">
                          {cf.isAllotted ? `₹${cf.allottedAmount?.toLocaleString()}` : 'Not Allotted'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pending Installments:</span>
                        <span className="font-semibold text-foreground">{cf.pendingInstallments} months</span>
                      </div>
                    </div>

                    {cf.linkedAccount && (
                      <div className="flex justify-between pt-2 border-t border-border mt-3 text-xs text-muted-foreground">
                        <span>Linked Account:</span>
                        <span className="font-semibold text-foreground">{cf.linkedAccount.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {chitFunds.length > 0 && (
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
                    <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, chitFunds.length)}</span> of{' '}
                    <span className="font-semibold text-foreground">{chitFunds.length}</span> results
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Organizer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Upcoming</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Paid</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Allotted?</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-gray-200">
                {paginatedChitFunds.map((cf) => {
                  const paid = (cf.durationMonths ?? 0) - (cf.pendingInstallments ?? 0);
                  const progress = cf.durationMonths ? Math.min(100, (paid / cf.durationMonths) * 100) : 0;

                  const schedule = cf.paymentSchedule
                    ? (JSON.parse(cf.paymentSchedule) as ScheduleRow[])
                    : generateDefaultSchedule(cf.durationMonths || 20, cf.totalValue || 300000, cf.startDate || new Date().toISOString().split('T')[0]);

                  const upcomingRow = schedule.find(row => row.status === 'Open / Pending');
                  const upcomingText = upcomingRow
                    ? `₹${upcomingRow.actualAmount.toLocaleString()} (${upcomingRow.calendarMonth})`
                    : 'None';

                  const paidRows = schedule.filter(row => row.status === 'Paid & Closed' || row.status === 'Allotted');
                  const lastPaidRow = paidRows.length > 0 ? paidRows[paidRows.length - 1] : null;
                  const lastPaidText = lastPaidRow
                    ? `₹${lastPaidRow.actualAmount.toLocaleString()} (${lastPaidRow.calendarMonth})`
                    : 'N/A';

                  return (
                    <tr key={cf.id} className="hover:bg-background/80 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Users className="h-5 w-5 text-muted-foreground mr-3" />
                          <div className="text-sm font-medium text-foreground">{cf.organizerName}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {cf.memberName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-violet-500 text-sm">
                        ₹{cf.totalValue?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground text-sm">
                        {upcomingText}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground font-medium">
                        {lastPaidText}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {cf.isAllotted ? (
                          <span className="text-green-500 font-semibold">₹{cf.allottedAmount?.toLocaleString()}</span>
                        ) : (
                          <span className="text-muted-foreground italic">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-muted rounded-full h-1.5">
                            <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                          </div>
                          <span className="text-xs text-muted-foreground">{paid}/{cf.durationMonths}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleDelete(cf.id)} className="text-red-600 hover:text-red-900">
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
          {chitFunds.length > 0 && (
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
                    <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, chitFunds.length)}</span> of{' '}
                    <span className="font-semibold text-foreground">{chitFunds.length}</span> results
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
            {chitFunds.map((cf) => (
              <div
                key={cf.id}
                onClick={() => setSelectedChitFundId(cf.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedChitFund?.id === cf.id
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:bg-muted/50 bg-card'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${selectedChitFund?.id === cf.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">{cf.organizerName}</h4>
                      <p className="text-xs text-muted-foreground">Member: {cf.memberName}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(cf.id);
                    }}
                    className="text-muted-foreground hover:text-red-500 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex justify-between items-baseline">
                  <span className="text-xs text-muted-foreground">Chit Value:</span>
                  <span className="text-sm font-bold text-violet-500">₹{cf.totalValue?.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-8 bg-card border border-border rounded-xl p-6 flex flex-col h-[calc(100vh-10rem)] overflow-hidden">
            {selectedChitFund ? (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="border-b border-border/50 pb-4 mb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{selectedChitFund.organizerName} Chit</h3>
                      <p className="text-xs text-muted-foreground">Member Account: {selectedChitFund.memberName}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block">Total Chit Pool Value</span>
                      <span className="text-2xl font-bold text-violet-500">₹{selectedChitFund.totalValue?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {(() => {
                  const currentSchedule = selectedChitFund.paymentSchedule
                    ? (JSON.parse(selectedChitFund.paymentSchedule) as ScheduleRow[])
                    : generateDefaultSchedule(selectedChitFund.durationMonths, selectedChitFund.totalValue, selectedChitFund.startDate);

                  const totalDepositedAmt = currentSchedule.reduce((sum, row) => {
                    if (row.status === 'Paid & Closed' || row.status === 'Allotted') {
                      return sum + row.actualAmount;
                    }
                    return sum;
                  }, 0);

                  const paidMonths = currentSchedule.filter(row => row.status === 'Paid & Closed' || row.status === 'Allotted').length;

                  return (
                    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                      {/* Performance Indicators */}
                      <div className="grid grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl mb-4">
                        <div>
                          <span className="text-xs text-muted-foreground block">Deposited So Far</span>
                          <span className="text-base font-bold text-foreground">₹{totalDepositedAmt.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block">Paid/Duration</span>
                          <span className="text-base font-semibold text-foreground">{paidMonths} / {selectedChitFund.durationMonths} Months</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block">Bidding Status</span>
                          <span className={`text-base font-bold ${selectedChitFund.isAllotted ? 'text-green-500' : 'text-amber-500'}`}>
                            {selectedChitFund.isAllotted ? `Allotted (₹${selectedChitFund.allottedAmount?.toLocaleString()})` : 'Awaiting Bidding'}
                          </span>
                        </div>
                      </div>

                      {/* Tab selector */}
                      <div className="flex border-b border-border/50 mb-4 text-sm">
                        <button
                          onClick={() => setActiveTab('schedule')}
                          className={`pb-2 px-4 font-semibold border-b-2 transition-all ${
                            activeTab === 'schedule'
                              ? 'border-primary text-primary'
                              : 'border-transparent text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Installment Payment Schedule
                        </button>
                        <button
                          onClick={() => setActiveTab('transactions')}
                          className={`pb-2 px-4 font-semibold border-b-2 transition-all ${
                            activeTab === 'transactions'
                              ? 'border-primary text-primary'
                              : 'border-transparent text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Expense Transaction Log
                        </button>
                      </div>

                      {/* Tab Content */}
                      <div className="flex-1 overflow-y-auto pr-1 min-h-0 custom-scrollbar">
                        {activeTab === 'schedule' ? (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Schedule Statement</h4>
                              <div className="text-xs text-muted-foreground italic">
                                Changing status automatically updates balance progress
                              </div>
                            </div>

                            <div className="border border-border/60 rounded-xl overflow-hidden shadow-xs">
                              <table className="min-w-full divide-y divide-border/60 text-sm">
                                <thead className="bg-muted/50">
                                  <tr>
                                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">Sr</th>
                                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">Month / Cycle</th>
                                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">Actual Amt</th>
                                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">Allocated if Opted</th>
                                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40 bg-card">
                                  {(() => {
                                    return localSchedule.map((row, idx) => {
                                      const isPaidOrAllotted = row.status === 'Paid & Closed' || row.status === 'Allotted';
                                      return (
                                        <tr key={row.srNo} className="hover:bg-muted/10 transition-colors">
                                          <td className="px-4 py-1.5 text-muted-foreground font-mono whitespace-nowrap">{row.srNo}</td>
                                          <td className="px-4 py-1.5 text-foreground font-medium whitespace-nowrap">{row.calendarMonth} {row.calendarYear} ({row.monthCycle})</td>
                                          
                                          <td className="px-4 py-1.5 text-foreground font-semibold whitespace-nowrap">
                                            ₹{row.actualAmount.toLocaleString()}
                                          </td>
                                          <td className="px-4 py-1.5 text-foreground font-semibold whitespace-nowrap">
                                            ₹{row.chitAmountAllocated.toLocaleString()}
                                          </td>

                                          <td className="px-4 py-1.5 whitespace-nowrap">
                                            {isPaidOrAllotted ? (
                                              <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                  row.status === 'Paid & Closed'
                                                    ? 'bg-green-500/10 text-green-500'
                                                    : 'bg-violet-500/10 text-violet-500'
                                                }`}
                                              >
                                                {row.status}
                                              </span>
                                            ) : (
                                              <select
                                                value={row.status}
                                                onChange={(e) => handleStatusChange(idx, e.target.value as any)}
                                                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-transparent border border-border text-amber-500 bg-amber-500/10 outline-none focus:ring-0 cursor-pointer"
                                              >
                                                <option value="Open / Pending" className="bg-card text-foreground">Open / Pending</option>
                                                <option value="Paid & Closed" className="bg-card text-foreground">Paid & Closed</option>
                                                <option value="Allotted" className="bg-card text-foreground">Allotted</option>
                                              </select>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    });
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Installment Transaction Log</h4>
                            <div className="space-y-2">
                              {expenses.filter((e) => e.linkedChitFund?.id === selectedChitFund.id).length === 0 ? (
                                <p className="text-sm text-muted-foreground py-8 text-center bg-background/30 rounded-lg">No contributions or allotments logged for this chit fund.</p>
                              ) : (
                                expenses
                                  .filter((e) => e.linkedChitFund?.id === selectedChitFund.id)
                                  .map((exp) => {
                                    const isContribution = exp.type === 'DEBIT';
                                    return (
                                      <div
                                        key={exp.id}
                                        className="flex justify-between items-center p-3 rounded-lg border border-border/30 bg-background/50 hover:bg-background/85 transition-colors text-xs"
                                      >
                                        <div>
                                          <div className="font-semibold text-foreground">{exp.category}</div>
                                          <div className="text-muted-foreground">{exp.expenseDate}</div>
                                          {exp.description && <p className="text-muted-foreground italic mt-1">{exp.description}</p>}
                                        </div>
                                        <span className={`font-bold ${isContribution ? 'text-green-500' : 'text-red-500'}`}>
                                          {isContribution ? '+' : '-'}₹{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                      </div>
                                    );
                                  })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <Users className="h-12 w-12 stroke-1 mb-2 opacity-50" />
                <p className="text-sm">Select a chit fund on the left to view bidding allotments and log payments.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-border">
            <h2 className="text-xl font-bold text-foreground mb-4">Add Chit Fund</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Meta Fields */}
              <div className="lg:col-span-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Organizer Name</label>
                    <input required value={formData.organizerName} onChange={e => setFormData({ ...formData, organizerName: e.target.value })} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-xs" placeholder="Organizer" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Member Name</label>
                    <input required value={formData.memberName} onChange={e => setFormData({ ...formData, memberName: e.target.value })} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-xs" placeholder="Your name" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Total Value (₹)</label>
                    <input required type="number" value={formData.totalValue} onChange={e => handleMetaChange('totalValue', parseFloat(e.target.value))} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-xs" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Month</label>
                    <input required type="month" value={formData.startDate ? formData.startDate.substring(0, 7) : ''} onChange={e => handleMetaChange('startDate', e.target.value + '-01')} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Duration (Months)</label>
                    <input required type="number" value={formData.durationMonths} onChange={e => handleMetaChange('durationMonths', parseInt(e.target.value))} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-xs" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Linked Bank Account</label>
                    <select value={formData.linkedAccountId} onChange={e => setFormData({ ...formData, linkedAccountId: e.target.value })} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-xs">
                      <option value="">-- None --</option>
                      {bankAccounts.map(ba => (
                        <option key={ba.id} value={ba.id}>{ba.name} ({ba.bankName})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Auto computed info summary */}
                <div className="p-4 bg-muted/30 rounded-lg space-y-2 text-xs border border-border/50">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Is Allotted?</span>
                    <span className="font-semibold text-foreground">{scheduleRows.some(r => r.status === 'Allotted') ? 'Yes' : 'No'}</span>
                  </div>
                  {scheduleRows.some(r => r.status === 'Allotted') && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Allotted Amount:</span>
                      <span className="font-semibold text-green-500">₹{scheduleRows.find(r => r.status === 'Allotted')?.chitAmountAllocated.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pending Installments:</span>
                    <span className="font-semibold text-foreground">{scheduleRows.filter(r => r.status === 'Open / Pending').length} months</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded text-xs font-semibold">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 text-xs font-bold transition-all">Save Chit Fund</button>
                </div>
              </div>

              {/* Right Column: Spreadsheet payment schedule editor */}
              <div className="lg:col-span-7 flex flex-col min-h-0 border-l border-border/55 lg:pl-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-semibold text-foreground">Interactive Payment Schedule Editor</h3>
                  <button
                    type="button"
                    onClick={rebuildSchedule}
                    className="text-xs text-primary hover:underline font-semibold"
                  >
                    Reset/Regenerate Schedule
                  </button>
                </div>
                
                <div className="border border-border/60 rounded-xl overflow-hidden max-h-[50vh] overflow-y-auto custom-scrollbar shadow-xs">
                  <table className="min-w-full divide-y divide-border/60 text-xs">
                    <thead className="bg-muted/50 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Sr</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Calendar Month</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Actual Amt (₹)</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Allocated if Opted (₹)</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 bg-card">
                      {scheduleRows.map((row, idx) => (
                        <tr key={row.srNo} className="hover:bg-muted/10">
                          <td className="px-3 py-1.5 text-muted-foreground font-mono">{row.srNo}</td>
                          <td className="px-3 py-1.5 text-foreground font-medium">{row.calendarMonth} {row.calendarYear}</td>
                          <td className="px-2 py-1">
                            <input
                              type="number"
                              value={row.actualAmount}
                              onChange={(e) => updateScheduleField(idx, 'actualAmount', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-0.5 rounded bg-muted text-foreground border border-input focus:border-primary outline-none text-xs"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="number"
                              value={row.chitAmountAllocated}
                              onChange={(e) => updateScheduleField(idx, 'chitAmountAllocated', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-0.5 rounded bg-muted text-foreground border border-input focus:border-primary outline-none text-xs"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <select
                              value={row.status}
                              onChange={(e) => updateScheduleField(idx, 'status', e.target.value)}
                              className="w-full px-2 py-0.5 rounded bg-muted text-foreground border border-input focus:border-primary outline-none text-xs cursor-pointer"
                            >
                              <option value="Open / Pending">Open / Pending</option>
                              <option value="Paid & Closed">Paid & Closed</option>
                              <option value="Allotted">Allotted</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
