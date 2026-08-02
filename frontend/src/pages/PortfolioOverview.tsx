import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { apiClient } from '../api/client';
import {
  Landmark, TrendingUp, CreditCard, Target, Coins,
  Zap, AlertTriangle, Sparkles, Plus, ArrowRight, Calendar,
  CheckCircle2, Clock, ChevronRight, TrendingDown, BarChart3
} from 'lucide-react';

// ─── Colour palette ───────────────────────────────────────────────────────────
const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// ─── Types ────────────────────────────────────────────────────────────────────
interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  expenseDate: string;
  type: 'DEBIT' | 'CREDIT';
}

interface IncomeSource {
  id: string;
  sourceName: string;
  ownerName: string;
  amount: number;
  frequency: string;
}

interface Recommendation { title: string; description: string; type: string; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function monthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function last3MonthKeys(): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${d.getMonth()}`);
  }
  return keys;
}

/** Returns average value across months found in the map */
function avgAcrossMonths(map: Map<string, number>): number {
  if (map.size === 0) return 0;
  const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
  return total / map.size;
}

// Categories to EXCLUDE from "living expenses" (they are savings/investment outflows)
const SAVINGS_CATS = ['investment', 'loan', 'emi', 'chit', 'fd', 'rd', 'saving',
  'transfer', 'deposit', 'insurance premium', 'mutual fund', 'sip'];

function isSavingsCat(cat: string) {
  const lc = (cat || '').toLowerCase();
  return SAVINGS_CATS.some(s => lc.includes(s));
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PortfolioOverview() {
  const [loading, setLoading] = useState(true);

  // Raw data buckets
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [chitFunds, setChitFunds] = useState<any[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [insights, setInsights] = useState<Recommendation[]>([]);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const withTimeout = (p: Promise<any>, ms = 5000) =>
        Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);

      const [banks, invs, lns, deps, gls, exps, incs, insRes, chits] = await Promise.all([
        withTimeout(apiClient('/api/bankaccounts')).catch(() => []),
        withTimeout(apiClient('/api/investments')).catch(() => []),
        withTimeout(apiClient('/api/loans')).catch(() => []),
        withTimeout(apiClient('/api/deposits')).catch(() => []),
        withTimeout(apiClient('/api/goals')).catch(() => []),
        withTimeout(apiClient('/api/expenses')).catch(() => []),
        withTimeout(apiClient('/api/incomesources')).catch(() => []),
        withTimeout(apiClient('/api/ai/recommendations'), 3000).catch(() => []),
        withTimeout(apiClient('/api/chitfunds')).catch(() => []),
      ]);

      setBankAccounts(Array.isArray(banks) ? banks : []);
      setInvestments(Array.isArray(invs) ? invs : []);
      setLoans(Array.isArray(lns) ? lns : []);
      setDeposits(Array.isArray(deps) ? deps : []);
      setGoals(Array.isArray(gls) ? gls : []);
      setAllExpenses(Array.isArray(exps) ? exps : []);
      setIncomeSources(Array.isArray(incs) ? incs : []);
      setInsights(Array.isArray(insRes) ? insRes : []);
      setChitFunds(Array.isArray(chits) ? chits : []);
    } catch (e) {
      console.error('Dashboard fetch failed', e);
    } finally {
      setLoading(false);
    }
  };

  // ── Computed values (all via useMemo) ─────────────────────────────────────

  /** ① Bank balance */
  const bankBalance = useMemo(
    () => bankAccounts.reduce((s, b) => s + (b.currentBalance || 0), 0),
    [bankAccounts]
  );

  /** ② Investments breakdown by asset class */
  const investmentBreakdown = useMemo(() => {
    const mf = investments.filter(i =>
      (i.type === 'Mutual Fund' || i.type === 'SIP') && !/gold|silver|etf|fof/i.test(i.name || '')
    ).reduce((s, i) => s + (i.currentValue || i.investedAmount || 0), 0);

    const gold = investments.filter(i =>
      /gold/i.test(i.name || '') || /gold/i.test(i.type || '')
    ).reduce((s, i) => s + (i.currentValue || i.investedAmount || 0), 0);

    const silver = investments.filter(i =>
      /silver/i.test(i.name || '') || /silver/i.test(i.type || '')
    ).reduce((s, i) => s + (i.currentValue || i.investedAmount || 0), 0);

    const stocks = investments.filter(i =>
      (i.type === 'Stock' || i.type === 'Stock / Equity' || i.type === 'Equity') &&
      !/gold|silver/i.test(i.name || '')
    ).reduce((s, i) => s + (i.currentValue || i.investedAmount || 0), 0);

    const other = investments.filter(i => {
      const t = (i.type || '').toLowerCase();
      const n = (i.name || '').toLowerCase();
      return !['mutual fund', 'sip', 'stock', 'stock / equity', 'equity'].includes(t) &&
        !/gold|silver|etf|fof/i.test(n);
    }).reduce((s, i) => s + (i.currentValue || i.investedAmount || 0), 0);

    const fds = deposits.filter(d => d.type === 'FD')
      .reduce((s, d) => s + (d.principalAmount || 0), 0);

    const rds = deposits.filter(d => d.type === 'RD')
      .reduce((s, d) => s + (d.totalDeposited || d.principalAmount || 0), 0);

    // Chit funds: paid installments value
    const chits = chitFunds.reduce((s, c) => {
      const paid = (c.durationMonths || 0) - (c.pendingInstallments || 0);
      return s + paid * (c.monthlyInstallment || 0);
    }, 0);

    return { mf, gold, silver, stocks, fds, rds, chits, other };
  }, [investments, deposits, chitFunds]);

  const totalInvested = useMemo(() =>
    Object.values(investmentBreakdown).reduce((a, b) => a + b, 0),
    [investmentBreakdown]
  );

  const totalLoans = useMemo(
    () => loans.reduce((s, l) => s + (l.outstandingAmount || 0), 0),
    [loans]
  );

  const netWorth = bankBalance + totalInvested - totalLoans;

  /** ③ 3-Month average cash flow engine */
  const cashFlow = useMemo(() => {
    const validKeys = new Set(last3MonthKeys());

    // Salary: avg of CREDIT transactions with category='salary' in last 3 months
    const salaryByMonth = new Map<string, number>();
    // Living debits: avg monthly DEBIT excluding savings categories
    const debitByMonth = new Map<string, number>();

    allExpenses.forEach(e => {
      const key = monthKey(e.expenseDate);
      if (!validKeys.has(key)) return;

      if (e.type === 'CREDIT' && (e.category || '').toLowerCase() === 'salary') {
        salaryByMonth.set(key, (salaryByMonth.get(key) || 0) + (e.amount || 0));
      }
      if (e.type === 'DEBIT' && !isSavingsCat(e.category)) {
        debitByMonth.set(key, (debitByMonth.get(key) || 0) + (e.amount || 0));
      }
    });

    let avgSalary = avgAcrossMonths(salaryByMonth);

    // Fallback: Monthly income sources
    if (avgSalary === 0) {
      avgSalary = incomeSources
        .filter(i => i.frequency === 'Monthly' || (i.sourceName || '').toLowerCase().includes('salary'))
        .reduce((s, i) => s + (i.amount || 0), 0);
    }

    // Side income: non-salary income sources (monthly average — divide yearly by 12)
    const sideIncome = incomeSources
      .filter(i => !(i.sourceName || '').toLowerCase().includes('salary') && i.frequency !== 'Monthly')
      .reduce((s, i) => {
        const amt = i.amount || 0;
        if (i.frequency === 'Yearly') return s + amt / 12;
        if (i.frequency === 'One-time') return s + 0;
        return s + amt; // Assume monthly
      }, 0) +
      incomeSources
        .filter(i => i.frequency === 'Monthly' && !(i.sourceName || '').toLowerCase().includes('salary'))
        .reduce((s, i) => s + (i.amount || 0), 0);

    const avgLivingExpenses = avgAcrossMonths(debitByMonth);

    // Fixed monthly outflows
    const totalEMI = loans.reduce((s, l) => s + (l.emiAmount || 0), 0);
    const totalRD = deposits.filter(d => d.type === 'RD')
      .reduce((s, d) => s + (d.monthlyDepositAmount || 0), 0);
    const totalChit = chitFunds.filter(c => (c.pendingInstallments || 0) > 0)
      .reduce((s, c) => s + (c.monthlyInstallment || 0), 0);
    const totalSavingsOutflows = totalRD + totalChit;

    const totalInflow = avgSalary + sideIncome;
    const totalOutflow = avgLivingExpenses + totalEMI + totalSavingsOutflows;
    const netSurplus = totalInflow - totalOutflow;

    return {
      avgSalary,
      sideIncome,
      avgLivingExpenses,
      totalEMI,
      totalRD,
      totalChit,
      totalSavingsOutflows,
      totalInflow,
      totalOutflow,
      netSurplus,
    };
  }, [allExpenses, incomeSources, loans, deposits, chitFunds]);

  /** ④ Year-end projection (Dec 31 of current year) */
  const projection = useMemo(() => {
    const now = new Date();
    const monthsRemaining = 12 - (now.getMonth() + 1); // months left after this month
    const projectedSavings = Math.max(0, cashFlow.netSurplus * monthsRemaining);
    const projectedExpenses = cashFlow.totalOutflow * monthsRemaining;
    const projectedNetWorth = netWorth + projectedSavings;
    return { monthsRemaining, projectedSavings, projectedExpenses, projectedNetWorth };
  }, [cashFlow, netWorth]);

  /** ⑤ Priority-weighted goal projections */
  const goalProjections = useMemo(() => {
    const surplus = cashFlow.netSurplus;
    const activeGoals = goals.filter(g => g.currentAmount < g.targetAmount);

    if (surplus <= 0 || activeGoals.length === 0) {
      return goals.map(g => ({ ...g, allocation: 0, monthsNeeded: Infinity, projectedDate: null, isOnTrack: false, behindAmount: 0, neededPerMonth: 0, isComplete: g.currentAmount >= g.targetAmount }));
    }

    // Priority weights (higher = more monthly allocation)
    const weight = (p: string) => p === 'HIGH' ? 3 : p === 'MEDIUM' ? 1.5 : 1;

    const totalWeight = activeGoals.reduce((s, g) => {
      const remaining = g.targetAmount - g.currentAmount;
      return s + remaining * weight(g.priority);
    }, 0);

    return goals.map(g => {
      const remaining = Math.max(0, g.targetAmount - g.currentAmount);
      if (remaining === 0) return { ...g, allocation: 0, monthsNeeded: 0, projectedDate: new Date(), isOnTrack: true, behindAmount: 0, neededPerMonth: 0, isComplete: true };

      const share = totalWeight > 0 ? (remaining * weight(g.priority)) / totalWeight : 1 / activeGoals.length;
      const allocation = surplus * share;
      const monthsNeeded = allocation > 0 ? Math.ceil(remaining / allocation) : Infinity;
      const projectedDate = allocation > 0 ? new Date(Date.now() + monthsNeeded * 30.44 * 24 * 3600 * 1000) : null;

      const targetDate = new Date(g.targetDate);
      const isOnTrack = projectedDate !== null && projectedDate <= targetDate;
      const monthsToTarget = Math.max(0, (targetDate.getTime() - Date.now()) / (30.44 * 24 * 3600 * 1000));
      const neededPerMonth = monthsToTarget > 0 ? remaining / monthsToTarget : Infinity;
      const behindAmount = !isOnTrack && allocation > 0 ? (neededPerMonth - allocation) * monthsToTarget : 0;

      return { ...g, allocation, monthsNeeded, projectedDate, isOnTrack, behindAmount: Math.max(0, behindAmount), neededPerMonth, isComplete: false };
    });
  }, [goals, cashFlow.netSurplus]);

  /** ⑥ Pie chart data */
  const pieData = useMemo(() => [
    { name: 'Bank Cash', value: bankBalance },
    { name: 'Mutual Funds', value: investmentBreakdown.mf },
    { name: 'FD/RD', value: investmentBreakdown.fds + investmentBreakdown.rds },
    { name: 'Chit Funds', value: investmentBreakdown.chits },
    { name: 'Gold/Silver', value: investmentBreakdown.gold + investmentBreakdown.silver },
    { name: 'Other', value: investmentBreakdown.stocks + investmentBreakdown.other },
  ].filter(d => d.value > 0), [bankBalance, investmentBreakdown]);

  /** ⑦ Recent 5 transactions */
  const recentExpenses = useMemo(() =>
    [...allExpenses]
      .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime())
      .slice(0, 5),
    [allExpenses]
  );

  // ── NPA warning ────────────────────────────────────────────────────────────
  const isHighLiquidCash = bankBalance > 30000 && netWorth > 0 && bankBalance / netWorth > 0.25;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading financial cockpit…</span>
        </div>
      </div>
    );
  }

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col space-y-6 overflow-y-auto pb-8 pr-1 custom-scrollbar">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary fill-primary/10" /> Unified Financial Cockpit
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Deterministic projections · 3-month averages · Priority-weighted goal timelines
        </p>
      </div>

      {/* ── Top 4-card summary ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Worth */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-5 text-white relative overflow-hidden col-span-2 lg:col-span-1">
          <div className="relative z-10">
            <p className="text-indigo-100 text-xs font-semibold uppercase tracking-wider mb-1">Total Net Worth</p>
            <h2 className="text-2xl font-bold font-mono">{fmt(netWorth)}</h2>
            <span className="text-[10px] text-indigo-200 mt-1 block">Assets − Liabilities</span>
          </div>
          <TrendingUp className="absolute -right-4 -bottom-4 h-28 w-28 text-white/10" />
        </div>

        {/* Monthly Surplus */}
        <div className={`rounded-2xl shadow-sm border p-5 flex items-center justify-between ${cashFlow.netSurplus >= 0 ? 'bg-card border-border' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'}`}>
          <div>
            <p className="text-muted-foreground text-xs font-semibold mb-0.5 uppercase tracking-wider">Monthly Surplus</p>
            <h3 className={`text-xl font-bold font-mono ${cashFlow.netSurplus >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {fmt(cashFlow.netSurplus)}
            </h3>
            <span className="text-[10px] text-muted-foreground mt-1 block">Net after all outflows</span>
          </div>
          <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${cashFlow.netSurplus >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
            {cashFlow.netSurplus >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          </div>
        </div>

        {/* Invested Assets */}
        <div className="bg-card rounded-2xl shadow-sm border border-border p-5 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-semibold mb-0.5 uppercase tracking-wider">Invested Assets</p>
            <h3 className="text-xl font-bold text-foreground font-mono">{fmt(totalInvested)}</h3>
            <span className="text-[10px] text-muted-foreground mt-1 block">MF · FD · RD · Chit · Gold</span>
          </div>
          <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        {/* Liabilities */}
        <div className="bg-card rounded-2xl shadow-sm border border-border p-5 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-semibold mb-0.5 uppercase tracking-wider">Liabilities</p>
            <h3 className="text-xl font-bold text-red-500 font-mono">{fmt(totalLoans)}</h3>
            <span className="text-[10px] text-muted-foreground mt-1 block">Outstanding loans</span>
          </div>
          <div className="h-10 w-10 bg-red-50 rounded-full flex items-center justify-center text-red-500 shrink-0">
            <CreditCard className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ── 3-Column main layout ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ═══════════ COLUMN 1: Asset breakdown ════════════════════════════ */}
        <div className="space-y-6">

          {/* Pie chart */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border/30 pb-2 flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-primary" /> Portfolio Allocation
            </h3>
            <div className="h-52 w-full">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmt(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No assets recorded yet.</div>
              )}
            </div>
          </div>

          {/* NPA Warning */}
          {isHighLiquidCash && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <h4 className="font-bold text-xs">High Idle Cash Alert</h4>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                {fmt(bankBalance)} ({Math.round(bankBalance / netWorth * 100)}% of net worth) is sitting as cash — underperforming inflation.
              </p>
              <Link to="/dashboard/investments" className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:text-amber-500">
                Deploy into investments <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {/* Per-class Investments Breakdown */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border/30 pb-2 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-primary" /> Investments by Class
            </h3>

            {[
              { label: 'Mutual Funds (SIP)', value: investmentBreakdown.mf, link: '/dashboard/investments', color: 'text-indigo-600', dot: 'bg-indigo-500' },
              { label: 'Fixed Deposits (FD)', value: investmentBreakdown.fds, link: '/dashboard/deposits', color: 'text-emerald-600', dot: 'bg-emerald-500' },
              { label: 'Recurring Deposits (RD)', value: investmentBreakdown.rds, link: '/dashboard/deposits', color: 'text-teal-600', dot: 'bg-teal-400' },
              { label: 'Chit Funds', value: investmentBreakdown.chits, link: '/dashboard/chit-funds', color: 'text-orange-600', dot: 'bg-orange-400' },
              { label: 'Digital Gold', value: investmentBreakdown.gold, link: '/dashboard/investments', color: 'text-amber-500', dot: 'bg-amber-400' },
              { label: 'Digital Silver', value: investmentBreakdown.silver, link: '/dashboard/investments', color: 'text-slate-500', dot: 'bg-slate-400' },
              { label: 'Stocks & Equity', value: investmentBreakdown.stocks, link: '/dashboard/investments', color: 'text-blue-600', dot: 'bg-blue-500' },
              { label: 'Other (Real Estate etc.)', value: investmentBreakdown.other, link: '/dashboard/investments', color: 'text-purple-600', dot: 'bg-purple-400' },
            ].filter(r => r.value > 0).map(row => (
              <Link key={row.label} to={row.link}
                className="flex items-center justify-between p-2.5 rounded-xl bg-background/20 border border-border/30 hover:border-primary/40 hover:bg-primary/5 transition-all group">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${row.dot}`} />
                  <span className="text-xs text-muted-foreground font-medium truncate">{row.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-bold font-mono ${row.color}`}>{fmt(row.value)}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>
              </Link>
            ))}

            {/* Liquid Cash row */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-background/20 border border-border/30">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full shrink-0 bg-cyan-400" />
                <span className="text-xs text-muted-foreground font-medium">Bank Cash (Liquid)</span>
              </div>
              <span className="text-xs font-bold font-mono text-cyan-600">{fmt(bankBalance)}</span>
            </div>

            <div className="flex justify-between items-center border-t border-border/30 pt-2 mt-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Portfolio</span>
              <span className="text-sm font-bold text-foreground font-mono">{fmt(netWorth + totalLoans)}</span>
            </div>
          </div>
        </div>

        {/* ═══════════ COLUMN 2: Cash Flow + Projections + Goals ════════════ */}
        <div className="space-y-6">

          {/* Monthly Cash Flow Card */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border/30 pb-2 flex items-center gap-1.5">
              <Landmark className="h-4 w-4 text-primary" /> Monthly Cash Flow
              <span className="ml-auto text-[9px] text-muted-foreground font-normal normal-case">3-month avg</span>
            </h3>

            <div className="space-y-0.5 font-mono text-xs">
              {/* Inflows */}
              <div className="flex justify-between items-center py-1.5 border-b border-border/20">
                <span className="text-muted-foreground">Salary (avg 3 mo)</span>
                <span className="text-emerald-600 font-bold">{fmt(cashFlow.avgSalary)}</span>
              </div>
              {cashFlow.sideIncome > 0 && (
                <div className="flex justify-between items-center py-1.5 border-b border-border/20">
                  <span className="text-muted-foreground">+ Side Income</span>
                  <span className="text-emerald-500 font-bold">{fmt(cashFlow.sideIncome)}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-1.5 border-b border-border/30 bg-emerald-500/5 px-2 rounded-lg -mx-2">
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">= Total Inflow</span>
                <span className="text-emerald-600 font-bold text-sm">{fmt(cashFlow.totalInflow)}</span>
              </div>

              {/* Outflows */}
              <div className="pt-1" />
              {cashFlow.avgLivingExpenses > 0 && (
                <div className="flex justify-between items-center py-1.5 border-b border-border/20">
                  <span className="text-muted-foreground">- Living Expenses</span>
                  <span className="text-red-500 font-bold">{fmt(cashFlow.avgLivingExpenses)}</span>
                </div>
              )}
              {cashFlow.totalEMI > 0 && (
                <div className="flex justify-between items-center py-1.5 border-b border-border/20">
                  <span className="text-muted-foreground">- Loan EMIs</span>
                  <span className="text-red-500 font-bold">{fmt(cashFlow.totalEMI)}</span>
                </div>
              )}
              {cashFlow.totalRD > 0 && (
                <div className="flex justify-between items-center py-1.5 border-b border-border/20">
                  <span className="text-muted-foreground">- RD Contributions</span>
                  <span className="text-orange-500 font-bold">{fmt(cashFlow.totalRD)}</span>
                </div>
              )}
              {cashFlow.totalChit > 0 && (
                <div className="flex justify-between items-center py-1.5 border-b border-border/20">
                  <span className="text-muted-foreground">- Chit Installments</span>
                  <span className="text-orange-500 font-bold">{fmt(cashFlow.totalChit)}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-1.5 border-b border-border/30 bg-red-500/5 px-2 rounded-lg -mx-2">
                <span className="text-red-600 dark:text-red-400 font-bold">= Total Outflow</span>
                <span className="text-red-500 font-bold text-sm">{fmt(cashFlow.totalOutflow)}</span>
              </div>

              {/* Net Surplus */}
              <div className={`flex justify-between items-center py-2 px-3 rounded-xl -mx-2 mt-1 border ${cashFlow.netSurplus >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                <span className={`font-bold text-sm ${cashFlow.netSurplus >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>
                  = Net Monthly Surplus
                </span>
                <span className={`font-bold text-base ${cashFlow.netSurplus >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {fmt(cashFlow.netSurplus)}
                </span>
              </div>
            </div>

            {cashFlow.avgSalary === 0 && cashFlow.totalInflow === 0 && (
              <p className="text-[11px] text-amber-600 bg-amber-500/10 rounded-lg p-2">
                ⚠ No salary data found in last 3 months. Log CREDIT transactions with category "Salary" to enable this engine.
              </p>
            )}
          </div>

          {/* Year-End Projection Panel */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border/30 pb-2 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" /> Forecast by 31-Dec-{new Date().getFullYear()}
              <span className="ml-auto text-[9px] font-normal normal-case text-muted-foreground">{projection.monthsRemaining} months left</span>
            </h3>

            <div className="grid grid-cols-1 gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Savings Added</p>
                  <p className="text-lg font-bold text-emerald-600 font-mono">{fmt(projection.projectedSavings)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-emerald-500/30" />
              </div>

              <div className="p-3 rounded-xl bg-background/40 border border-border/40 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Expenses</p>
                  <p className="text-lg font-bold text-foreground font-mono">{fmt(projection.projectedExpenses)}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-muted-foreground/20" />
              </div>

              <div className="p-3 rounded-xl bg-primary/8 border border-primary/20 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-primary/70 uppercase tracking-wider">Projected Net Worth</p>
                  <p className="text-xl font-bold text-primary font-mono">{fmt(projection.projectedNetWorth)}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    {projection.projectedNetWorth > netWorth
                      ? `▲ ${fmt(projection.projectedNetWorth - netWorth)} growth`
                      : `▼ ${fmt(netWorth - projection.projectedNetWorth)} decline`}
                  </p>
                </div>
                <Sparkles className="h-8 w-8 text-primary/20" />
              </div>
            </div>
          </div>

          {/* Goal Completion Timeline */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-border/30 pb-2">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Target className="h-4 w-4 text-primary" /> Goal Timelines
              </h3>
              <Link to="/dashboard/goals" className="text-xs text-primary hover:underline font-bold flex items-center gap-0.5">
                Manage <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {goalProjections.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">No goals configured yet.</div>
            ) : (
              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                {goalProjections.map(goal => {
                  const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                  const isHigh = goal.priority === 'HIGH';

                  return (
                    <div key={goal.id} className={`p-3 rounded-xl border space-y-2 ${
                      goal.isComplete ? 'border-emerald-500/30 bg-emerald-500/5'
                      : goal.isOnTrack ? 'border-border/40 bg-background/20'
                      : 'border-amber-500/30 bg-amber-500/5'
                    }`}>
                      {/* Goal header */}
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 pr-2">
                          <h4 className="font-bold text-xs text-foreground flex items-center gap-1">
                            {goal.isComplete && <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />}
                            {!goal.isComplete && !goal.isOnTrack && <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />}
                            {!goal.isComplete && goal.isOnTrack && <Clock className="h-3 w-3 text-primary shrink-0" />}
                            <span className="truncate">{goal.name}</span>
                          </h4>
                          <span className={`inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded mt-0.5 ${
                            isHigh ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                          }`}>{goal.priority}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold font-mono text-foreground">{fmt(goal.currentAmount)}</span>
                          <span className="text-[10px] text-muted-foreground font-mono block">/ {fmt(goal.targetAmount)}</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div>
                        <div className="w-full h-1.5 bg-muted/60 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${goal.isComplete ? 'bg-emerald-500' : goal.isOnTrack ? 'bg-primary' : 'bg-amber-500'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                          <span>{percent}% complete</span>
                          <span>Target: {new Date(goal.targetDate).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}</span>
                        </div>
                      </div>

                      {/* Projection details */}
                      {!goal.isComplete && (
                        <div className="border-t border-border/20 pt-2 space-y-1">
                          {goal.allocation > 0 && (
                            <div className="flex justify-between text-[10px]">
                              <span className="text-muted-foreground">Monthly allocation</span>
                              <span className="font-bold font-mono text-primary">{fmt(goal.allocation)}/mo</span>
                            </div>
                          )}
                          {goal.projectedDate ? (
                            <div className="flex justify-between text-[10px]">
                              <span className="text-muted-foreground">Predicted finish</span>
                              <span className={`font-bold font-mono ${goal.isOnTrack ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {goal.projectedDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                          ) : (
                            <p className="text-[10px] text-red-500 font-medium">Not achievable at current surplus</p>
                          )}
                          {!goal.isOnTrack && goal.behindAmount > 0 && (
                            <div className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-lg px-2 py-1 mt-1">
                              ⚠ Behind by {fmt(goal.behindAmount)} — need {fmt(goal.neededPerMonth)}/mo to hit target date
                            </div>
                          )}
                        </div>
                      )}
                      {goal.isComplete && (
                        <p className="text-[10px] text-emerald-600 font-bold">✓ Goal achieved!</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ═══════════ COLUMN 3: Command Center + Activity + Income ══════════ */}
        <div className="space-y-6">

          {/* Quick Actions */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border/30 pb-2">Cockpit Controls</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/dashboard/quick-logger" className="flex flex-col items-center justify-center p-3 rounded-xl border border-border/60 hover:border-primary bg-primary/5 hover:bg-primary/10 text-center transition-all group">
                <Zap className="h-5 w-5 text-primary group-hover:scale-110 transition-transform mb-1.5" />
                <span className="text-xs font-bold text-foreground">Quick Log</span>
              </Link>
              <Link to="/dashboard/expenses" className="flex flex-col items-center justify-center p-3 rounded-xl border border-border/60 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 text-center transition-all group">
                <Plus className="h-5 w-5 text-emerald-600 group-hover:scale-110 transition-transform mb-1.5" />
                <span className="text-xs font-bold text-foreground">Add Outflow</span>
              </Link>
              <Link to="/dashboard/goals" className="flex flex-col items-center justify-center p-3 rounded-xl border border-border/60 hover:border-indigo-500 bg-indigo-500/5 hover:bg-indigo-500/10 text-center transition-all group">
                <Target className="h-5 w-5 text-indigo-500 group-hover:scale-110 transition-transform mb-1.5" />
                <span className="text-xs font-bold text-foreground">Goals</span>
              </Link>
              <Link to="/dashboard/investments" className="flex flex-col items-center justify-center p-3 rounded-xl border border-border/60 hover:border-amber-500 bg-amber-500/5 hover:bg-amber-500/10 text-center transition-all group">
                <Coins className="h-5 w-5 text-amber-500 group-hover:scale-110 transition-transform mb-1.5" />
                <span className="text-xs font-bold text-foreground">Invest</span>
              </Link>
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border/30 pb-2 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-purple-500" /> AI Wealth Insights
            </h3>
            {insights.length === 0 ? (
              <div className="p-3 bg-purple-500/5 rounded-xl border border-purple-500/10">
                <p className="text-xs text-muted-foreground leading-relaxed italic">
                  "Maintain 3–6 months expenses as liquid emergency fund, then automate monthly SIP transfers to equity mutual funds."
                </p>
                <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 block mt-1 uppercase">— Antigravity Wealth Assistant</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
                {insights.map((ins, i) => (
                  <div key={i} className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl space-y-1">
                    <h4 className="font-bold text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> {ins.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{ins.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-border/30 pb-2">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-emerald-600" /> Recent Transactions
              </h3>
              <Link to="/dashboard/expenses" className="text-xs text-primary hover:underline font-bold flex items-center gap-0.5">
                All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {recentExpenses.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">No recent transactions.</div>
            ) : (
              <div className="space-y-1.5">
                {recentExpenses.map(exp => (
                  <div key={exp.id} className="flex justify-between items-center p-2.5 rounded-xl border border-border/40 bg-background/20 text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-foreground truncate">{exp.description || 'Unnamed'}</p>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{exp.category} · {exp.expenseDate}</span>
                    </div>
                    <span className={`font-bold font-mono shrink-0 tabular-nums ${exp.type === 'DEBIT' ? 'text-red-500' : 'text-emerald-500'}`}>
                      {exp.type === 'DEBIT' ? '-' : '+'}{fmt(exp.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Side Income Sources */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-border/30 pb-2">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-teal-600" /> Side Income
              </h3>
              <Link to="/dashboard/income" className="text-xs text-primary hover:underline font-bold flex items-center gap-0.5">
                Details <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {incomeSources.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">No side income sources.</div>
            ) : (
              <div className="space-y-1.5">
                {incomeSources.map(inc => (
                  <div key={inc.id} className="flex justify-between items-center p-2.5 rounded-xl border border-border/40 bg-background/20 text-xs">
                    <div>
                      <p className="font-semibold text-foreground">{inc.sourceName}</p>
                      <span className="text-[9px] text-muted-foreground">{inc.ownerName || 'Self'} · {inc.frequency || 'One-time'}</span>
                    </div>
                    <span className="font-bold text-emerald-600 font-mono tabular-nums">{fmt(inc.amount || 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
