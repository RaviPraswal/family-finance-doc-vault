import { useEffect, useState } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { apiClient } from '../api/client';
import { Landmark, TrendingUp, CreditCard, Wallet } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function PortfolioOverview() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    bankBalance: 0,
    investments: 0,
    loans: 0,
    deposits: 0
  });

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      const [banks, invs, loans, deps] = await Promise.all([
        apiClient('/api/bankaccounts'),
        apiClient('/api/investments'),
        apiClient('/api/loans'),
        apiClient('/api/deposits')
      ]);

      const bankBalance = banks.reduce((sum: number, b: any) => sum + (b.currentBalance || 0), 0);
      const investments = invs.reduce((sum: number, i: any) => sum + (i.currentValue || i.investedAmount || 0), 0);
      const loanTotal = loans.reduce((sum: number, l: any) => sum + (l.outstandingAmount || 0), 0);
      const depositTotal = deps.reduce((sum: number, d: any) => sum + (d.principalAmount || 0), 0);

      setData({
        bankBalance,
        investments,
        loans: loanTotal,
        deposits: depositTotal
      });
    } catch (err) {
      console.error('Failed to fetch portfolio data', err);
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

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading portfolio analytics...</div>;

  return (
    <div className="h-full flex flex-col space-y-6 overflow-y-auto pb-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">Portfolio Overview</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Net Worth Card */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md p-6 text-white relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-indigo-100 text-sm font-medium mb-1">Total Net Worth</p>
            <h2 className="text-3xl font-bold">₹{netWorth.toLocaleString()}</h2>
          </div>
          <TrendingUp className="absolute -right-4 -bottom-4 h-32 w-32 text-white/10" />
        </div>

        {/* Bank Balance Card */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium mb-1">Liquid Cash</p>
            <h3 className="text-2xl font-bold text-foreground">₹{data.bankBalance.toLocaleString()}</h3>
          </div>
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-blue-600">
            <Landmark className="h-6 w-6" />
          </div>
        </div>

        {/* Investments Card */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium mb-1">Investments & Deposits</p>
            <h3 className="text-2xl font-bold text-foreground">₹{(data.investments + data.deposits).toLocaleString()}</h3>
          </div>
          <div className="h-12 w-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        {/* Liabilities Card */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium mb-1">Liabilities</p>
            <h3 className="text-2xl font-bold text-red-600">₹{data.loans.toLocaleString()}</h3>
          </div>
          <div className="h-12 w-12 bg-red-50 rounded-full flex items-center justify-center text-red-600">
            <CreditCard className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Allocation Chart */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Asset Allocation</h3>
          <div className="h-72 w-full">
            {assetAllocationData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assetAllocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {assetAllocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">No assets recorded yet.</div>
            )}
          </div>
        </div>

        {/* Assets vs Liabilities Chart */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Assets vs Liabilities</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={liabilitiesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value / 1000}k`} />
                <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} cursor={{fill: '#F3F4F6'}} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {liabilitiesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : '#EF4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
