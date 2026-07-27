import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  TrendingUp, 
  AlertTriangle, 
  Trash2, 
  Percent, 
  RefreshCw, 
  Mail, 
  CheckCircle2, 
  XCircle, 
  Info,
  Clock
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useToastStore } from '../store/toastStore';
import { useConfirmStore } from '../store/confirmStore';

interface BudgetSummary {
  id?: string;
  category: string;
  limitAmount: number;
  rolloverAmount: number;
  spentAmount: number;
  percentage: number;
  alert?: string;
  daysLeft: number;
  rollover: boolean;
  emailAlert: boolean;
}

interface ScheduledPayment {
  id: string;
  amount: number;
  transactionType: string;
  referenceType: string;
  dueDate: string;
  status: string;
  description?: string;
}

interface ObligationsSummary {
  totalOutgoing: number;
  breakdown: Record<string, number>;
  obligations: ScheduledPayment[];
}

export default function Budgets() {
  const toast = useToastStore();
  const confirm = useConfirmStore();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${month}`;
  });

  const [budgets, setBudgets] = useState<BudgetSummary[]>([]);
  const [obligationsSummary, setObligationsSummary] = useState<ObligationsSummary>({
    totalOutgoing: 0,
    breakdown: {},
    obligations: []
  });
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalCategory, setModalCategory] = useState('');
  const [modalLimit, setModalLimit] = useState('');
  const [modalRollover, setModalRollover] = useState(false);
  const [modalEmailAlert, setModalEmailAlert] = useState(true);
  const [modalBudgetId, setModalBudgetId] = useState<string | null>(null);

  const fetchBudgetData = async () => {
    setLoading(true);
    try {
      const [budgetsData, obligationsData] = await Promise.all([
        apiClient(`/api/budgets/summary?month=${selectedMonth}`),
        apiClient(`/api/budgets/obligations?month=${selectedMonth}`)
      ]);
      setBudgets(budgetsData);
      setObligationsSummary(obligationsData);
    } catch (error: any) {
      toast.error('Failed to load budgets & obligations data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgetData();
  }, [selectedMonth]);

  const handleOpenSetBudget = (budget: BudgetSummary) => {
    setModalCategory(budget.category);
    setModalLimit(budget.limitAmount > 0 ? String(budget.limitAmount) : '');
    setModalRollover(budget.rollover);
    setModalEmailAlert(budget.emailAlert);
    setModalBudgetId(budget.id || null);
    setShowModal(true);
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalLimit.trim() || isNaN(Number(modalLimit)) || Number(modalLimit) < 0) {
      toast.error('Please enter a valid positive budget limit amount');
      return;
    }

    try {
      await apiClient('/api/budgets', {
        method: 'POST',
        body: JSON.stringify({
          category: modalCategory,
          amount: Number(modalLimit),
          month: selectedMonth,
          rollover: modalRollover,
          emailAlert: modalEmailAlert
        })
      });
      toast.success(`Successfully updated budget for ${modalCategory}`);
      setShowModal(false);
      fetchBudgetData();
    } catch (error) {
      toast.error('Failed to save budget settings');
    }
  };

  const handleDeleteBudget = async () => {
    if (!modalBudgetId) return;

    confirm.show({
      title: `Delete Budget for ${modalCategory}?`,
      message: 'This will remove the spending cap and alerts for this category in the selected month.',
      onConfirm: async () => {
        try {
          await apiClient(`/api/budgets/${modalBudgetId}`, {
            method: 'DELETE'
          });
          toast.success(`Deleted budget for ${modalCategory}`);
          setShowModal(false);
          fetchBudgetData();
        } catch (error) {
          toast.error('Failed to delete budget limit');
        }
      }
    });
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage === 0) return 'bg-muted';
    if (percentage < 50) return 'bg-emerald-500';
    if (percentage < 80) return 'bg-amber-500';
    if (percentage <= 100) return 'bg-red-500';
    return 'bg-rose-600 animate-pulse';
  };

  const getProgressTextColor = (percentage: number) => {
    if (percentage < 50) return 'text-emerald-500';
    if (percentage < 80) return 'text-amber-500';
    if (percentage <= 100) return 'text-red-500';
    return 'text-rose-600 font-bold';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatObligationName = (type: string) => {
    switch (type) {
      case 'LOAN_EMI': return 'Loan EMI';
      case 'CHIT_INSTALLMENT': return 'Chit Fund Installment';
      case 'RECURRING_DEPOSIT': return 'Recurring Deposit';
      case 'SIP_INVESTMENT': return 'SIP Investment';
      case 'INSURANCE_PREMIUM': return 'Insurance Premium';
      case 'UTILITY_BILL': return 'Utility Bill';
      default: return type.replace('_', ' ');
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 bg-card border border-border/50 p-4 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" /> Budgeting & Control Dashboard
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor monthly family category budgets, rollover surpluses, and projected outgoings.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-4 w-4" /> Selected Month:
          </span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs font-semibold bg-muted border border-border/60 hover:bg-muted/70 focus:outline-none focus:ring-1 focus:ring-primary rounded-xl px-3.5 py-1.5 transition-all text-foreground"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center bg-card border border-border/50 rounded-2xl">
          <div className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-primary" /> Loading budgets and obligations...
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Panel: Category Budgets */}
          <div className="lg:col-span-2 flex flex-col min-h-0 bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-center pb-3 border-b border-border/50 shrink-0">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Percent className="h-4 w-4 text-primary" /> Category Monthly Budgets
              </h2>
              <span className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                Progress Status
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 py-3 space-y-3.5 custom-scrollbar min-h-0">
              {budgets.map((budget) => {
                const totalLimit = budget.limitAmount + budget.rolloverAmount;
                const hasLimit = totalLimit > 0;
                
                return (
                  <div 
                    key={budget.category} 
                    className="p-3 bg-muted/20 border border-border/40 hover:border-border/80 rounded-xl transition-all flex flex-col gap-2.5"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="text-xs font-bold text-foreground">{budget.category}</h3>
                        {budget.alert && (
                          <p className="text-[10px] text-red-500 font-medium mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 shrink-0" /> {budget.alert}
                          </p>
                        )}
                        {hasLimit && budget.daysLeft > 0 && (
                          <p className="text-[9px] text-muted-foreground mt-0.5">
                            ⏱️ {budget.daysLeft} days remaining in this budget cycle.
                          </p>
                        )}
                      </div>
                      
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-foreground">
                          ₹{budget.spentAmount.toLocaleString('en-IN')}
                          <span className="text-muted-foreground font-normal text-[10px] ml-1">
                            / {hasLimit ? `₹${totalLimit.toLocaleString('en-IN')}` : 'No Limit'}
                          </span>
                        </div>
                        {hasLimit && (
                          <div className={`text-[10px] font-semibold mt-0.5 ${getProgressTextColor(budget.percentage)}`}>
                            {budget.percentage.toFixed(1)}% Used
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {hasLimit && (
                      <div className="h-2 w-full bg-muted border border-border/20 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(budget.percentage)}`}
                          style={{ width: `${Math.min(100, budget.percentage)}%` }}
                        />
                      </div>
                    )}

                    {/* Details Badges and Set Action */}
                    <div className="flex justify-between items-center gap-3 mt-0.5 pt-2 border-t border-border/30">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {budget.rolloverAmount > 0 && (
                          <span className="text-[9px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <RefreshCw className="h-2.5 w-2.5" /> Rollover +₹{budget.rolloverAmount}
                          </span>
                        )}
                        {budget.rollover && (
                          <span className="text-[9px] font-medium bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                            🔄 Rollover Enabled
                          </span>
                        )}
                        {budget.emailAlert && (
                          <span className="text-[9px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Mail className="h-2.5 w-2.5" /> Email Alert
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleOpenSetBudget(budget)}
                        className="text-[10px] font-bold text-primary hover:text-primary-foreground hover:bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg transition-all"
                      >
                        {hasLimit ? 'Edit Limit' : 'Set Limit'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Recurring Obligations */}
          <div className="flex flex-col min-h-0 bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
            <div className="pb-3 border-b border-border/50 shrink-0">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" /> Monthly Outgoing Obligations
              </h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Consolidated auto-debits and commitments for this cycle.
              </p>
            </div>

            {/* Total Metric Card */}
            <div className="bg-primary/10 border border-primary/20 p-3.5 rounded-xl mt-3 shrink-0">
              <div className="text-[10px] uppercase font-black text-primary tracking-wider">Total Projected Outgoing</div>
              <div className="text-xl font-extrabold text-foreground mt-1">
                ₹{obligationsSummary.totalOutgoing.toLocaleString('en-IN')}
              </div>
            </div>

            {/* Breakdown Lists */}
            {Object.keys(obligationsSummary.breakdown).length > 0 && (
              <div className="mt-3 shrink-0">
                <div className="text-[10px] uppercase font-black text-muted-foreground tracking-wider mb-2">Category Breakdown</div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(obligationsSummary.breakdown).map(([type, amount]) => (
                    <div key={type} className="bg-muted/30 border border-border/30 px-2.5 py-1.5 rounded-lg">
                      <span className="block text-[9px] font-semibold text-muted-foreground truncate">{formatObligationName(type)}</span>
                      <span className="block text-xs font-bold text-foreground mt-0.5">₹{Number(amount).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detail Obligations Schedule */}
            <div className="flex-1 overflow-y-auto pr-1 py-4 custom-scrollbar min-h-0">
              <div className="text-[10px] uppercase font-black text-muted-foreground tracking-wider mb-2">Payment Schedule</div>
              {obligationsSummary.obligations.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground bg-muted/20 border border-dashed border-border/40 rounded-xl">
                  No scheduled payment obligations for this month.
                </div>
              ) : (
                <div className="space-y-2">
                  {obligationsSummary.obligations.map((ob) => (
                    <div 
                      key={ob.id} 
                      className="p-2.5 bg-muted/25 border border-border/40 hover:border-border/70 rounded-lg flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-foreground truncate">
                            {formatObligationName(ob.referenceType)}
                          </span>
                          {getStatusIcon(ob.status)}
                        </div>
                        <span className="block text-[9px] text-muted-foreground truncate mt-0.5">
                          {ob.description || 'No description provided'}
                        </span>
                        <span className="block text-[8px] font-medium text-muted-foreground mt-0.5">
                          🗓️ Due: {new Date(ob.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-foreground">
                          ₹{ob.amount.toLocaleString('en-IN')}
                        </span>
                        <span className="block text-[8px] uppercase font-bold text-muted-foreground mt-0.5">
                          {ob.transactionType}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Set/Edit Budget Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border/50 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-border/50 bg-muted/30 flex justify-between items-center">
              <h3 className="text-sm font-bold text-foreground">
                Set Spending Cap: {modalCategory}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground border border-border/60 bg-muted/50 px-2 py-0.5 rounded-lg"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-muted-foreground">Monthly Limit (INR)</label>
                <input 
                  type="text"
                  value={modalLimit}
                  onChange={(e) => setModalLimit(e.target.value)}
                  placeholder="E.g. 10000"
                  className="w-full text-xs font-medium bg-muted border border-border/60 focus:outline-none focus:ring-1 focus:ring-primary rounded-xl px-3 py-2 text-foreground"
                  autoFocus
                />
              </div>

              <div className="space-y-3.5 bg-muted/20 border border-border/40 p-3 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-foreground">surplus Rollover</label>
                    <span className="block text-[9px] text-muted-foreground mt-0.5">
                      Carry forward unused budget left from previous month.
                    </span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={modalRollover}
                    onChange={(e) => setModalRollover(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-border/20">
                  <div>
                    <label className="block text-xs font-bold text-foreground">Email Alert Notification</label>
                    <span className="block text-[9px] text-muted-foreground mt-0.5">
                      Get alert warnings by email when spend reaches 80% or exceeds limit.
                    </span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={modalEmailAlert}
                    onChange={(e) => setModalEmailAlert(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3 border-t border-border/50">
                {modalBudgetId ? (
                  <button
                    type="button"
                    onClick={handleDeleteBudget}
                    className="flex items-center gap-1.5 text-xs font-bold text-destructive hover:bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-xl transition-all"
                  >
                    <Trash2 className="h-4 w-4" /> Remove Budget
                  </button>
                ) : (
                  <div />
                )}

                <button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
                >
                  Save Budget Cap
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
