import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { Plus, Landmark, Pencil, Trash2 } from 'lucide-react';

interface BankAccount {
  id: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  accountType: string;
  currentBalance: number;
}

export default function BankAccounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<BankAccount>>({
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    accountType: 'Savings',
    currentBalance: 0
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const data = await apiClient('/api/bankaccounts');
      setAccounts(data);
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
      setFormData({ bankName: '', accountHolderName: '', accountNumber: '', accountType: 'Savings', currentBalance: 0 });
      fetchAccounts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this bank account?")) return;
    try {
      await apiClient(`/api/bankaccounts/${id}`, { method: 'DELETE' });
      fetchAccounts();
    } catch (err) {
      console.error(err);
    }
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
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Balance</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-200">
            {accounts.map((acc) => (
              <tr key={acc.id} className="hover:bg-background transition-colors">
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
                  <div className="text-sm text-foreground">XXXX-{acc.accountNumber.slice(-4)}</div>
                  <div className="text-xs text-muted-foreground">{acc.accountType}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground">
                  ₹{acc.currentBalance.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleDelete(acc.id)} className="text-red-600 hover:text-red-900 ml-4">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
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
                <input required value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="HDFC, SBI, etc." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Account Holder Name</label>
                <input required value={formData.accountHolderName} onChange={e => setFormData({...formData, accountHolderName: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Account Number</label>
                <input required value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Account Type</label>
                <select value={formData.accountType} onChange={e => setFormData({...formData, accountType: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all">
                  <option value="Savings">Savings</option>
                  <option value="Current">Current</option>
                  <option value="Salary">Salary</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Current Balance (₹)</label>
                <input required type="number" value={formData.currentBalance} onChange={e => setFormData({...formData, currentBalance: parseFloat(e.target.value)})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
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
