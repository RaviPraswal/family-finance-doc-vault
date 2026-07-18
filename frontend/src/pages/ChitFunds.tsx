import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { Plus, Users, Trash2, CheckCircle2 } from 'lucide-react';

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
  linkedAccount: { id: string; name: string } | null;
}

interface BankAccount {
  id: string;
  name: string;
  bankName: string;
}

export default function ChitFunds() {
  const [chitFunds, setChitFunds] = useState<ChitFund[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<ChitFund & { linkedAccountId: string }>>({
    organizerName: '',
    memberName: '',
    totalValue: 0,
    monthlyInstallment: 0,
    durationMonths: 12,
    pendingInstallments: 12,
    startDate: '',
    isAllotted: false,
    allottedAmount: null,
    linkedAccountId: '',
  });

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
      const payload: any = { ...formData };
      if (formData.linkedAccountId) {
        payload.linkedAccount = { id: formData.linkedAccountId };
      }
      delete payload.linkedAccountId;
      await apiClient('/api/chitfunds', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setIsModalOpen(false);
      setFormData({ organizerName: '', memberName: '', totalValue: 0, monthlyInstallment: 0, durationMonths: 12, pendingInstallments: 12, startDate: '', isAllotted: false, allottedAmount: null, linkedAccountId: '' });
      fetchChitFunds();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this chit fund?')) return;
    try {
      await apiClient(`/api/chitfunds/${id}`, { method: 'DELETE' });
      fetchChitFunds();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Chit Funds</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add Chit Fund
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {chitFunds.map((cf) => {
          const paid = (cf.durationMonths ?? 0) - (cf.pendingInstallments ?? 0);
          const progress = cf.durationMonths ? Math.min(100, (paid / cf.durationMonths) * 100) : 0;

          return (
            <div key={cf.id} className="bg-card p-6 rounded-lg shadow-sm border border-border relative">
              {cf.isAllotted && (
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">
                  <CheckCircle2 className="h-3 w-3" /> Allotted
                </div>
              )}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{cf.organizerName}</h3>
                    <p className="text-xs text-muted-foreground">Member: {cf.memberName}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(cf.id)} className="text-muted-foreground hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Installments ({paid}/{cf.durationMonths})</span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-violet-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Value:</span>
                  <span className="font-bold text-violet-600">₹{cf.totalValue?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly:</span>
                  <span className="font-medium">₹{cf.monthlyInstallment?.toLocaleString()}</span>
                </div>
                {cf.isAllotted && cf.allottedAmount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Allotted Amt:</span>
                    <span className="font-bold text-green-600">₹{cf.allottedAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="text-muted-foreground">Pending:</span>
                  <span className="font-semibold">{cf.pendingInstallments} months</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start Date:</span>
                  <span className="font-semibold">{cf.startDate ? new Date(cf.startDate).toLocaleDateString() : '-'}</span>
                </div>
                {cf.linkedAccount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bank:</span>
                    <span className="font-semibold text-xs">{cf.linkedAccount.name}</span>
                  </div>
                )}
              </div>

              {expenses.filter(e => e.linkedChitFund?.id === cf.id).length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment History</h4>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {expenses.filter(e => e.linkedChitFund?.id === cf.id).map((exp) => {
                      const isContribution = exp.type === 'DEBIT'; // Paying installment
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
          );
        })}
        {chitFunds.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card border border-border rounded-lg">
            No chit funds found. Add your chit fund entries here.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Add Chit Fund</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Organizer Name</label>
                  <input required value={formData.organizerName} onChange={e => setFormData({ ...formData, organizerName: e.target.value })} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="Organizer" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Member Name</label>
                  <input required value={formData.memberName} onChange={e => setFormData({ ...formData, memberName: e.target.value })} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="Your name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Total Value (₹)</label>
                  <input required type="number" value={formData.totalValue} onChange={e => setFormData({ ...formData, totalValue: parseFloat(e.target.value) })} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Monthly Installment (₹)</label>
                  <input required type="number" value={formData.monthlyInstallment} onChange={e => setFormData({ ...formData, monthlyInstallment: parseFloat(e.target.value) })} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Duration (Months)</label>
                  <input required type="number" value={formData.durationMonths} onChange={e => setFormData({ ...formData, durationMonths: parseInt(e.target.value) })} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Pending Installments</label>
                  <input required type="number" value={formData.pendingInstallments} onChange={e => setFormData({ ...formData, pendingInstallments: parseInt(e.target.value) })} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input required type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isAllotted" checked={formData.isAllotted} onChange={e => setFormData({ ...formData, isAllotted: e.target.checked })} className="h-4 w-4 rounded border-input text-primary" />
                  <label htmlFor="isAllotted" className="text-sm font-medium">Already Allotted?</label>
                </div>
                {formData.isAllotted && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Allotted Amount (₹)</label>
                    <input type="number" value={formData.allottedAmount ?? ''} onChange={e => setFormData({ ...formData, allottedAmount: parseFloat(e.target.value) })} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Linked Bank Account (Optional)</label>
                <select value={formData.linkedAccountId} onChange={e => setFormData({ ...formData, linkedAccountId: e.target.value })} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all">
                  <option value="">-- None --</option>
                  {bankAccounts.map(ba => (
                    <option key={ba.id} value={ba.id}>{ba.name} ({ba.bankName})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90">Save Chit Fund</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
