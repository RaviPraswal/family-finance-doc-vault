import { useEffect, useState, Fragment } from 'react';
import { apiClient } from '../api/client';
import { useToastStore } from '../store/toastStore';
import { useConfirmStore } from '../store/confirmStore';
import { Plus, Landmark, Trash2 } from 'lucide-react';

interface BankAccount {
  id: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  accountType: string;
  currentBalance: number;
  openingBalance: number;
}

export default function BankAccounts() {
  const toast = useToastStore();
  const confirm = useConfirmStore();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<BankAccount>>({
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    accountType: 'Savings',
    currentBalance: 0,
    openingBalance: 0
  });

  useEffect(() => {
    fetchAccounts();
    fetchExpenses();
  }, []);

  const fetchAccounts = async () => {
    try {
      const data = await apiClient('/api/bankaccounts');
      setAccounts(data);
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
      await apiClient('/api/bankaccounts', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setIsModalOpen(false);
      setFormData({ bankName: '', accountHolderName: '', accountNumber: '', accountType: 'Savings', currentBalance: 0, openingBalance: 0 });
      toast.success('Bank account saved', 'Your bank account has been added successfully.');
      fetchAccounts();
    } catch (err: any) {
      toast.error('Failed to save', err.message || 'Could not save bank account. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    confirm.show({
      title: 'Delete Bank Account',
      message: 'Are you sure you want to delete this bank account? This action cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          await apiClient(`/api/bankaccounts/${id}`, { method: 'DELETE' });
          toast.success('Bank account deleted', 'The account has been removed.');
          fetchAccounts();
        } catch (err: any) {
          toast.error('Cannot delete account', err.message || 'Failed to delete bank account.');
        }
      },
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Bank Accounts</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add Account
        </button>
      </div>

      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-background">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Bank Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Account Holder</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Account No. / Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Opening Balance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Balance</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-200">
            {accounts.map((acc) => (
              <Fragment key={acc.id}>
                <tr 
                  onClick={() => setExpandedAccountId(expandedAccountId === acc.id ? null : acc.id)}
                  className="hover:bg-background/80 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Landmark className="h-5 w-5 text-muted-foreground mr-3" />
                      <div className="text-sm font-medium text-foreground">{acc.bankName}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-foreground">{acc.accountHolderName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-foreground">XXXX-{acc.accountNumber ? acc.accountNumber.slice(-4) : 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">{acc.accountType || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground">
                    ₹{(acc.openingBalance ?? 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground">
                    ₹{(acc.currentBalance ?? 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(acc.id); }} 
                      className="text-red-600 hover:text-red-900 ml-4"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
                {expandedAccountId === acc.id && (
                  <tr>
                    <td colSpan={6} className="bg-background/40 px-6 py-4 border-b border-border">
                      <div className="max-w-3xl mx-auto">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Statement / Recent Transactions</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {expenses.filter(e => e.linkedAccount?.id === acc.id).length === 0 ? (
                            <p className="text-xs text-muted-foreground py-2 text-center">No transactions logged against this bank account.</p>
                          ) : (
                            expenses.filter(e => e.linkedAccount?.id === acc.id).map((exp) => {
                              const isCredit = exp.type === 'CREDIT';
                              return (
                                <div key={exp.id} className="flex justify-between text-xs items-center py-1.5 border-b border-border/50 last:border-0">
                                  <div>
                                    <span className="font-semibold text-foreground mr-2">{exp.category}</span>
                                    <span className="text-[10px] text-muted-foreground">{exp.expenseDate}</span>
                                    <p className="text-[10px] text-muted-foreground italic mt-0.5">{exp.description || 'No description'}</p>
                                  </div>
                                  <span className={`font-bold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                                    {isCredit ? '+' : '-'}₹{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                  No bank accounts found. Add one to start tracking your liquid cash.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Add Bank Account</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Bank Name</label>
                <input required value={formData.bankName} onChange={e => setFormData({ ...formData, bankName: e.target.value })} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="HDFC, SBI, etc." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Account Holder Name</label>
                <input required value={formData.accountHolderName} onChange={e => setFormData({ ...formData, accountHolderName: e.target.value })} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Account Number</label>
                <input required value={formData.accountNumber} onChange={e => setFormData({ ...formData, accountNumber: e.target.value })} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Account Type</label>
                <select value={formData.accountType} onChange={e => setFormData({ ...formData, accountType: e.target.value })} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all">
                  <option value="Savings">Savings</option>
                  <option value="Current">Current</option>
                  <option value="Salary">Salary</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Opening Balance (₹)</label>
                <input required type="number" value={formData.openingBalance} onChange={e => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) })} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Current Balance (₹)</label>
                <input required type="number" value={formData.currentBalance} onChange={e => setFormData({ ...formData, currentBalance: parseFloat(e.target.value) })} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90">Save Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
