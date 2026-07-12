import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { Plus, Users, Trash2, ArrowRightLeft } from 'lucide-react';

interface PeerLending {
  id: string;
  type: string;
  personName: string;
  ownerName: string;
  amount: number;
  date: string;
  expectedReturnDate: string;
  settled: boolean;
}

export default function PeerLending() {
  const [lendings, setLendings] = useState<PeerLending[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<PeerLending>>({
    type: 'GIVEN',
    personName: '',
    ownerName: '',
    amount: 0,
    date: '',
    expectedReturnDate: '',
    settled: false
  });

  useEffect(() => {
    fetchLendings();
  }, []);

  const fetchLendings = async () => {
    try {
      const data = await apiClient('/api/peerlendings');
      setLendings(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/api/peerlendings', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setIsModalOpen(false);
      setFormData({ type: 'GIVEN', personName: '', ownerName: '', amount: 0, date: '', expectedReturnDate: '', settled: false });
      fetchLendings();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSettled = async (lending: PeerLending) => {
    try {
      await apiClient(`/api/peerlendings/${lending.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...lending, settled: !lending.settled })
      });
      fetchLendings();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await apiClient(`/api/peerlendings/${id}`, { method: 'DELETE' });
      fetchLendings();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Udhaar (Given & Taken)</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add Record
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lendings.map((lending) => {
          const isGiven = lending.type === 'GIVEN';
          return (
            <div key={lending.id} className={`p-6 rounded-lg shadow-sm border ${lending.settled ? 'bg-background border-border opacity-75' : 'bg-card border-border'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isGiven ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    <ArrowRightLeft className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{lending.personName}</h3>
                    <p className={`text-xs font-medium ${isGiven ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isGiven ? 'You Gave (Udhaar Given)' : 'You Took (Udhaar Taken)'}
                    </p>
                  </div>
                </div>
                <button onClick={() => handleDelete(lending.id)} className="text-muted-foreground hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Amount</p>
                  <p className="text-xl font-bold text-foreground">₹{lending.amount.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <button 
                    onClick={() => handleToggleSettled(lending)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${lending.settled ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}
                  >
                    {lending.settled ? 'Settled ✓' : 'Pending'}
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">{new Date(lending.date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected Return:</span>
                  <span className="font-medium">{new Date(lending.expectedReturnDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          )
        })}
        {lendings.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card border border-border rounded-lg">
            No Udhaar records found. Track money lent to friends or taken from relatives here.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Add Udhaar Record</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input type="radio" checked={formData.type === 'GIVEN'} onChange={() => setFormData({...formData, type: 'GIVEN'})} className="mr-2" />
                    I Gave Udhaar
                  </label>
                  <label className="flex items-center">
                    <input type="radio" checked={formData.type === 'TAKEN'} onChange={() => setFormData({...formData, type: 'TAKEN'})} className="mr-2" />
                    I Took Udhaar
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Person Name</label>
                <input required value={formData.personName} onChange={e => setFormData({...formData, personName: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount (₹)</label>
                <input required type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Expected Return</label>
                  <input required type="date" value={formData.expectedReturnDate} onChange={e => setFormData({...formData, expectedReturnDate: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90">Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
