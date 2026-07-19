import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useToastStore } from '../store/toastStore';
import { useConfirmStore } from '../store/confirmStore';
import { Plus, CreditCard, Trash2 } from 'lucide-react';

interface Loan {
  id: string;
  lenderName: string;
  loanType: string;
  borrowerName: string;
  principalAmount: number;
  outstandingAmount: number;
  emiAmount: number;
  interestRate: number;
}

export default function Loans() {
  const toast = useToastStore();
  const confirm = useConfirmStore();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Loan>>({
    lenderName: '',
    loanType: 'Home Loan',
    borrowerName: '',
    principalAmount: 0,
    outstandingAmount: 0,
    emiAmount: 0,
    interestRate: 0
  });

  useEffect(() => {
    fetchLoans();
    fetchExpenses();
  }, []);

  const fetchLoans = async () => {
    try {
      const data = await apiClient('/api/loans');
      setLoans(data);
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
      await apiClient('/api/loans', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setIsModalOpen(false);
      setFormData({ lenderName: '', loanType: 'Home Loan', borrowerName: '', principalAmount: 0, outstandingAmount: 0, emiAmount: 0, interestRate: 0 });
      toast.success('Loan saved', 'Loan record has been added successfully.');
      fetchLoans();
    } catch (err: any) {
      toast.error('Failed to save loan', err.message || 'Could not save loan. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    confirm.show({
      title: 'Delete Loan',
      message: 'Are you sure you want to delete this loan record? This action cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          await apiClient(`/api/loans/${id}`, { method: 'DELETE' });
          toast.success('Loan deleted', 'The loan record has been removed.');
          fetchLoans();
        } catch (err: any) {
          toast.error('Cannot delete loan', err.message || 'Failed to delete loan.');
        }
      },
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Loans & EMI</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add Loan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loans.map((loan) => {
          const progress = ((loan.principalAmount - loan.outstandingAmount) / loan.principalAmount) * 100;
          return (
            <div key={loan.id} className="bg-card p-6 rounded-lg shadow-sm border border-border">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{loan.lenderName}</h3>
                    <p className="text-xs text-muted-foreground">{loan.loanType}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(loan.id)} className="text-muted-foreground hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Paid Off</span>
                  <span>{progress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}></div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Principal:</span>
                  <span className="font-medium">₹{loan.principalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Outstanding:</span>
                  <span className="font-bold text-red-600">₹{loan.outstandingAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="text-muted-foreground">Monthly EMI:</span>
                  <span className="font-semibold">₹{loan.emiAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Interest Rate:</span>
                  <span className="font-semibold">{loan.interestRate}%</span>
                </div>
              </div>

              {expenses.filter(e => e.linkedLoan?.id === loan.id).length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment History</h4>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {expenses.filter(e => e.linkedLoan?.id === loan.id).map((exp) => {
                      const isRepayment = exp.type === 'DEBIT'; // DEBIT from bank is a repayment
                      return (
                        <div key={exp.id} className="flex justify-between text-xs items-center py-1 border-b border-border last:border-0">
                          <div>
                            <span className="font-medium text-foreground">{exp.category}</span>
                            <span className="text-[10px] text-muted-foreground block">{exp.expenseDate}</span>
                          </div>
                          <span className={`font-semibold ${isRepayment ? 'text-green-500' : 'text-red-500'}`}>
                            {isRepayment ? '+' : '-'}₹{(exp.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
        {loans.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card border border-border rounded-lg">
            No active loans found. Add your Home, Auto, or Personal loans here.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Add Loan</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Lender (Bank Name)</label>
                <input required value={formData.lenderName} onChange={e => setFormData({...formData, lenderName: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Loan Type</label>
                <select value={formData.loanType} onChange={e => setFormData({...formData, loanType: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all">
                  <option value="Home Loan">Home Loan</option>
                  <option value="Auto Loan">Auto Loan</option>
                  <option value="Personal Loan">Personal Loan</option>
                  <option value="Education Loan">Education Loan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Borrower Name</label>
                <input required value={formData.borrowerName} onChange={e => setFormData({...formData, borrowerName: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Total Principal Amount (₹)</label>
                <input required type="number" value={formData.principalAmount} onChange={e => setFormData({...formData, principalAmount: parseFloat(e.target.value)})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Current Outstanding (₹)</label>
                <input required type="number" value={formData.outstandingAmount} onChange={e => setFormData({...formData, outstandingAmount: parseFloat(e.target.value)})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">EMI Amount (₹)</label>
                  <input required type="number" value={formData.emiAmount} onChange={e => setFormData({...formData, emiAmount: parseFloat(e.target.value)})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Interest Rate (%)</label>
                  <input required type="number" step="0.01" value={formData.interestRate} onChange={e => setFormData({...formData, interestRate: parseFloat(e.target.value)})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90">Save Loan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
