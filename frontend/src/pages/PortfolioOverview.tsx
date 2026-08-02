import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { apiClient } from '../api/client';
import { 
  Landmark, TrendingUp, CreditCard, Target, Coins, 
  Zap, AlertTriangle, Sparkles, Plus, ArrowRight, Calendar 
} from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: string;
  priority: string;
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
}

interface Recommendation {
  title: string;
  description: string;
  type: string;
}

export default function PortfolioOverview() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    bankBalance: 0,
    investments: 0,
    loans: 0,
    deposits: 0,
    chitFunds: 0
  });

  const [goals, setGoals] = useState<Goal[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [insights, setInsights] = useState<Recommendation[]>([]);

  // Detailed Investment Breakdown States
  const [mutualFundsTotal, setMutualFundsTotal] = useState(0);
  const [stocksTotal, setStocksTotal] = useState(0);
  const [fdsTotal, setFdsTotal] = useState(0);
  const [rdsTotal, setRdsTotal] = useState(0);
  const [chitsTotal, setChitsTotal] = useState(0);
  const [goldSilverTotal, setGoldSilverTotal] = useState(0);
  const [otherInvestmentsTotal, setOtherInvestmentsTotal] = useState(0);

  // Cash Flow & Projection States
  const [monthlySalary, setMonthlySalary] = useState(0);
  const [monthlySideIncome, setMonthlySideIncome] = useState(0);
  const [monthlyExpensesRunRate, setMonthlyExpensesRunRate] = useState(0);
  const [monthlyLoanEMIs, setMonthlyLoanEMIs] = useState(0);
  const [monthlyChitOutflows, setMonthlyChitOutflows] = useState(0);

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      const withTimeout = (promise: Promise<any>, ms = 5000) =>
        Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

      const [banks, invs, loans, deps, goalsData, expensesData, incomesData, insightsData, chitsData] = await Promise.all([
        withTimeout(apiClient('/api/bankaccounts')).catch(() => []),
        withTimeout(apiClient('/api/investments')).catch(() => []),
        withTimeout(apiClient('/api/loans')).catch(() => []),
        withTimeout(apiClient('/api/deposits')).catch(() => []),
        withTimeout(apiClient('/api/goals')).catch(() => []),
        withTimeout(apiClient('/api/expenses')).catch(() => []),
        withTimeout(apiClient('/api/incomesources')).catch(() => []),
        withTimeout(apiClient('/api/ai/recommendations'), 3000).catch(() => []),
        withTimeout(apiClient('/api/chitfunds')).catch(() => [])
      ]);

      const bankBalance = banks.reduce((sum: number, b: any) => sum + (b.currentBalance || 0), 0);
      const investments = invs.reduce((sum: number, i: any) => sum + (i.currentValue || i.investedAmount || 0), 0);
      const loanTotal = loans.reduce((sum: number, l: any) => sum + (l.outstandingAmount || 0), 0);
      
      // Calculate deposits correctly: FD principal + RD totalDeposited (or principalAmount fallback)
      const depositTotal = deps.reduce((sum: number, d: any) => {
        if (d.type === 'RD') {
          return sum + (d.totalDeposited || d.principalAmount || 0);
        }
        return sum + (d.principalAmount || 0);
      }, 0);

      // Calculate Chit Funds paid value
      const chitTotalVal = (chitsData || []).reduce((sum: number, c: any) => {
        const paidInstallments = (c.durationMonths || 0) - (c.pendingInstallments || 0);
        return sum + (paidInstallments * (c.monthlyInstallment || 0));
      }, 0);

      setData({
        bankBalance,
        investments,
        loans: loanTotal,
        deposits: depositTotal,
        chitFunds: chitTotalVal
      });

      setGoals(goalsData || []);
      
      // Sort expenses by date descending and take top 5
      const sortedExpenses = (expensesData || []).sort((a: any, b: any) => 
        new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()
      ).slice(0, 5);
      setExpenses(sortedExpenses);

      setIncomeSources(incomesData || []);
      setInsights(insightsData || []);

      // Calculate Detailed Investments Breakdown
      const mfTotal = invs.reduce((sum: number, i: any) => {
        if (i.type === 'Mutual Fund' && !/gold|silver|etf|fof/i.test(i.name)) {
          return sum + (i.currentValue || i.investedAmount || 0);
        }
        return sum;
      }, 0);

      const stTotal = invs.reduce((sum: number, i: any) => {
        if (i.type === 'Stock / Equity') {
          return sum + (i.currentValue || i.investedAmount || 0);
        }
        return sum;
      }, 0);

      const fTotal = deps.reduce((sum: number, d: any) => {
        if (d.type === 'FD') {
          return sum + (d.principalAmount || 0);
        }
        return sum;
      }, 0);

      const rTotal = deps.reduce((sum: number, d: any) => {
        if (d.type === 'RD') {
          return sum + (d.totalDeposited || d.principalAmount || 0);
        }
        return sum;
      }, 0);

      const gsTotal = invs.reduce((sum: number, i: any) => {
        if (/gold|silver|etf|fof/i.test(i.name)) {
          return sum + (i.currentValue || i.investedAmount || 0);
        }
        return sum;
      }, 0);

      const otTotal = invs.reduce((sum: number, i: any) => {
        const isMF = i.type === 'Mutual Fund';
        const isStock = i.type === 'Stock / Equity';
        const isGoldSilver = /gold|silver|etf|fof/i.test(i.name);
        if (!isMF && !isStock && !isGoldSilver) {
          return sum + (i.currentValue || i.investedAmount || 0);
        }
        return sum;
      }, 0);

      setMutualFundsTotal(mfTotal);
      setStocksTotal(stTotal);
      setFdsTotal(fTotal);
      setRdsTotal(rTotal);
      setChitsTotal(chitTotalVal);
      setGoldSilverTotal(gsTotal);
      setOtherInvestmentsTotal(otTotal);

      // Calculate Cash Flows
      const salaryTx = (expensesData || []).find((e: any) => e.type === 'CREDIT' && e.category?.toLowerCase() === 'salary');
      const salaryVal = salaryTx ? salaryTx.amount : 89706;
      setMonthlySalary(salaryVal);

      const sideInc = (incomesData || []).reduce((sum: number, inc: any) => sum + (inc.amount || 0), 0);
      setMonthlySideIncome(sideInc);

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyDeb = (expensesData || []).reduce((sum: number, e: any) => {
        const expDate = new Date(e.expenseDate);
        if (e.type === 'DEBIT' && expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
          return sum + (e.amount || 0);
        }
        return sum;
      }, 0);
      setMonthlyExpensesRunRate(monthlyDeb > 5000 ? monthlyDeb : 25000);

      const emiVal = (loans || []).reduce((sum: number, l: any) => sum + (l.emiAmount || 0), 0);
      setMonthlyLoanEMIs(emiVal);

      const chitOut = (chitsData || []).reduce((sum: number, c: any) => {
        if (c.pendingInstallments > 0) {
          return sum + (c.monthlyInstallment || 0);
        }
        return sum;
      }, 0);
      setMonthlyChitOutflows(chitOut);

    } catch (err) {
      console.error('Failed to fetch portfolio overview cockpit data', err);
    } finally {
      setLoading(false);
    }
  };

  const netWorth = data.bankBalance + data.investments + data.deposits + data.chitFunds - data.loans;

  const assetAllocationData = [
    { name: 'Bank Accounts', value: data.bankBalance },
    { name: 'Investments', value: data.investments },
    { name: 'Deposits (FD/RD)', value: data.deposits },
    { name: 'Chit Funds', value: data.chitFunds }
  ].filter(d => d.value > 0);

  const liabilitiesData = [
    { name: 'Assets', value: data.bankBalance + data.investments + data.deposits + data.chitFunds },
    { name: 'Liabilities (Loans)', value: data.loans }
  ];

  // Projections Calculations
  const totalMonthlyInflow = monthlySalary + monthlySideIncome;
  const totalMonthlyOutflow = monthlyExpensesRunRate + monthlyLoanEMIs + monthlyChitOutflows;
  const netMonthlySavings = totalMonthlyInflow - totalMonthlyOutflow;

  const currentMonthNum = new Date().getMonth();
  const remainingMonths = 12 - (currentMonthNum + 1);
  const projectedSavings = netMonthlySavings > 0 ? netMonthlySavings * remainingMonths : 0;
  const projectedExpenses = totalMonthlyOutflow * remainingMonths;

  // Logic to identify high cash balance (NPA warning)
  // E.g., if liquid cash is > 30% of Net Worth or > ₹30,000, consider warning the user
  const isHighLiquidCash = data.bankBalance > 30000 && (netWorth > 0 ? (data.bankBalance / netWorth) > 0.25 : true);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading portfolio cockpit...</div>;

  return (
    <div className="h-full flex flex-col space-y-6 overflow-y-auto pb-8 pr-1 custom-scrollbar">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary fill-primary/10" /> Unified Financial Cockpit
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your command center for bank accounts, investments, savings goals, recent cashflows, and active side income.
        </p>
      </div>

      {/* Top Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Net Worth */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md p-5 text-white relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-indigo-100 text-xs font-semibold mb-0.5 uppercase tracking-wider">Total Net Worth</p>
            <h2 className="text-2xl font-bold">₹{netWorth.toLocaleString()}</h2>
            <span className="text-[10px] text-indigo-200 mt-2 block font-medium">Assets minus Liabilities</span>
          </div>
          <TrendingUp className="absolute -right-4 -bottom-4 h-28 w-28 text-white/10" />
        </div>

        {/* Liquid Cash */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-5 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-semibold mb-0.5 uppercase tracking-wider">Liquid Cash</p>
            <h3 className="text-xl font-bold text-foreground">₹{data.bankBalance.toLocaleString()}</h3>
            <span className="text-[10px] text-muted-foreground mt-2 block">Bank accounts balance</span>
          </div>
          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-blue-600 shrink-0">
            <Landmark className="h-5 w-5" />
          </div>
        </div>

        {/* Assets (Investments + Deposits + Chit Funds) */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-5 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-semibold mb-0.5 uppercase tracking-wider">Invested Assets</p>
            <h3 className="text-xl font-bold text-foreground">₹{(data.investments + data.deposits + data.chitFunds).toLocaleString()}</h3>
            <span className="text-[10px] text-muted-foreground mt-2 block">Investments, Deposits & Chits</span>
          </div>
          <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        {/* Liabilities */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-5 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-semibold mb-0.5 uppercase tracking-wider">Liabilities</p>
            <h3 className="text-xl font-bold text-red-600">₹{data.loans.toLocaleString()}</h3>
            <span className="text-[10px] text-muted-foreground mt-2 block">Outstanding loan amounts</span>
          </div>
          <div className="h-10 w-10 bg-red-50 rounded-full flex items-center justify-center text-red-600 shrink-0">
            <CreditCard className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Three-Column Cockpit Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* COLUMN 1: Analytics & Asset Warnings */}
        <div className="space-y-6">
          {/* Asset Allocation Chart */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border/30 pb-2">Asset Breakdown</h3>
            <div className="h-60 w-full">
              {assetAllocationData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                       data={assetAllocationData}
                       cx="50%"
                       cy="50%"
                       innerRadius={45}
                       outerRadius={70}
                       paddingAngle={4}
                       dataKey="value"
                    >
                      {assetAllocationData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `₹${Number(value).toLocaleString()}`} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No assets recorded yet.</div>
              )}
            </div>
          </div>

          {/* NPA Warnings / Liquid Cash Alerts */}
          {isHighLiquidCash && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                <h4 className="font-bold text-sm">Non-Performing Asset Alert</h4>
              </div>
              <p className="text-xs leading-relaxed opacity-90">
                You hold **₹{data.bankBalance.toLocaleString()}** in liquid bank accounts (cash). While liquid, this capital is underperforming relative to inflation.
              </p>
              <div className="pt-1">
                <Link 
                  to="/dashboard/investments" 
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
                >
                  Deploy into investments <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}

          {/* Balance comparison Chart */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border/30 pb-2">Assets vs Liabilities</h3>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={liabilitiesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '10px' }} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value / 1000}k`} style={{ fontSize: '10px' }} />
                  <Tooltip formatter={(value: any) => `₹${Number(value).toLocaleString()}`} cursor={{fill: '#F3F4F6'}} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {liabilitiesData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : '#EF4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Investments Breakdown */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border/30 pb-2">Asset Classes & Investments</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-background/20 border border-border/30">
                <span className="text-muted-foreground font-medium">Mutual Funds (MF)</span>
                <span className="font-bold text-foreground font-mono">₹{mutualFundsTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-background/20 border border-border/30">
                <span className="text-muted-foreground font-medium">Stocks & Equity</span>
                <span className="font-bold text-foreground font-mono">₹{stocksTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-background/20 border border-border/30">
                <span className="text-muted-foreground font-medium">Fixed Deposits (FD)</span>
                <span className="font-bold text-foreground font-mono">₹{fdsTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-background/20 border border-border/30">
                <span className="text-muted-foreground font-medium">Recurring Deposits (RD)</span>
                <span className="font-bold text-foreground font-mono">₹{rdsTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-background/20 border border-border/30">
                <span className="text-muted-foreground font-medium">Chit Funds</span>
                <span className="font-bold text-foreground font-mono">₹{chitsTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-background/20 border border-border/30">
                <span className="text-muted-foreground font-medium">Gold & Silver</span>
                <span className="font-bold text-amber-500 font-mono">₹{goldSilverTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              {otherInvestmentsTotal > 0 && (
                <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-background/20 border border-border/30">
                  <span className="text-muted-foreground font-medium">Other (Real Estate, etc.)</span>
                  <span className="font-bold text-foreground font-mono">₹{otherInvestmentsTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUMN 2: Savings Goals & AI wealth Insights */}
        <div className="space-y-6">
          {/* Goals Tracker Card */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-border/30 pb-2">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Target className="h-4 w-4 text-primary" /> Savings Goals
              </h3>
              <Link to="/dashboard/goals" className="text-xs text-primary hover:underline font-bold flex items-center gap-0.5">
                Manage <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {goals.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No financial goals configured. Set some in the goals page to track progress.
              </div>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {goals.map(goal => {
                  const percent = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
                  const isHighPriority = goal.priority === 'HIGH';
                  const targetRemaining = goal.targetAmount - goal.currentAmount;

                  let predictedCompletion = '';
                  if (targetRemaining <= 0) {
                    predictedCompletion = 'Already Achieved ✓';
                  } else if (netMonthlySavings <= 0) {
                    predictedCompletion = 'Savings surplus required to forecast';
                  } else {
                    const monthsNeeded = targetRemaining / netMonthlySavings;
                    const completionDate = new Date();
                    completionDate.setMonth(completionDate.getMonth() + Math.ceil(monthsNeeded));
                    predictedCompletion = completionDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
                  }

                  return (
                    <div key={goal.id} className="space-y-1.5 p-3 rounded-xl border border-border/40 bg-background/20">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-xs text-foreground">{goal.name}</h4>
                          <span className={`inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded mt-1 ${
                            isHighPriority ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                          }`}>
                            {goal.priority} Priority
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-foreground">₹{goal.currentAmount.toLocaleString()}</span>
                          <span className="text-[10px] text-muted-foreground block font-mono">of ₹{goal.targetAmount.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-primary h-full rounded-full transition-all duration-500" 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{percent}% Completed</span>
                          <span>Target: {new Date(goal.targetDate).toLocaleDateString()}</span>
                        </div>
                        {targetRemaining > 0 && (
                          <div className="flex justify-between text-[9px] text-primary/80 font-bold border-t border-border/20 pt-1.5 mt-1.5">
                            <span>Predicted Completion:</span>
                            <span className="font-mono">{predictedCompletion}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Monthly Cash Flow & Projections */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border/30 pb-2">
              <Calendar className="h-4 w-4 text-primary" /> Cash Flow & EOY Projections
            </h3>

            <div className="grid grid-cols-2 gap-4 bg-muted/25 p-3.5 rounded-xl">
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase font-bold">Monthly Inflow</span>
                <span className="text-sm font-bold text-emerald-600 font-mono">₹{totalMonthlyInflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-[9px] text-muted-foreground block font-medium mt-0.5">(Salary & Side Incomes)</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase font-bold">Monthly Outflow</span>
                <span className="text-sm font-bold text-red-500 font-mono">₹{totalMonthlyOutflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-[9px] text-muted-foreground block font-medium mt-0.5">(Exp + EMIs + Chits)</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-background/20 border border-border/30">
                <span className="text-muted-foreground font-medium">Monthly Net Savings</span>
                <span className={`font-bold font-mono ${netMonthlySavings >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  ₹{netMonthlySavings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="border-t border-border/30 my-2 pt-2">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Predictions by End of {new Date().getFullYear()}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-primary/5 border border-primary/20">
                    <span className="text-foreground font-medium">Forecasted EOY Savings</span>
                    <span className="font-bold text-primary font-mono">₹{projectedSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-background/20 border border-border/30">
                    <span className="text-muted-foreground font-medium">Forecasted EOY Expenses</span>
                    <span className="font-bold text-foreground font-mono">₹{projectedExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI wealth insights Panel */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border/30 pb-2">
              <Sparkles className="h-4 w-4 text-purple-500" /> AI Wealth Insights
            </h3>
            
            {insights.length === 0 ? (
              <div className="p-4 bg-purple-500/5 rounded-xl border border-purple-500/10 space-y-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  "Maintain 3-6 months of expenses in a liquid emergency savings account, then automate recurring monthly transfers to higher-performing equity mutual funds or government schemes."
                </p>
                <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 block uppercase">— Antigravity Wealth Assistant</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {insights.map((ins, idx) => (
                  <div key={idx} className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl space-y-1">
                    <h4 className="font-bold text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> {ins.title}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{ins.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: Command Center, Recent Activity & Side Incomes */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border/30 pb-2">Cockpit Controls</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link 
                to="/dashboard/quick-logger" 
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-border/60 hover:border-primary bg-primary/5 hover:bg-primary/10 text-center transition-all group"
              >
                <Zap className="h-5 w-5 text-primary group-hover:scale-110 transition-transform mb-1.5" />
                <span className="text-xs font-bold text-foreground">Quick Log</span>
              </Link>
              <Link 
                to="/dashboard/expenses" 
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-border/60 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 text-center transition-all group"
              >
                <Plus className="h-5 w-5 text-emerald-600 group-hover:scale-110 transition-transform mb-1.5" />
                <span className="text-xs font-bold text-foreground">Add Outflow</span>
              </Link>
            </div>
          </div>

          {/* Recent Activity (Expenses) Card */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-border/30 pb-2">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-emerald-600" /> Recent Transactions
              </h3>
              <Link to="/dashboard/expenses" className="text-xs text-primary hover:underline font-bold flex items-center gap-0.5">
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {expenses.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No recent transactions found.
              </div>
            ) : (
              <div className="space-y-2">
                {expenses.map(exp => {
                  const isDebit = exp.type === 'DEBIT';
                  return (
                    <div key={exp.id} className="flex justify-between items-center p-2.5 rounded-xl border border-border/40 bg-background/20 text-xs">
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-foreground truncate">{exp.description || 'Unnamed'}</p>
                        <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block mt-0.5">
                          {exp.category} • {exp.expenseDate}
                        </span>
                      </div>
                      <span className={`font-bold font-mono shrink-0 tabular-nums ${isDebit ? 'text-red-500' : 'text-green-500'}`}>
                        {isDebit ? '-' : '+'}₹{exp.amount.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Side Income channels */}
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
              <div className="text-center py-6 text-xs text-muted-foreground">
                No side income sources configured.
              </div>
            ) : (
              <div className="space-y-2">
                {incomeSources.map(inc => (
                  <div key={inc.id} className="flex justify-between items-center p-2.5 rounded-xl border border-border/40 bg-background/20 text-xs">
                    <div>
                      <p className="font-semibold text-foreground">{inc.sourceName}</p>
                      <span className="text-[9px] text-muted-foreground mt-0.5 block">{inc.ownerName || 'Self'}</span>
                    </div>
                    <span className="font-bold text-foreground font-mono tabular-nums">
                      ₹{(inc.amount || 0).toLocaleString()}
                    </span>
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
