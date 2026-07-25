import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useToastStore } from '../store/toastStore';
import { useConfirmStore } from '../store/confirmStore';
import { Plus, Users, Trash2, Search, Download, Printer, ChevronDown, ChevronUp, FileText, Calendar, Wallet } from 'lucide-react';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';

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
  linkedAccount: { id: string; name?: string; bankName?: string } | null;
  paymentSchedule?: string;
}

interface BankAccount {
  id: string;
  name: string;
  bankName: string;
}

interface ScheduleRow {
  srNo: number;
  monthCycle: string;
  calendarMonth: string;
  calendarYear: number;
  actualAmount: number;
  chitAmountAllocated: number;
  status: 'Paid & Closed' | 'Allotted' | 'Open / Pending';
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
    totalValue: 300000,
    monthlyInstallment: 15000,
    durationMonths: 20,
    pendingInstallments: 20,
    startDate: new Date().toISOString().split('T')[0],
    isAllotted: false,
    allottedAmount: null,
    linkedAccountId: '',
  });

  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([]);
  const [expandedChitFundId, setExpandedChitFundId] = useState<string | null>(null);

  // Unified Control States
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, ALLOTTED, ACTIVE

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');

  const generateDefaultSchedule = useCallback((duration: number, totalValue: number, startDateStr: string): ScheduleRow[] => {
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
  }, []);

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

  const handleStatusChange = async (cf: ChitFund, rowIndex: number, newStatus: 'Paid & Closed' | 'Allotted' | 'Open / Pending') => {
    try {
      const currentSchedule = cf.paymentSchedule
        ? (JSON.parse(cf.paymentSchedule) as ScheduleRow[])
        : generateDefaultSchedule(cf.durationMonths || 20, cf.totalValue || 300000, cf.startDate || new Date().toISOString().split('T')[0]);
      
      const updatedSchedule = [...currentSchedule];
      updatedSchedule[rowIndex] = { ...updatedSchedule[rowIndex], status: newStatus };
      
      const isAllotted = updatedSchedule.some(r => r.status === 'Allotted');
      const winningRow = updatedSchedule.find(r => r.status === 'Allotted');
      const commission = cf.totalValue * 0.05;
      const gstOnCommission = commission * 0.18;
      const allottedAmount = winningRow
        ? winningRow.chitAmountAllocated - gstOnCommission
        : null;
      const pendingInstallments = updatedSchedule.filter(r => r.status === 'Open / Pending').length;
      
      const payload: any = {
        ...cf,
        paymentSchedule: JSON.stringify(updatedSchedule),
        isAllotted,
        allottedAmount,
        pendingInstallments,
      };
      if (cf.linkedAccount) {
        payload.linkedAccount = { id: cf.linkedAccount.id };
      }
      
      await apiClient(`/api/chitfunds/${cf.id}`, {
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
      const winningRow = scheduleRows.find(r => r.status === 'Allotted');
      const commission = (formData.totalValue || 0) * 0.05;
      const gstOnCommission = commission * 0.18;
      const allottedAmount = winningRow
        ? winningRow.chitAmountAllocated - gstOnCommission
        : null;
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

  // Helper schedule calculations per chit fund
  const getChitDetails = useCallback((cf: ChitFund) => {
    const schedule = cf.paymentSchedule
      ? (JSON.parse(cf.paymentSchedule) as ScheduleRow[])
      : generateDefaultSchedule(cf.durationMonths || 20, cf.totalValue || 300000, cf.startDate || new Date().toISOString().split('T')[0]);

    const totalDeposited = schedule.reduce((sum, row) => {
      if (row.status === 'Paid & Closed' || row.status === 'Allotted') {
        return sum + row.actualAmount;
      }
      return sum;
    }, 0);

    const upcomingRow = schedule.find(row => row.status === 'Open / Pending');
    const upcomingVal = upcomingRow ? upcomingRow.actualAmount : 0;
    const upcomingMonth = upcomingRow ? `${upcomingRow.calendarMonth} ${upcomingRow.calendarYear}` : 'None';

    const paidRows = schedule.filter(row => row.status === 'Paid & Closed' || row.status === 'Allotted');
    const lastPaidRow = paidRows.length > 0 ? paidRows[paidRows.length - 1] : null;
    const lastPaidText = lastPaidRow
      ? `₹${lastPaidRow.actualAmount.toLocaleString()} (${lastPaidRow.calendarMonth})`
      : 'N/A';

    const outstandingAmount = cf.totalValue - totalDeposited;
    const paidMonthsCount = paidRows.length;

    return {
      totalDeposited,
      upcomingVal,
      upcomingMonth,
      lastPaidText,
      outstandingAmount,
      paidMonthsCount,
      schedule
    };
  }, [generateDefaultSchedule]);

  // Filters & Sorting logic
  const filteredChitFunds = chitFunds.filter(cf => {
    const matchesSearch = cf.organizerName.toLowerCase().includes(search.toLowerCase()) ||
                          cf.memberName.toLowerCase().includes(search.toLowerCase()) ||
                          (cf.linkedAccount?.name || '').toLowerCase().includes(search.toLowerCase());
    
    let matchesStatus = true;
    if (filterStatus === 'ALLOTTED') {
      matchesStatus = cf.isAllotted;
    } else if (filterStatus === 'ACTIVE') {
      matchesStatus = !cf.isAllotted;
    }

    return matchesSearch && matchesStatus;
  });

  // Pagination Calculations
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedChitFunds = filteredChitFunds.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(filteredChitFunds.length / itemsPerPage);

  // Summary KPIs calculations
  const totalChitValue = filteredChitFunds.reduce((sum, cf) => sum + cf.totalValue, 0);
  const totalDepositedCumulative = filteredChitFunds.reduce((sum, cf) => sum + getChitDetails(cf).totalDeposited, 0);
  const nextDueInstallmentCumulative = filteredChitFunds.reduce((sum, cf) => sum + getChitDetails(cf).upcomingVal, 0);
  const totalOutstandingCumulative = totalChitValue - totalDepositedCumulative;
  
  const allottedCount = filteredChitFunds.filter(cf => cf.isAllotted).length;
  const activeCount = filteredChitFunds.length - allottedCount;

  // Exporters
  const handleExportCSV = () => {
    const headers = ['Organizer', 'Member Account', 'Total Pool Value', 'Duration (Months)', 'Paid Months', 'Upcoming Installment', 'Allotted?', 'Allotted Amount'];
    const exportData = filteredChitFunds.map(cf => {
      const details = getChitDetails(cf);
      return [
        cf.organizerName,
        cf.memberName,
        cf.totalValue,
        cf.durationMonths,
        details.paidMonthsCount,
        details.upcomingVal,
        cf.isAllotted ? 'Yes' : 'No',
        cf.allottedAmount || 0
      ];
    });
    exportToCSV(exportData, headers, 'Chit_Funds_Report');
  };

  const handleExportPDF = () => {
    const headers = ['Organizer', 'Member', 'Pool Value', 'Duration', 'Progress', 'Upcoming', 'Allotted', 'Payout'];
    const exportData = filteredChitFunds.map(cf => {
      const details = getChitDetails(cf);
      return [
        cf.organizerName,
        cf.memberName,
        `₹${cf.totalValue.toLocaleString()}`,
        `${cf.durationMonths}m`,
        `${details.paidMonthsCount}/${cf.durationMonths}m`,
        `₹${details.upcomingVal.toLocaleString()}`,
        cf.isAllotted ? 'Yes' : 'No',
        cf.allottedAmount ? `₹${cf.allottedAmount.toLocaleString()}` : '-'
      ];
    });
    exportToPDF('Chit Funds Ledger Statement', headers, exportData, 'Chit_Funds_Report');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-sans">Chit Funds Manager</h1>
          <p className="text-sm text-muted-foreground">Log cooperative contributions, record payouts, and track dynamic installment schedules</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              title="Dense List (Table)"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'card' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              title="Compact Cards"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
            </button>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 font-medium text-sm transition-all"
          >
            <Plus className="h-4 w-4" /> Add Chit Fund
          </button>
        </div>
      </div>

      {/* Grouped KPI Summary Strip (Rule 6) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Total Pool Value</span>
          <p className="text-lg font-mono font-bold text-foreground mt-1 tabular-nums">₹{totalChitValue.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Deposited / Contributed</span>
          <p className="text-lg font-mono font-bold text-green-500 mt-1 tabular-nums">₹{totalDepositedCumulative.toLocaleString()}</p>
        </div>
        <span className="hidden md:block">
          <div className="glass-panel p-4 rounded-xl border border-border/50 h-full">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Upcoming Outgo</span>
            <p className="text-lg font-mono font-bold text-foreground mt-1 tabular-nums">₹{nextDueInstallmentCumulative.toLocaleString()}</p>
          </div>
        </span>
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Outstanding Balances</span>
          <p className="text-lg font-mono font-bold text-foreground mt-1 tabular-nums">₹{totalOutstandingCumulative.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Allocation Status</span>
          <p className="text-lg font-bold text-foreground mt-1 font-sans">
            {allottedCount} Matured <span className="text-muted-foreground text-xs font-normal">/ {activeCount} Active</span>
          </p>
        </div>
      </div>

      {/* Control Row (Rule 7) */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-card/30 p-3 rounded-xl border border-border/50">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search organizer or member..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-background/50 border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none text-foreground w-64 transition-all"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-background/50 border border-border rounded-lg text-sm text-foreground outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="ALL">All Bidding Statuses</option>
            <option value="ALLOTTED">Allotted (Paid Out)</option>
            <option value="ACTIVE">Active (Accruing)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg text-xs font-medium border border-border/50 transition-all cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg text-xs font-medium border border-border/50 transition-all cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      </div>

      {filteredChitFunds.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground bg-card border border-border rounded-lg">
          No registered chit funds match the search parameters.
        </div>
      ) : viewMode === 'card' ? (
        /* Card View */
        <div className="space-y-6 flex-1 flex flex-col min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-1">
            {paginatedChitFunds.map((cf) => {
              const details = getChitDetails(cf);
              const progress = cf.durationMonths ? Math.min(100, (details.paidMonthsCount / cf.durationMonths) * 100) : 0;
              return (
                <div key={cf.id} className="bg-card p-4 rounded-xl border border-border/50 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-violet-500/10 text-violet-500 rounded-lg shrink-0">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-foreground">{cf.organizerName}</h3>
                          <p className="text-[10px] text-muted-foreground">Member: {cf.memberName}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(cf.id)} className="text-muted-foreground hover:text-red-500 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1 font-mono">
                        <span>Paid cycles</span>
                        <span>{details.paidMonthsCount} / {cf.durationMonths} Months</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs pt-2.5 border-t border-border/30">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Pool Value:</span>
                        <span className="font-bold text-violet-500 font-mono tabular-nums">₹{cf.totalValue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Deposited:</span>
                        <span className="font-semibold text-foreground font-mono tabular-nums">₹{details.totalDeposited.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Outstanding:</span>
                        <span className="font-semibold text-foreground font-mono tabular-nums">₹{details.outstandingAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Next Installment:</span>
                        <span className="font-semibold text-foreground font-mono">
                          ₹{details.upcomingVal.toLocaleString()} ({details.upcomingMonth})
                        </span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-border/20">
                        <span className="text-muted-foreground">Allotted Amount:</span>
                        <span className={`font-semibold ${cf.isAllotted ? 'text-green-500' : 'text-amber-500'}`}>
                          {cf.isAllotted ? `₹${cf.allottedAmount?.toLocaleString()}` : 'Not Allotted'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* High-Density Dense Table View with Nested Expandable Statement Schedules (Default) */
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="overflow-auto custom-scrollbar flex-1">
              <table className="min-w-full divide-y divide-border/20 dense-table">
                <thead className="bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none w-10"></th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      Chit Organizer
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      Member Account
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      Total Value
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      Deposited Progress
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      Upcoming Installment
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      Outstanding Bal.
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      Bidding Payout Status
                    </th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card/50 divide-y divide-border/20">
                  {paginatedChitFunds.map((cf, idx) => {
                    const details = getChitDetails(cf);
                    const progress = cf.durationMonths ? Math.min(100, (details.paidMonthsCount / cf.durationMonths) * 100) : 0;
                    const isExpanded = expandedChitFundId === cf.id;
                    
                    return (
                      <React.Fragment key={cf.id}>
                        <tr 
                          onClick={() => setExpandedChitFundId(isExpanded ? null : cf.id)}
                          className={`hover:bg-muted/30 transition-colors group cursor-pointer ${idx % 2 === 0 ? 'bg-background/20' : 'bg-card/10'} ${isExpanded ? 'bg-primary/5' : ''}`}
                        >
                          <td className="px-4 py-2.5 text-center">
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <div className="flex items-center">
                              <Users className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                              <span className="font-semibold text-foreground text-sm">{cf.organizerName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-xs text-foreground font-medium">
                            {cf.memberName}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap font-mono font-bold text-violet-500 text-sm tabular-nums">
                            ₹{cf.totalValue.toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-muted rounded-full h-1">
                                <div className="bg-violet-500 h-1 rounded-full" style={{ width: `${progress}%` }}></div>
                              </div>
                              <span className="text-[10px] text-muted-foreground font-mono">{details.paidMonthsCount}/{cf.durationMonths}m</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap font-mono text-xs text-foreground font-medium">
                            ₹{details.upcomingVal.toLocaleString()} <span className="text-[9px] text-muted-foreground">({details.upcomingMonth})</span>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap font-mono text-xs text-foreground font-bold tabular-nums">
                            ₹{details.outstandingAmount.toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-xs">
                            {cf.isAllotted ? (
                              <span className="text-green-500 font-bold">Allotted (₹{cf.allottedAmount?.toLocaleString()})</span>
                            ) : (
                              <span className="text-amber-500 font-medium">Awaiting Bidding</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-right text-xs font-medium">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(cf.id);
                                }} 
                                className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                                title="Delete Record"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Collapsible payment schedules nested drawer (Bloomberg/TradingView density) */}
                        {isExpanded && (
                          <tr className="bg-muted/10">
                            <td colSpan={9} className="px-6 py-4 border-l-2 border-primary">
                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Left side schedule statement */}
                                <div className="lg:col-span-7 space-y-3">
                                  <div className="flex justify-between items-center pb-2 border-b border-border/30">
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                      <Calendar className="h-3.5 w-3.5" /> Payment installment cycles schedule statement
                                    </h4>
                                    <span className="text-[10px] text-muted-foreground italic">Change status triggers real-time progress calculations</span>
                                  </div>

                                  <div className="border border-border/50 rounded-xl overflow-hidden shadow-xs max-h-[300px] overflow-y-auto custom-scrollbar">
                                    <table className="min-w-full divide-y divide-border/20 text-xs text-foreground dense-table">
                                      <thead className="bg-muted/40 sticky top-0">
                                        <tr>
                                          <th className="px-3 py-2 text-left font-bold text-muted-foreground uppercase tracking-wider w-8">Cycle</th>
                                          <th className="px-3 py-2 text-left font-bold text-muted-foreground uppercase tracking-wider">Target Month</th>
                                          <th className="px-3 py-2 text-left font-bold text-muted-foreground uppercase tracking-wider">Installment Value</th>
                                          <th className="px-3 py-2 text-left font-bold text-muted-foreground uppercase tracking-wider">Bidding Dividend Value</th>
                                          <th className="px-3 py-2 text-left font-bold text-muted-foreground uppercase tracking-wider">Payment Status</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border/20 bg-card/60">
                                        {details.schedule.map((row, rIdx) => {
                                          const isClosed = row.status === 'Paid & Closed' || row.status === 'Allotted';
                                          return (
                                            <tr key={row.srNo} className="hover:bg-muted/20">
                                              <td className="px-3 py-1.5 font-mono text-muted-foreground">{row.srNo}</td>
                                              <td className="px-3 py-1.5 font-semibold">{row.calendarMonth} {row.calendarYear}</td>
                                              <td className="px-3 py-1.5 font-mono font-semibold">₹{row.actualAmount.toLocaleString()}</td>
                                              <td className="px-3 py-1.5 font-mono font-semibold">₹{row.chitAmountAllocated.toLocaleString()}</td>
                                              <td className="px-3 py-1.5">
                                                {isClosed ? (
                                                  <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold ${
                                                    row.status === 'Paid & Closed' ? 'bg-green-500/10 text-green-500' : 'bg-primary/10 text-primary'
                                                  }`}>
                                                    {row.status}
                                                  </span>
                                                ) : (
                                                  <select
                                                    value={row.status}
                                                    onChange={(e) => handleStatusChange(cf, rIdx, e.target.value as any)}
                                                    className="px-2 py-0.5 rounded text-[10px] font-bold border border-border/80 bg-background text-amber-500 outline-none focus:ring-0 cursor-pointer"
                                                  >
                                                    <option value="Open / Pending">Open / Pending</option>
                                                    <option value="Paid & Closed">Paid & Closed</option>
                                                    <option value="Allotted">Allotted</option>
                                                  </select>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                {/* Right side linked transaction audits */}
                                <div className="lg:col-span-5 space-y-3 border-l border-border/30 lg:pl-6">
                                  <div className="flex justify-between items-center pb-2 border-b border-border/30">
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                      <FileText className="h-3.5 w-3.5" /> Linked expense transactions log
                                    </h4>
                                  </div>

                                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {expenses.filter(e => e.linkedChitFund?.id === cf.id).length === 0 ? (
                                      <div className="text-center py-8 bg-background/20 rounded-xl border border-border/30">
                                        <Wallet className="h-8 w-8 mx-auto text-muted-foreground opacity-50 mb-1" />
                                        <p className="text-xs text-muted-foreground">No linked debit/credit records found.</p>
                                      </div>
                                    ) : (
                                      expenses.filter(e => e.linkedChitFund?.id === cf.id).map(exp => (
                                        <div key={exp.id} className="p-2.5 rounded-lg border border-border/20 bg-background/50 hover:bg-background/80 transition-colors flex justify-between items-center text-xs">
                                          <div>
                                            <div className="font-semibold text-foreground">{exp.category}</div>
                                            <div className="text-[10px] text-muted-foreground font-mono">{exp.expenseDate}</div>
                                            {exp.description && <p className="text-[10px] text-muted-foreground italic mt-0.5">{exp.description}</p>}
                                          </div>
                                          <span className={`font-mono font-bold ${exp.type === 'DEBIT' ? 'text-red-500' : 'text-green-500'}`}>
                                            {exp.type === 'DEBIT' ? '-' : '+'}₹{exp.amount.toLocaleString()}
                                          </span>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredChitFunds.length > 0 && (
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
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between font-sans">
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-muted-foreground">
                      Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{' '}
                      <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, filteredChitFunds.length)}</span> of{' '}
                      <span className="font-semibold text-foreground">{filteredChitFunds.length}</span> results
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Show</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="px-2.5 py-1 rounded bg-card border border-border text-foreground text-xs outline-none focus:ring-1 focus:ring-primary cursor-pointer"
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
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-5 max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-border">
            <h2 className="text-lg font-bold text-foreground mb-4">Add Chit Fund</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Meta Fields */}
              <div className="lg:col-span-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Organizer Name</label>
                    <input required value={formData.organizerName} onChange={e => setFormData({ ...formData, organizerName: e.target.value })} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary outline-none transition-all text-xs" placeholder="Organizer" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Member Name</label>
                    <input required value={formData.memberName} onChange={e => setFormData({ ...formData, memberName: e.target.value })} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary outline-none transition-all text-xs" placeholder="Your name" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Total Pool Value (₹)</label>
                    <input required type="number" value={formData.totalValue || ''} onChange={e => handleMetaChange('totalValue', parseFloat(e.target.value))} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary outline-none transition-all text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Start Month</label>
                    <input required type="month" value={formData.startDate ? formData.startDate.substring(0, 7) : ''} onChange={e => handleMetaChange('startDate', e.target.value + '-01')} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary outline-none transition-all text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Duration (Months)</label>
                    <input required type="number" value={formData.durationMonths || ''} onChange={e => handleMetaChange('durationMonths', parseInt(e.target.value))} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary outline-none transition-all text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Linked Bank Account</label>
                    <select value={formData.linkedAccountId} onChange={e => setFormData({ ...formData, linkedAccountId: e.target.value })} className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary outline-none transition-all text-xs">
                      <option value="">-- None --</option>
                      {bankAccounts.map(ba => (
                        <option key={ba.id} value={ba.id}>{ba.name} ({ba.bankName})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Auto computed info summary */}
                <div className="p-3.5 bg-muted/20 rounded-xl space-y-2 text-xs border border-border/50">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Bidding Allotted:</span>
                    <span className="font-semibold text-foreground">{scheduleRows.some(r => r.status === 'Allotted') ? 'Yes' : 'No'}</span>
                  </div>
                  {scheduleRows.some(r => r.status === 'Allotted') && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-medium">Net Payout Amount:</span>
                      <span className="font-semibold text-green-500 font-mono">₹{scheduleRows.find(r => r.status === 'Allotted')?.chitAmountAllocated.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Pending Cycles:</span>
                    <span className="font-semibold text-foreground font-mono">{scheduleRows.filter(r => r.status === 'Open / Pending').length} months</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg text-xs font-semibold">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-xs font-semibold transition-all">Save Chit Fund</button>
                </div>
              </div>

              {/* Right Column: Spreadsheet payment schedule editor */}
              <div className="lg:col-span-7 flex flex-col min-h-0 border-l border-border/50 lg:pl-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Interactive Bidding Cycle Schedule Editor</h3>
                  <button
                    type="button"
                    onClick={rebuildSchedule}
                    className="text-xs text-primary hover:underline font-semibold"
                  >
                    Reset Schedule
                  </button>
                </div>
                
                <div className="border border-border/50 rounded-xl overflow-hidden max-h-[50vh] overflow-y-auto custom-scrollbar shadow-xs">
                  <table className="min-w-full divide-y divide-border/20 text-xs">
                    <thead className="bg-muted/40 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold text-muted-foreground uppercase tracking-wider w-8">Cycle</th>
                        <th className="px-3 py-2 text-left font-bold text-muted-foreground uppercase tracking-wider">Month</th>
                        <th className="px-3 py-2 text-left font-bold text-muted-foreground uppercase tracking-wider">Actual Due (₹)</th>
                        <th className="px-3 py-2 text-left font-bold text-muted-foreground uppercase tracking-wider">Bid Payout (₹)</th>
                        <th className="px-3 py-2 text-left font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20 bg-card">
                      {scheduleRows.map((row, idx) => (
                        <tr key={row.srNo} className="hover:bg-muted/10">
                          <td className="px-3 py-1.5 text-muted-foreground font-mono">{row.srNo}</td>
                          <td className="px-3 py-1.5 text-foreground font-semibold">{row.calendarMonth} {row.calendarYear}</td>
                          <td className="px-2 py-1">
                            <input
                              type="number"
                              value={row.actualAmount}
                              onChange={(e) => updateScheduleField(idx, 'actualAmount', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 rounded bg-background text-foreground border border-border focus:border-primary outline-none text-xs font-mono"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="number"
                              value={row.chitAmountAllocated}
                              onChange={(e) => updateScheduleField(idx, 'chitAmountAllocated', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 rounded bg-background text-foreground border border-border focus:border-primary outline-none text-xs font-mono"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <select
                              value={row.status}
                              onChange={(e) => updateScheduleField(idx, 'status', e.target.value)}
                              className="w-full px-2 py-1 rounded bg-background text-foreground border border-border focus:border-primary outline-none text-xs cursor-pointer"
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
