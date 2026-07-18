import React, { useState, useEffect } from 'react';
import { Plus, Wallet, FileText, Calendar, Tag, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { apiClient } from '../api/client';

interface BankAccount {
  id: string;
  name: string;
  bankName: string;
}

interface Expense {
  id: string;
  amount: number;
  category: string;
  expenseDate: string;
  description: string;
  type: string;
  linkedAccount?: BankAccount;
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [type, setType] = useState('DEBIT');
  const [linkedAccountId, setLinkedAccountId] = useState('');
  const [filterBankId, setFilterBankId] = useState('');
  const [filterType, setFilterType] = useState('');

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

  const fetchBankAccounts = async () => {
    try {
      const data = await apiClient('/api/bankaccounts');
      setBankAccounts(data);
    } catch (error) {
      console.error('Failed to fetch bank accounts', error);
    }
  };

  useEffect(() => {
    Promise.all([fetchExpenses(), fetchCategories(), fetchBankAccounts()]).finally(() => setLoading(false));
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
          description,
          type,
          linkedAccount: linkedAccountId ? { id: linkedAccountId } : null
        })
      });
      setAmount('');
      setCategory('');
      setDescription('');
      setLinkedAccountId('');
      setType('DEBIT');
      fetchExpenses();
      fetchCategories();
    } catch (error) {
      console.error('Failed to add transaction', error);
    }
  };

  const currentMonthTransactions = expenses.filter(e => {
    const d = new Date(e.expenseDate);
    return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
  });

  const totalDebitsThisMonth = currentMonthTransactions
    .filter(e => e.type !== 'CREDIT')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalCreditsThisMonth = currentMonthTransactions
    .filter(e => e.type === 'CREDIT')
    .reduce((sum, e) => sum + e.amount, 0);

  const netCashflow = totalCreditsThisMonth - totalDebitsThisMonth;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Daily Transactions</h2>
        <p className="text-muted-foreground">Log and track your daily spending and income (EOD debit & credit entries)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-border/50">
            <h3 className="text-lg font-semibold text-foreground mb-4">Add Transaction</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Transaction Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                >
                  <option value="DEBIT">Debit (Outflow / Expense)</option>
                  <option value="CREDIT">Credit (Inflow / Income)</option>
                </select>
              </div>

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
                <label className="block text-sm font-medium text-foreground mb-1">Linked Bank Account</label>
                <select
                  value={linkedAccountId}
                  onChange={(e) => setLinkedAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                >
                  <option value="">-- None --</option>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.bankName})
                    </option>
                  ))}
                </select>
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
                Add Transaction
              </button>
            </form>
          </div>
          
          <div className="space-y-4">
            <div className="glass-panel p-6 rounded-2xl border border-border/50 bg-gradient-to-br from-green-500/10 to-transparent">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Inflow (Credits) This Month</h3>
              <p className="text-2xl font-bold text-foreground">₹{totalCreditsThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            
            <div className="glass-panel p-6 rounded-2xl border border-border/50 bg-gradient-to-br from-red-500/10 to-transparent">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Outflow (Debits) This Month</h3>
              <p className="text-2xl font-bold text-foreground">₹{totalDebitsThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>

            <div className={`glass-panel p-6 rounded-2xl border border-border/50 bg-gradient-to-br ${netCashflow >= 0 ? 'from-green-500/10' : 'from-red-500/10'} to-transparent`}>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Net Cashflow This Month</h3>
              <p className={`text-2xl font-bold ${netCashflow >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {netCashflow >= 0 ? '+' : ''}₹{netCashflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="glass-panel p-6 rounded-2xl border border-border/50 h-full flex flex-col">
            <div className="flex flex-wrap gap-4 mb-6 items-center justify-between border-b border-border/30 pb-4">
              <h3 className="text-lg font-semibold text-foreground">Recent Transactions</h3>
              <div className="flex flex-wrap gap-3">
                {/* Bank Filter */}
                <div>
                  <select
                    value={filterBankId}
                    onChange={(e) => setFilterBankId(e.target.value)}
                    className="px-3 py-1.5 bg-background/50 border border-border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="">All Banks</option>
                    <option value="unlinked">Unlinked / Cash</option>
                    {bankAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Type Filter */}
                <div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-1.5 bg-background/50 border border-border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="">All Types</option>
                    <option value="DEBIT">Debit Only</option>
                    <option value="CREDIT">Credit Only</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
              ) : expenses.filter(e => {
                const matchesBank = filterBankId === '' 
                  ? true 
                  : filterBankId === 'unlinked' 
                    ? !e.linkedAccount 
                    : e.linkedAccount?.id === filterBankId;
                const matchesType = filterType === '' 
                  ? true 
                  : e.type === filterType;
                return matchesBank && matchesType;
              }).length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-center">
                  <div>
                    <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No transactions found.</p>
                    <p className="text-sm mt-1">Try adjusting your filters or log a new transaction.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {expenses
                    .filter(e => {
                      const matchesBank = filterBankId === '' 
                        ? true 
                        : filterBankId === 'unlinked' 
                          ? !e.linkedAccount 
                          : e.linkedAccount?.id === filterBankId;
                      const matchesType = filterType === '' 
                        ? true 
                        : e.type === filterType;
                      return matchesBank && matchesType;
                    })
                    .map((expense) => {
                      const isCredit = expense.type === 'CREDIT';
                      return (
                        <div key={expense.id} className="flex items-center justify-between p-4 bg-background/50 border border-border/50 rounded-xl hover:border-primary/30 transition-colors">
                          <div className="flex items-start gap-4">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${isCredit ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                              {isCredit ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground">{expense.category}</p>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${isCredit ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                  {isCredit ? 'Credit' : 'Debit'}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">{expense.description || 'No description'}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">{expense.expenseDate}</span>
                                {expense.linkedAccount && (
                                  <>
                                    <span className="text-xs text-muted-foreground">•</span>
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                      {expense.linkedAccount.name}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${isCredit ? 'text-green-500' : 'text-foreground'}`}>
                              {isCredit ? '+' : '-'}₹{expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
