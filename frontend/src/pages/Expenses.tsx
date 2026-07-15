import React, { useState, useEffect } from 'react';
import { Plus, Wallet, FileText, Calendar, Tag } from 'lucide-react';
import { apiClient } from '../api/client';

interface Expense {
  id: string;
  amount: number;
  category: string;
  expenseDate: string;
  description: string;
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  const fetchExpenses = async () => {
    try {
      const data = await apiClient('/api/expenses');
      setExpenses(data);
    } catch (error) {
      console.error('Failed to fetch expenses', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await apiClient('/api/expenses/categories');
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  useEffect(() => {
    Promise.all([fetchExpenses(), fetchCategories()]).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat(amount),
          category,
          expenseDate,
          description
        })
      });
      setAmount('');
      setCategory('');
      setDescription('');
      fetchExpenses();
      fetchCategories();
    } catch (error) {
      console.error('Failed to add expense', error);
    }
  };

  const totalThisMonth = expenses
    .filter(e => new Date(e.expenseDate).getMonth() === new Date().getMonth() && new Date(e.expenseDate).getFullYear() === new Date().getFullYear())
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Daily Expenses</h2>
        <p className="text-muted-foreground">Log and track your daily spending (EOD entries)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-border/50">
            <h3 className="text-lg font-semibold text-foreground mb-4">Add Expense</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Amount (₹)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Category</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    type="text"
                    required
                    list="category-suggestions"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="Groceries, Rent, Utilities..."
                  />
                  <datalist id="category-suggestions">
                    {categories.map((c, i) => (
                      <option key={i} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Date</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="Optional description"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Expense
              </button>
            </form>
          </div>
          
          <div className="glass-panel p-6 rounded-2xl border border-border/50 bg-gradient-to-br from-red-500/10 to-transparent">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Total This Month</h3>
            <p className="text-3xl font-bold text-foreground">₹{totalThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="glass-panel p-6 rounded-2xl border border-border/50 h-full flex flex-col">
            <h3 className="text-lg font-semibold text-foreground mb-4">Recent Expenses</h3>
            
            <div className="flex-1 overflow-auto custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
              ) : expenses.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-center">
                  <div>
                    <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No expenses logged yet.</p>
                    <p className="text-sm mt-1">Add your daily expenses here EOD to track your spending.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-4 bg-background/50 border border-border/50 rounded-xl hover:border-primary/30 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                          <Wallet className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{expense.category}</p>
                          <p className="text-sm text-muted-foreground">{expense.description || 'No description'}</p>
                          <p className="text-xs text-muted-foreground mt-1">{expense.expenseDate}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">₹{expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
