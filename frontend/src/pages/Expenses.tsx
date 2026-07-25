import React, { useState, useEffect } from 'react';
import { Plus, Wallet, FileText, Calendar, Tag, ArrowUpRight, ArrowDownLeft, Edit2, Trash2, History } from 'lucide-react';
import { apiClient } from '../api/client';
import { useToastStore } from '../store/toastStore';
import { useConfirmStore } from '../store/confirmStore';

interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  accountType?: string;
}

interface Loan {
  id: string;
  lenderName: string;
  principalAmount: number;
  outstandingAmount: number;
}

interface ChitFund {
  id: string;
  organizerName: string;
  monthlyInstallment: number;
}

interface PeerLending {
  id: string;
  personName: string;
  amount: number;
  type: string;
}

interface Investment {
  id: string;
  name: string;
  investedAmount: number;
}

interface Deposit {
  id: string;
  institution: string;
  principalAmount: number;
  type: string;
}

interface Project {
  id: string;
  name: string;
  budget: number;
  customFieldsConfig?: string;
}

interface IncomeSource {
  id: string;
  sourceName: string;
  amount: number;
}

interface Expense {
  id: string;
  amount: number;
  category: string;
  expenseDate: string;
  description: string;
  type: string;
  madeAgainst: string;
  linkedAccount?: BankAccount;
  linkedLoan?: Loan;
  linkedChitFund?: ChitFund;
  linkedPeerLending?: PeerLending;
  linkedInvestment?: Investment;
  linkedDeposit?: Deposit;
  linkedProject?: Project;
  linkedIncomeSource?: IncomeSource;
  linkedCreditCard?: any;
  customFieldsData?: string;
  editHistory?: string;
}

export default function Expenses() {
  const toast = useToastStore();
  const confirm = useConfirmStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [chitFunds, setChitFunds] = useState<ChitFund[]>([]);
  const [peerLendings, setPeerLendings] = useState<PeerLending[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [type, setType] = useState('DEBIT');
  const [madeAgainst, setMadeAgainst] = useState('MANUAL_ENTRY');
  const [linkedAccountId, setLinkedAccountId] = useState('');
  const [linkedLoanId, setLinkedLoanId] = useState('');
  const [linkedChitFundId, setLinkedChitFundId] = useState('');
  const [linkedPeerLendingId, setLinkedPeerLendingId] = useState('');
  const [linkedInvestmentId, setLinkedInvestmentId] = useState('');
  const [linkedDepositId, setLinkedDepositId] = useState('');
  const [linkedProjectId, setLinkedProjectId] = useState('');
  const [linkedIncomeSourceId, setLinkedIncomeSourceId] = useState('');
  const [linkedCreditCardId, setLinkedCreditCardId] = useState('');
  const [customFieldsData, setCustomFieldsData] = useState<Record<string, string>>({});
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

  const fetchLoans = async () => {
    try {
      const data = await apiClient('/api/loans');
      setLoans(data);
    } catch (error) {
      console.error('Failed to fetch loans', error);
    }
  };

  const fetchChitFunds = async () => {
    try {
      const data = await apiClient('/api/chitfunds');
      setChitFunds(data);
    } catch (error) {
      console.error('Failed to fetch chit funds', error);
    }
  };

  const fetchPeerLendings = async () => {
    try {
      const data = await apiClient('/api/peerlendings');
      setPeerLendings(data);
    } catch (error) {
      console.error('Failed to fetch peer lendings', error);
    }
  };

  const fetchInvestments = async () => {
    try {
      const data = await apiClient('/api/investments');
      setInvestments(data);
    } catch (error) {
      console.error('Failed to fetch investments', error);
    }
  };

  const fetchDeposits = async () => {
    try {
      const data = await apiClient('/api/deposits');
      setDeposits(data);
    } catch (error) {
      console.error('Failed to fetch deposits', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const data = await apiClient('/api/projects');
      setProjects(data);
    } catch (error) {
      console.error('Failed to fetch projects', error);
    }
  };

  const fetchIncomeSources = async () => {
    try {
      const data = await apiClient('/api/incomesources');
      setIncomeSources(data);
    } catch (error) {
      console.error('Failed to fetch income sources', error);
    }
  };

  const fetchCreditCards = async () => {
    try {
      const data = await apiClient('/api/creditcards');
      setCreditCards(data);
    } catch (error) {
      console.error('Failed to fetch credit cards', error);
    }
  };

  useEffect(() => {
    Promise.all([
      fetchExpenses(),
      fetchCategories(),
      fetchBankAccounts(),
      fetchLoans(),
      fetchChitFunds(),
      fetchPeerLendings(),
      fetchInvestments(),
      fetchDeposits(),
      fetchProjects(),
      fetchIncomeSources(),
      fetchCreditCards()
    ]).finally(() => setLoading(false));
  }, []);

  const handleEditClick = (expense: Expense) => {
    setEditingExpense(expense);
    setAmount(String(expense.amount));
    setCategory(expense.category);
    setExpenseDate(expense.expenseDate);
    setDescription(expense.description || '');
    setType(expense.type);
    setMadeAgainst(expense.madeAgainst || 'MANUAL_ENTRY');
    setLinkedAccountId(expense.linkedAccount?.id || '');
    setLinkedLoanId(expense.linkedLoan?.id || '');
    setLinkedChitFundId(expense.linkedChitFund?.id || '');
    setLinkedPeerLendingId(expense.linkedPeerLending?.id || '');
    setLinkedInvestmentId(expense.linkedInvestment?.id || '');
    setLinkedDepositId(expense.linkedDeposit?.id || '');
    setLinkedProjectId(expense.linkedProject?.id || '');
    setLinkedIncomeSourceId(expense.linkedIncomeSource?.id || '');
    setLinkedCreditCardId(expense.linkedCreditCard?.id || '');

    let cData = {};
    try {
      if (expense.customFieldsData) {
        cData = JSON.parse(expense.customFieldsData);
      }
    } catch (e) {
      console.error(e);
    }
    setCustomFieldsData(cData);

    const formElement = document.getElementById('transaction-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const clearForm = () => {
    setEditingExpense(null);
    setAmount('');
    setCategory('');
    setDescription('');
    setLinkedAccountId('');
    setLinkedLoanId('');
    setLinkedChitFundId('');
    setLinkedPeerLendingId('');
    setLinkedInvestmentId('');
    setLinkedDepositId('');
    setLinkedProjectId('');
    setLinkedIncomeSourceId('');
    setLinkedCreditCardId('');
    setCustomFieldsData({});
    setType('DEBIT');
    setMadeAgainst('MANUAL_ENTRY');
  };

  const handleDeleteClick = (expense: Expense) => {
    confirm.show({
      title: 'Delete Transaction',
      message: 'Are you sure you want to delete this transaction? This will reverse any related balance updates.',
      onConfirm: async () => {
        try {
          await apiClient(`/api/expenses/${expense.id}`, { method: 'DELETE' });
          toast.success('Deleted', 'Transaction has been deleted successfully.');
          fetchExpenses();
          fetchCategories();
        } catch (err: any) {
          toast.error('Error', err.message || 'Could not delete transaction. Please try again.');
        }
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingExpense ? `/api/expenses/${editingExpense.id}` : '/api/expenses';
      const method = editingExpense ? 'PUT' : 'POST';
      await apiClient(url, {
        method,
        body: JSON.stringify({
          amount: parseFloat(amount),
          category,
          expenseDate,
          description,
          type,
          madeAgainst,
          linkedAccount: linkedAccountId ? { id: linkedAccountId } : null,
          linkedLoan: madeAgainst === 'LOAN_EMI' && linkedLoanId ? { id: linkedLoanId } : null,
          linkedChitFund: madeAgainst === 'CHIT_INSTALLMENT' && linkedChitFundId ? { id: linkedChitFundId } : null,
          linkedPeerLending: madeAgainst === 'PEER_LENDING' && linkedPeerLendingId ? { id: linkedPeerLendingId } : null,
          linkedInvestment: madeAgainst === 'SIP_INVESTMENT' && linkedInvestmentId ? { id: linkedInvestmentId } : null,
          linkedDeposit: madeAgainst === 'RECURRING_DEPOSIT' && linkedDepositId ? { id: linkedDepositId } : null,
          linkedProject: madeAgainst === 'PROJECT' && linkedProjectId ? { id: linkedProjectId } : null,
          linkedIncomeSource: madeAgainst === 'INCOME_SOURCE' && linkedIncomeSourceId ? { id: linkedIncomeSourceId } : null,
          linkedCreditCard: madeAgainst === 'CREDIT_CARD' && linkedCreditCardId ? { id: linkedCreditCardId } : null,
          customFieldsData: madeAgainst === 'PROJECT' ? JSON.stringify(customFieldsData) : null
        })
      });
      clearForm();
      toast.success(
        editingExpense ? 'Transaction updated' : 'Transaction added',
        `Your transaction has been ${editingExpense ? 'updated' : 'recorded'} successfully.`
      );
      fetchExpenses();
      fetchCategories();
    } catch (error: any) {
      toast.error(
        editingExpense ? 'Update failed' : 'Transaction failed',
        error.message || 'Could not save transaction. Please try again.'
      );
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
          <div id="transaction-form" className="glass-panel p-6 rounded-2xl border border-border/50">
            <h3 className="text-lg font-semibold text-foreground mb-4">{editingExpense ? 'Edit Transaction' : 'Add Transaction'}</h3>
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
                <label className="block text-sm font-medium text-foreground mb-1">Made Against</label>
                <select
                  value={madeAgainst}
                  onChange={(e) => setMadeAgainst(e.target.value)}
                  className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                >
                  <option value="MANUAL_ENTRY">Manual Entry / Others</option>
                  <option value="PEER_LENDING">Peer Lending (Udhaar)</option>
                  <option value="LOAN_EMI">Loan EMI</option>
                  <option value="CHIT_INSTALLMENT">Chit Fund Installment</option>
                  <option value="RECURRING_DEPOSIT">FD / RD Deposit</option>
                  <option value="SIP_INVESTMENT">SIP Investment (Mutual Fund)</option>
                  <option value="CREDIT_CARD">Credit Card Payment</option>
                  <option value="PROJECT">Project Expense</option>
                  <option value="INCOME_SOURCE">Side Income / Income Source</option>
                </select>
              </div>

              {madeAgainst === 'PEER_LENDING' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Select Peer Lending Record</label>
                  <select
                    value={linkedPeerLendingId}
                    onChange={(e) => setLinkedPeerLendingId(e.target.value)}
                    className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    required
                  >
                    <option value="">-- Select --</option>
                    {peerLendings.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.type === 'TAKEN' ? 'Lent From (Borrowed)' : 'Lent To'}: {p.personName} (₹{p.amount.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {madeAgainst === 'LOAN_EMI' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Select Loan</label>
                  <select
                    value={linkedLoanId}
                    onChange={(e) => setLinkedLoanId(e.target.value)}
                    className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    required
                  >
                    <option value="">-- Select --</option>
                    {loans.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.lenderName} (Principal: ₹{l.principalAmount.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {madeAgainst === 'CHIT_INSTALLMENT' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Select Chit Fund</label>
                  <select
                    value={linkedChitFundId}
                    onChange={(e) => setLinkedChitFundId(e.target.value)}
                    className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    required
                  >
                    <option value="">-- Select --</option>
                    {chitFunds.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.organizerName} (Inst: ₹{c.monthlyInstallment.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {madeAgainst === 'RECURRING_DEPOSIT' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Select Deposit</label>
                  <select
                    value={linkedDepositId}
                    onChange={(e) => setLinkedDepositId(e.target.value)}
                    className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    required
                  >
                    <option value="">-- Select --</option>
                    {deposits.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.institution} - {d.type} (₹{d.principalAmount.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {madeAgainst === 'SIP_INVESTMENT' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Select Investment</label>
                  <select
                    value={linkedInvestmentId}
                    onChange={(e) => setLinkedInvestmentId(e.target.value)}
                    className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    required
                  >
                    <option value="">-- Select --</option>
                    {investments.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} (Invested: ₹{i.investedAmount.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {madeAgainst === 'CREDIT_CARD' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Select Credit Card</label>
                  <select
                    value={linkedCreditCardId}
                    onChange={(e) => setLinkedCreditCardId(e.target.value)}
                    className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    required
                  >
                    <option value="">-- Select Card --</option>
                    {creditCards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.cardName} ({c.bankName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {madeAgainst === 'PROJECT' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Select Project</label>
                    <select
                      value={linkedProjectId}
                      onChange={(e) => {
                        setLinkedProjectId(e.target.value);
                        setCustomFieldsData({});
                      }}
                      className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      required
                    >
                      <option value="">-- Select Project --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Budget: ₹{p.budget.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Render custom inputs if project has config */}
                  {(() => {
                    const selectedProject = projects.find(p => p.id === linkedProjectId);
                    if (!selectedProject || !selectedProject.customFieldsConfig) return null;
                    let fields: string[] = [];
                    try {
                      fields = JSON.parse(selectedProject.customFieldsConfig);
                    } catch (e) {
                      console.error(e);
                    }
                    if (fields.length === 0) return null;
                    return (
                      <div className="bg-muted/30 p-3 rounded-xl border border-border/50 space-y-3">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Custom Project Details</span>
                        {fields.map((field) => (
                          <div key={field}>
                            <label className="block text-[11px] font-medium text-muted-foreground mb-1">{field}</label>
                            <input
                              type="text"
                              value={customFieldsData[field] || ''}
                              onChange={(e) => setCustomFieldsData({
                                ...customFieldsData,
                                [field]: e.target.value
                              })}
                              className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none text-foreground"
                              placeholder={`Enter ${field}`}
                            />
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {madeAgainst === 'INCOME_SOURCE' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Select Side Income / Income Source</label>
                  <select
                    value={linkedIncomeSourceId}
                    onChange={(e) => setLinkedIncomeSourceId(e.target.value)}
                    className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    required
                  >
                    <option value="">-- Select Income Source --</option>
                    {incomeSources.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.sourceName} (Amount: ₹{i.amount.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                    {Array.from(new Set([
                      ...categories,
                      'Salary', 'Side Income', 'Groceries', 'Rent', 'Utilities', 
                      'Fuel / Petrol', 'Travel / Toll', 'Taxes / ITR', 'Loan EMI', 
                      'Chit Fund Installment', 'Peer Lending (Udhaar)', 'Investment', 
                      'Insurance', 'Medical', 'Food / Dining', 'Electronics', 'Others'
                    ])).map((c, i) => (
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

              <div className="flex gap-2">
                {editingExpense && (
                  <button
                    type="button"
                    onClick={clearForm}
                    className="flex-1 py-2.5 bg-muted text-muted-foreground hover:bg-muted/80 font-medium rounded-xl transition-colors text-sm"
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type="submit"
                  className={`${editingExpense ? 'flex-1' : 'w-full'} py-2.5 bg-primary text-primary-foreground font-medium rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm`}
                >
                  {editingExpense ? <Edit2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingExpense ? 'Update Transaction' : 'Add Transaction'}
                </button>
              </div>
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
                                {expense.madeAgainst && expense.madeAgainst !== 'MANUAL_ENTRY' && (
                                  <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full font-bold uppercase">
                                    {expense.madeAgainst === 'PEER_LENDING' && expense.linkedPeerLending ? `Udhaar: ${expense.linkedPeerLending.personName}` :
                                     expense.madeAgainst === 'LOAN_EMI' && expense.linkedLoan ? `Loan: ${expense.linkedLoan.lenderName}` :
                                     expense.madeAgainst === 'CHIT_INSTALLMENT' && expense.linkedChitFund ? `Chit: ${expense.linkedChitFund.organizerName}` :
                                     expense.madeAgainst === 'RECURRING_DEPOSIT' && expense.linkedDeposit ? `Deposit: ${expense.linkedDeposit.institution}` :
                                     expense.madeAgainst === 'SIP_INVESTMENT' && expense.linkedInvestment ? `SIP: ${expense.linkedInvestment.name}` :
                                     expense.madeAgainst === 'PROJECT' && expense.linkedProject ? `Project: ${expense.linkedProject.name}` :
                                     expense.madeAgainst === 'INCOME_SOURCE' && expense.linkedIncomeSource ? `Income: ${expense.linkedIncomeSource.sourceName}` :
                                     expense.madeAgainst === 'PEER_LENDING' ? 'Peer Lending' :
                                     expense.madeAgainst === 'LOAN_EMI' ? 'Loan EMI' :
                                     expense.madeAgainst === 'CHIT_INSTALLMENT' ? 'Chit Fund' :
                                     expense.madeAgainst === 'RECURRING_DEPOSIT' ? 'RD Deposit' :
                                     expense.madeAgainst === 'SIP_INVESTMENT' ? 'SIP' :
                                     expense.madeAgainst === 'PROJECT' ? 'Project' :
                                     expense.madeAgainst === 'INCOME_SOURCE' ? 'Income Source' : expense.madeAgainst}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{expense.description || 'No description'}</p>
                              {expense.madeAgainst === 'PROJECT' && expense.customFieldsData && (() => {
                                let customData: Record<string, string> = {};
                                try {
                                  customData = JSON.parse(expense.customFieldsData);
                                } catch (e) {
                                  console.error(e);
                                }
                                if (Object.keys(customData).length === 0) return null;
                                return (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {Object.entries(customData).map(([key, val]) => (
                                      val && (
                                        <span key={key} className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground font-medium border border-border/50">
                                          {key}: {val}
                                        </span>
                                      )
                                    ))}
                                  </div>
                                );
                              })()}
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">{expense.expenseDate}</span>
                                {expense.linkedAccount && (
                                   <>
                                     <span className="text-xs text-muted-foreground">•</span>
                                     <span className={`text-xs px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary`}>
                                       🏦 {expense.linkedAccount.name || expense.linkedAccount.bankName || 'Bank Account'}
                                     </span>
                                   </>
                                 )}
                                 {expense.linkedCreditCard && (
                                   <>
                                     <span className="text-xs text-muted-foreground">•</span>
                                     <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-500/10 text-purple-500 border border-purple-500/20">
                                       💳 {expense.linkedCreditCard.cardName || 'Credit Card'}
                                     </span>
                                   </>
                                 )}
                              </div>
                              {expense.editHistory && (
                                <div className="mt-2 pt-2 border-t border-border/20">
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                    <History className="h-3 w-3" /> Edit History
                                  </span>
                                  <div className="text-[10px] text-muted-foreground whitespace-pre-line mt-1 bg-muted/20 p-2 rounded-lg leading-relaxed text-left">
                                    {expense.editHistory}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-3 shrink-0">
                            <div>
                              <p className={`font-bold ${isCredit ? 'text-green-500' : 'text-foreground'}`}>
                                {isCredit ? '+' : '-'}₹{expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEditClick(expense)}
                                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
                                title="Edit Transaction"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(expense)}
                                className="p-1 hover:bg-muted text-muted-foreground hover:text-red-500 rounded transition-colors"
                                title="Delete Transaction"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
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
