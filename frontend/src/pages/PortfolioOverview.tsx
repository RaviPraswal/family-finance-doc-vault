import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { apiClient } from '../api/client';
import { 
  Landmark, TrendingUp, CreditCard, Target, Coins, 
  Zap, AlertTriangle, Sparkles, Plus, ArrowRight 
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
    deposits: 0
  });

  const [goals, setGoals] = useState<Goal[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [insights, setInsights] = useState<Recommendation[]>([]);

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      const [banks, invs, loans, deps, goalsData, expensesData, incomesData, insightsData] = await Promise.all([
        apiClient('/api/bankaccounts'),
        apiClient('/api/investments'),
        apiClient('/api/loans'),
        apiClient('/api/deposits'),
        apiClient('/api/goals').catch(() => []),
        apiClient('/api/expenses').catch(() => []),
        apiClient('/api/incomesources').catch(() => []),
        apiClient('/api/ai/recommendations').catch(() => [])
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

      setData({
        bankBalance,
        investments,
        loans: loanTotal,
        deposits: depositTotal
      });

      setGoals(goalsData || []);
      // Sort expenses by date descending and take top 5
      const sortedExpenses = (expensesData || []).sort((a: any, b: any) => 
        new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()
      ).slice(0, 5);
      setExpenses(sortedExpenses);

      setIncomeSources(incomesData || []);
      setInsights(insightsData || []);
    } catch (err) {
      console.error('Failed to fetch portfolio overview cockpit data', err);
    } finally {
      setLoading(false);
    }
  };

  const netWorth = data.bankBalance + data.investments + data.deposits - data.loans;

  const assetAllocationData = [
    { name: 'Bank Accounts', value: data.bankBalance },
    { name: 'Investments', value: data.investments },
    { name: 'Deposits (FD/RD)', value: data.deposits },
  ].filter(d => d.value > 0);

  const liabilitiesData = [
    { name: 'Assets', value: data.bankBalance + data.investments + data.deposits },
    { name: 'Liabilities (Loans)', value: data.loans }
  ];

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

        {/* Assets (Investments + Deposits) */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-5 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-semibold mb-0.5 uppercase tracking-wider">Invested Assets</p>
            <h3 className="text-xl font-bold text-foreground">₹{(data.investments + data.deposits).toLocaleString()}</h3>
            <span className="text-[10px] text-muted-foreground mt-2 block">Investments & Deposits</span>
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
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
