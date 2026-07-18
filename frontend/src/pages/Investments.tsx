import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { Plus, Briefcase, Trash2 } from 'lucide-react';

interface Investment {
  id: string;
  type: string;
  name: string;
  investedAmount: number;
  currentValue: number;
}

export default function Investments() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Investment>>({
    type: 'Mutual Fund',
    name: '',
    investedAmount: 0,
    currentValue: 0
  });

  useEffect(() => {
    fetchInvestments();
    fetchExpenses();
  }, []);

  const fetchInvestments = async () => {
    try {
      const data = await apiClient('/api/investments');
      setInvestments(data);
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
      await apiClient('/api/investments', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setIsModalOpen(false);
      setFormData({ type: 'Mutual Fund', name: '', investedAmount: 0, currentValue: 0 });
      fetchInvestments();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this investment?")) return;
    try {
      await apiClient(`/api/investments/${id}`, { method: 'DELETE' });
      fetchInvestments();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Investments</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add Investment
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {investments.map((inv) => {
          const returns = inv.currentValue - inv.investedAmount;
          const returnPercent = (returns / inv.investedAmount) * 100;
          return (
            <div key={inv.id} className="bg-card p-6 rounded-lg shadow-sm border border-border">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{inv.name}</h3>
                    <p className="text-xs text-muted-foreground">{inv.type}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(inv.id)} className="text-muted-foreground hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invested:</span>
                  <span className="font-medium">₹{inv.investedAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Value:</span>
                  <span className="font-semibold text-foreground">₹{inv.currentValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="text-muted-foreground">Returns:</span>
                  <span className={`font-semibold ${returns >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {returns >= 0 ? '+' : ''}₹{returns.toLocaleString()} ({returnPercent.toFixed(2)}%)
                  </span>
                </div>
              </div>

              {expenses.filter(e => e.linkedInvestment?.id === inv.id).length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Transaction History</h4>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {expenses.filter(e => e.linkedInvestment?.id === inv.id).map((exp) => {
                      const isContribution = exp.type === 'DEBIT'; // Investing bank money
                      return (
                        <div key={exp.id} className="flex justify-between text-xs items-center py-1 border-b border-border last:border-0">
                          <div>
                            <span className="font-medium text-foreground">{exp.category}</span>
                            <span className="text-[10px] text-muted-foreground block">{exp.expenseDate}</span>
                          </div>
                          <span className={`font-semibold ${isContribution ? 'text-green-500' : 'text-red-500'}`}>
                            {isContribution ? '+' : '-'}₹{(exp.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {investments.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card border border-border rounded-lg">
            No investments found. Add your mutual funds, stocks, or real estate to track your wealth.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Add Investment</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Asset Class</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all">
                  <option value="Mutual Fund">Mutual Fund</option>
                  <option value="Stocks">Stocks</option>
                  <option value="Gold">Gold</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="PPF">PPF</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Asset Name (e.g., HDFC Midcap)</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Invested Amount (₹)</label>
                <input required type="number" value={formData.investedAmount} onChange={e => setFormData({...formData, investedAmount: parseFloat(e.target.value)})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Current Value (₹)</label>
                <input required type="number" value={formData.currentValue} onChange={e => setFormData({...formData, currentValue: parseFloat(e.target.value)})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90">Save Investment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
