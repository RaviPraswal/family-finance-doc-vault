import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { Plus, Banknote, Trash2 } from 'lucide-react';

interface IncomeSource {
  id: string;
  sourceName: string;
  ownerName: string;
  amount: number;
  frequency: string;
  dateReceived: string;
}

export default function SideIncome() {
  const [incomes, setIncomes] = useState<IncomeSource[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<IncomeSource>>({
    sourceName: '',
    ownerName: '',
    amount: 0,
    frequency: 'Monthly',
    dateReceived: ''
  });

  useEffect(() => {
    fetchIncomes();
  }, []);

  const fetchIncomes = async () => {
    try {
      const data = await apiClient('/api/incomesources');
      setIncomes(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/api/incomesources', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setIsModalOpen(false);
      setFormData({ sourceName: '', ownerName: '', amount: 0, frequency: 'Monthly', dateReceived: '' });
      fetchIncomes();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this income record?")) return;
    try {
      await apiClient(`/api/incomesources/${id}`, { method: 'DELETE' });
      fetchIncomes();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Side Income & Revenue</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add Income
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {incomes.map((inc) => (
          <div key={inc.id} className="bg-card p-6 rounded-lg shadow-sm border border-border">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                  <Banknote className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{inc.sourceName}</h3>
                  <p className="text-xs text-muted-foreground">{inc.frequency}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(inc.id)} className="text-muted-foreground hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            
            <div className="mb-4 pb-4 border-b border-border">
              <p className="text-sm text-muted-foreground mb-1">Amount</p>
              <p className="text-2xl font-bold text-green-600">+₹{inc.amount.toLocaleString()}</p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Received:</span>
                <span className="font-medium">{new Date(inc.dateReceived).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
        {incomes.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card border border-border rounded-lg">
            No side income recorded. Track your freelancing, rental income, or business revenue here.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Add Side Income</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Source Name</label>
                <input required value={formData.sourceName} onChange={e => setFormData({...formData, sourceName: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="e.g. Freelance, Rental Yield" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Amount (₹)</label>
                  <input required type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Frequency</label>
                  <select value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all">
                    <option value="One-time">One-time</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date Received</label>
                <input required type="date" value={formData.dateReceived} onChange={e => setFormData({...formData, dateReceived: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90">Save Income</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
