import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { Plus, Wallet, Trash2 } from 'lucide-react';

interface Deposit {
  id: string;
  type: string;
  institution: string;
  accountHolderName: string;
  principalAmount: number;
  maturityAmount: number;
  interestRate: number;
  startDate: string;
  maturityDate: string;
}

export default function Deposits() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Deposit>>({
    type: 'FD',
    institution: '',
    accountHolderName: '',
    principalAmount: 0,
    maturityAmount: 0,
    interestRate: 0,
    startDate: '',
    maturityDate: ''
  });

  useEffect(() => {
    fetchDeposits();
    fetchExpenses();
  }, []);

  const fetchDeposits = async () => {
    try {
      const data = await apiClient('/api/deposits');
      setDeposits(data);
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
      await apiClient('/api/deposits', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setIsModalOpen(false);
      setFormData({ type: 'FD', institution: '', accountHolderName: '', principalAmount: 0, maturityAmount: 0, interestRate: 0, startDate: '', maturityDate: '' });
      fetchDeposits();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this deposit?")) return;
    try {
      await apiClient(`/api/deposits/${id}`, { method: 'DELETE' });
      fetchDeposits();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Fixed & Recurring Deposits</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add Deposit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {deposits.map((dep) => {
          const totalDuration = new Date(dep.maturityDate).getTime() - new Date(dep.startDate).getTime();
          const passedDuration = new Date().getTime() - new Date(dep.startDate).getTime();
          const progress = Math.min(100, Math.max(0, (passedDuration / totalDuration) * 100));

          return (
            <div key={dep.id} className="bg-card p-6 rounded-lg shadow-sm border border-border">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{dep.institution}</h3>
                    <p className="text-xs text-muted-foreground">{dep.type} - {dep.accountHolderName}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(dep.id)} className="text-muted-foreground hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progress</span>
                  <span>{progress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-teal-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Principal:</span>
                  <span className="font-medium">₹{dep.principalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maturity Amount:</span>
                  <span className="font-bold text-teal-600">₹{dep.maturityAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="text-muted-foreground">Interest Rate:</span>
                  <span className="font-semibold">{dep.interestRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maturity Date:</span>
                  <span className="font-semibold">{new Date(dep.maturityDate).toLocaleDateString()}</span>
                </div>
              </div>

              {expenses.filter(e => e.linkedDeposit?.id === dep.id).length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Transaction History</h4>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {expenses.filter(e => e.linkedDeposit?.id === dep.id).map((exp) => {
                      const isContribution = exp.type === 'DEBIT'; // Paying from bank into RD/FD
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
        {deposits.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card border border-border rounded-lg">
            No deposits found. Add your FDs and RDs here to track maturity.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Add Deposit</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all">
                    <option value="FD">Fixed Deposit (FD)</option>
                    <option value="RD">Recurring Deposit (RD)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Institution</label>
                  <input required value={formData.institution} onChange={e => setFormData({...formData, institution: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="Bank/Post Office" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Account Holder Name</label>
                <input required value={formData.accountHolderName} onChange={e => setFormData({...formData, accountHolderName: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Principal (₹)</label>
                  <input required type="number" value={formData.principalAmount} onChange={e => setFormData({...formData, principalAmount: parseFloat(e.target.value)})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Maturity Amt (₹)</label>
                  <input required type="number" value={formData.maturityAmount} onChange={e => setFormData({...formData, maturityAmount: parseFloat(e.target.value)})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Interest Rate (%)</label>
                <input required type="number" step="0.01" value={formData.interestRate} onChange={e => setFormData({...formData, interestRate: parseFloat(e.target.value)})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input required type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Maturity Date</label>
                  <input required type="date" value={formData.maturityDate} onChange={e => setFormData({...formData, maturityDate: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90">Save Deposit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
