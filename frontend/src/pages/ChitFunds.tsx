import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { Plus, Users, Trash2 } from 'lucide-react';

interface ChitFund {
  id: string;
  organizerName: string;
  memberName: string;
  totalValue: number;
  monthlyInstallment: number;
  durationMonths: number;
  startDate: string;
}

export default function ChitFunds() {
  const [chitFunds, setChitFunds] = useState<ChitFund[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<ChitFund>>({
    organizerName: '',
    memberName: '',
    totalValue: 0,
    monthlyInstallment: 0,
    durationMonths: 20,
    startDate: ''
  });

  useEffect(() => {
    fetchChitFunds();
  }, []);

  const fetchChitFunds = async () => {
    try {
      const data = await apiClient('/api/chitfunds');
      setChitFunds(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/api/chitfunds', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setIsModalOpen(false);
      setFormData({ organizerName: '', memberName: '', totalValue: 0, monthlyInstallment: 0, durationMonths: 20, startDate: '' });
      fetchChitFunds();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this Chit Fund?")) return;
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
        {chitFunds.map((chit) => {
          const startDate = new Date(chit.startDate);
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + chit.durationMonths);
          
          return (
            <div key={chit.id} className="bg-card p-6 rounded-lg shadow-sm border border-border">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{chit.organizerName}</h3>
                    <p className="text-xs text-muted-foreground">Member: {chit.memberName}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(chit.id)} className="text-muted-foreground hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Value:</span>
                  <span className="font-semibold text-foreground">₹{chit.totalValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Installment:</span>
                  <span className="font-medium">₹{chit.monthlyInstallment.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{chit.durationMonths} Months</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="text-muted-foreground">Expected Maturity:</span>
                  <span className="font-semibold text-primary">{endDate.toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          )
        })}
        {chitFunds.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card border border-border rounded-lg">
            No Chit Funds found. Track your local committee/chit investments here.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Add Chit Fund</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Organizer / Group Name</label>
                <input required value={formData.organizerName} onChange={e => setFormData({...formData, organizerName: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Family Member Name</label>
                <input required value={formData.memberName} onChange={e => setFormData({...formData, memberName: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Total Value (₹)</label>
                <input required type="number" value={formData.totalValue} onChange={e => setFormData({...formData, totalValue: parseFloat(e.target.value)})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Monthly (₹)</label>
                  <input required type="number" value={formData.monthlyInstallment} onChange={e => setFormData({...formData, monthlyInstallment: parseFloat(e.target.value)})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Duration (Months)</label>
                  <input required type="number" value={formData.durationMonths} onChange={e => setFormData({...formData, durationMonths: parseInt(e.target.value)})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input required type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
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
