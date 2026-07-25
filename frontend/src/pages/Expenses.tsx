import React, { useState, useEffect } from 'react';
import { Wallet, FileText, Calendar, Tag, Edit2, Trash2, Search, Download, Printer } from 'lucide-react';
import { apiClient } from '../api/client';
import { useToastStore } from '../store/toastStore';
import { useConfirmStore } from '../store/confirmStore';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';

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

  // Form Fields
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

  // Unified Filter states for table list
  const [search, setSearch] = useState('');
  const [filterBankId, setFilterBankId] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const filterStartDate = '';
  const filterEndDate = '';
  const filterMinAmount = '';
  const filterMaxAmount = '';

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const fetchExpenses = async () => {
    try {
      const data = await apiClient('/api/expenses');
      setExpenses(data);
    } catch (error) {
      console.error('Failed to fetch expenses', error);
    } finally {
      setLoading(false);
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
      console.error('Failed to fetch peer lending records', error);
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
    ]);
  }, []);

  const handleEditClick = (expense: Expense) => {
    setEditingExpense(expense);
    setAmount(expense.amount.toString());
    setCategory(expense.category);
    setExpenseDate(expense.expenseDate);
    setDescription(expense.description || '');
    setType(expense.type);
    setMadeAgainst(expense.madeAgainst);
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

  // Filter Transaction List
  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = (e.description || '').toLowerCase().includes(search.toLowerCase()) || 
                          e.category.toLowerCase().includes(search.toLowerCase()) ||
                          e.madeAgainst.toLowerCase().includes(search.toLowerCase());
                          
    const matchesBank = filterBankId === '' 
      ? true 
      : filterBankId === 'unlinked' 
        ? !e.linkedAccount 
        : e.linkedAccount?.id === filterBankId;

    const matchesType = filterType === '' ? true : e.type === filterType;
    const matchesCategory = filterCategory === 'ALL' ? true : e.category === filterCategory;

    let matchesDate = true;
    if (filterStartDate) {
      matchesDate = matchesDate && new Date(e.expenseDate) >= new Date(filterStartDate);
    }
    if (filterEndDate) {
      matchesDate = matchesDate && new Date(e.expenseDate) <= new Date(filterEndDate);
    }

    let matchesAmount = true;
    if (filterMinAmount) {
      matchesAmount = matchesAmount && e.amount >= parseFloat(filterMinAmount);
    }
    if (filterMaxAmount) {
      matchesAmount = matchesAmount && e.amount <= parseFloat(filterMaxAmount);
    }

    return matchesSearch && matchesBank && matchesType && matchesCategory && matchesDate && matchesAmount;
  });

  // Sort: Chronological descending
  const sortedExpenses = [...filteredExpenses].sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());

  // Pagination calculations
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedExpenses = sortedExpenses.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(sortedExpenses.length / itemsPerPage);

  // Month Statistics based on Filtered transaction data
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

  const uniqueCategories = Array.from(new Set(expenses.map(e => e.category)));

  // Exporters
  const handleExportCSV = () => {
    const headers = ['Date', 'Category', 'Type', 'Description', 'Linked Asset/Card', 'Made Against', 'Amount'];
    const exportData = sortedExpenses.map(e => [
      e.expenseDate,
      e.category,
      e.type,
      e.description || '',
      e.linkedAccount?.name || e.linkedCreditCard?.cardName || '',
      e.madeAgainst,
      e.amount
    ]);
    exportToCSV(exportData, headers, 'Transactions_Statement');
  };

  const handleExportPDF = () => {
    const headers = ['Date', 'Category', 'Type', 'Description', 'Asset/Card', 'Amount'];
    const exportData = sortedExpenses.map(e => [
      new Date(e.expenseDate).toLocaleDateString(),
      e.category,
      e.type,
      e.description || '-',
      e.linkedAccount?.name || e.linkedCreditCard?.cardName || '-',
      `₹${e.amount.toLocaleString()}`
    ]);
    exportToPDF('Detailed Daily Transactions Ledger', headers, exportData, 'Transactions_Statement');
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Daily Transactions</h2>
        <p className="text-muted-foreground">Log and track your daily spending and income (EOD debit & credit entries)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Left Column: Form & Mini stats */}
        <div className="lg:col-span-1 flex flex-col gap-6 overflow-y-auto pr-1 h-[calc(100vh-12rem)] custom-scrollbar">
          <div id="transaction-form" className="glass-panel p-5 rounded-2xl border border-border/50 bg-card">
            <h3 className="text-base font-semibold text-foreground mb-4">{editingExpense ? 'Edit Transaction' : 'Add Transaction'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Transaction Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-xs"
                >
                  <option value="DEBIT">Debit (Outflow / Expense)</option>
                  <option value="CREDIT">Credit (Inflow / Income)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Amount (₹)</label>
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
                    className="w-full pl-10 pr-3 py-2 bg-background text-foreground border border-border rounded-xl focus:ring-1 focus:ring-primary focus:border-primary transition-all text-xs"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Linked Bank Account</label>
                <select
                  value={linkedAccountId}
                  onChange={(e) => setLinkedAccountId(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-xs"
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
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Made Against</label>
                <select
                  value={madeAgainst}
                  onChange={(e) => setMadeAgainst(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-xs"
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

              {/* Made against dynamic fields */}
              {madeAgainst === 'PEER_LENDING' && (
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Select Peer Lending Record</label>
                  <select
                    value={linkedPeerLendingId}
                    onChange={(e) => setLinkedPeerLendingId(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:ring-1 focus:ring-primary outline-none text-xs"
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
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Select Loan</label>
                  <select
                    value={linkedLoanId}
                    onChange={(e) => setLinkedLoanId(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:ring-1 focus:ring-primary outline-none text-xs"
                    required
                  >
                    <option value="">-- Select Loan --</option>
                    {loans.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.lenderName} (Outstanding: ₹{l.outstandingAmount.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {madeAgainst === 'CHIT_INSTALLMENT' && (
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Select Chit Fund</label>
                  <select
                    value={linkedChitFundId}
                    onChange={(e) => setLinkedChitFundId(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:ring-1 focus:ring-primary outline-none text-xs"
                    required
                  >
                    <option value="">-- Select Chit Fund --</option>
                    {chitFunds.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.organizerName} (Installment: ₹{c.monthlyInstallment.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {madeAgainst === 'RECURRING_DEPOSIT' && (
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Select FD/RD Deposit</label>
                  <select
                    value={linkedDepositId}
                    onChange={(e) => setLinkedDepositId(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:ring-1 focus:ring-primary outline-none text-xs"
                    required
                  >
                    <option value="">-- Select Deposit --</option>
                    {deposits.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.institution} - {d.type} (Principal: ₹{d.principalAmount.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {madeAgainst === 'SIP_INVESTMENT' && (
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Select Investment</label>
                  <select
                    value={linkedInvestmentId}
                    onChange={(e) => setLinkedInvestmentId(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:ring-1 focus:ring-primary outline-none text-xs"
                    required
                  >
                    <option value="">-- Select Investment --</option>
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
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Select Credit Card</label>
                  <select
                    value={linkedCreditCardId}
                    onChange={(e) => setLinkedCreditCardId(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:ring-1 focus:ring-primary outline-none text-xs"
                    required
                  >
                    <option value="">-- Select Credit Card --</option>
                    {creditCards.map((cc) => (
                      <option key={cc.id} value={cc.id}>
                        {cc.cardName} ({cc.bankName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {madeAgainst === 'PROJECT' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Select Project</label>
                    <select
                      value={linkedProjectId}
                      onChange={(e) => {
                        setLinkedProjectId(e.target.value);
                        setCustomFieldsData({});
                      }}
                      className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:ring-1 focus:ring-primary outline-none text-xs"
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
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Custom Project Details</span>
                        {fields.map((field) => (
                          <div key={field}>
                            <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">{field}</label>
                            <input
                              type="text"
                              value={customFieldsData[field] || ''}
                              onChange={(e) => setCustomFieldsData({
                                ...customFieldsData,
                                [field]: e.target.value
                              })}
                              className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary outline-none text-foreground"
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
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Select Income Source</label>
                  <select
                    value={linkedIncomeSourceId}
                    onChange={(e) => setLinkedIncomeSourceId(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:ring-1 focus:ring-primary outline-none text-xs"
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
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Category</label>
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
                    className="w-full pl-10 pr-3 py-2 bg-background text-foreground border border-border rounded-xl focus:ring-1 focus:ring-primary focus:border-primary transition-all text-xs"
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
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Date</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-background text-foreground border border-border rounded-xl focus:ring-1 focus:ring-primary focus:border-primary transition-all text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Description</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-background text-foreground border border-border rounded-xl focus:ring-1 focus:ring-primary focus:border-primary transition-all text-xs"
                    placeholder="Optional description"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {editingExpense && (
                  <button
                    type="button"
                    onClick={clearForm}
                    className="flex-1 py-2 bg-muted text-muted-foreground hover:bg-muted/80 font-bold rounded-lg transition-colors text-xs"
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type="submit"
                  className={`${editingExpense ? 'flex-1' : 'w-full'} py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 text-xs cursor-pointer`}
                >
                  {editingExpense ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-3">
            <div className="glass-panel p-4 rounded-xl border border-border/50 bg-gradient-to-br from-green-500/5 to-transparent">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Inflow (Credits) This Month</span>
              <p className="text-base font-mono font-bold text-green-500 mt-1">₹{totalCreditsThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            
            <div className="glass-panel p-4 rounded-xl border border-border/50 bg-gradient-to-br from-red-500/5 to-transparent">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Outflow (Debits) This Month</span>
              <p className="text-base font-mono font-bold text-red-500 mt-1">₹{totalDebitsThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>

            <div className={`glass-panel p-4 rounded-xl border border-border/50 bg-gradient-to-br ${netCashflow >= 0 ? 'from-green-500/5' : 'from-red-500/5'} to-transparent`}>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Net Cashflow This Month</span>
              <p className={`text-base font-mono font-bold mt-1 ${netCashflow >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {netCashflow >= 0 ? '+' : ''}₹{netCashflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Dense table view of transactions */}
        <div className="lg:col-span-2 bg-card border border-border/50 rounded-2xl p-4 flex flex-col h-[calc(100vh-12rem)] overflow-hidden">
          <div className="flex justify-between items-center pb-3 border-b border-border/30 mb-3 shrink-0">
            <h3 className="font-bold text-sm text-foreground">Transaction Logs Ledger</h3>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1 px-2.5 py-1 bg-muted hover:bg-muted/80 border border-border/50 text-[10px] text-muted-foreground hover:text-foreground font-bold uppercase rounded cursor-pointer transition-colors"
                title="Export CSV"
              >
                <Download className="h-3 w-3" /> CSV
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1 px-2.5 py-1 bg-muted hover:bg-muted/80 border border-border/50 text-[10px] text-muted-foreground hover:text-foreground font-bold uppercase rounded cursor-pointer transition-colors"
                title="Export PDF"
              >
                <Printer className="h-3 w-3" /> PDF
              </button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-3 bg-muted/20 p-2.5 rounded-xl border border-border/50 shrink-0 text-xs">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search ledger..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-7 pr-2 py-1 w-full bg-background border border-border rounded text-xs outline-none focus:ring-1 focus:ring-primary text-foreground"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-2 py-1 bg-background border border-border rounded text-xs text-foreground outline-none cursor-pointer focus:ring-1 focus:ring-primary"
            >
              <option value="">All Types</option>
              <option value="DEBIT">Debit Only</option>
              <option value="CREDIT">Credit Only</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2 py-1 bg-background border border-border rounded text-xs text-foreground outline-none cursor-pointer focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Categories</option>
              {uniqueCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={filterBankId}
              onChange={(e) => setFilterBankId(e.target.value)}
              className="px-2 py-1 bg-background border border-border rounded text-xs text-foreground outline-none cursor-pointer focus:ring-1 focus:ring-primary"
            >
              <option value="">All Asset Banks</option>
              <option value="unlinked">Unlinked / Cash</option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>

          {/* Ledger Table */}
          <div className="flex-1 overflow-auto custom-scrollbar border border-border/20 rounded-xl min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Loading transactions...</div>
            ) : paginatedExpenses.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-xs text-muted-foreground">No transaction logs match current filters.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-border/20 dense-table text-left text-xs">
                <thead className="bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Category</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Description</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Asset/Card</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Reference</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Amount</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-card/50 divide-y divide-border/20">
                  {paginatedExpenses.map((expense, idx) => {
                    const isCredit = expense.type === 'CREDIT';
                    return (
                      <tr 
                        key={expense.id} 
                        className={`hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? 'bg-background/25' : 'bg-card/15'}`}
                      >
                        <td className="px-3 py-2 whitespace-nowrap font-mono text-muted-foreground text-[11px] tabular-nums">
                          {new Date(expense.expenseDate).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <span className="font-semibold text-foreground block">{expense.category}</span>
                          {expense.madeAgainst && expense.madeAgainst !== 'MANUAL_ENTRY' && (
                            <span className="text-[9px] bg-blue-500/10 text-blue-500 px-1 py-0.5 rounded uppercase font-bold mt-0.5 inline-block">
                              {expense.madeAgainst.replace('_', ' ')}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[120px]" title={expense.description}>
                          {expense.description || '-'}
                        </td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                          {expense.linkedAccount ? (
                            <span className="text-primary font-medium">🏦 {expense.linkedAccount.name}</span>
                          ) : expense.linkedCreditCard ? (
                            <span className="text-purple-500 font-medium">💳 {expense.linkedCreditCard.cardName}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                          {expense.madeAgainst === 'PEER_LENDING' && expense.linkedPeerLending ? `Udhaar: ${expense.linkedPeerLending.personName}` :
                           expense.madeAgainst === 'LOAN_EMI' && expense.linkedLoan ? `Loan: ${expense.linkedLoan.lenderName}` :
                           expense.madeAgainst === 'CHIT_INSTALLMENT' && expense.linkedChitFund ? `Chit: ${expense.linkedChitFund.organizerName}` :
                           expense.madeAgainst === 'SIP_INVESTMENT' && expense.linkedInvestment ? `SIP: ${expense.linkedInvestment.name}` : '-'}
                        </td>
                        <td className={`px-3 py-2 whitespace-nowrap text-right font-mono font-bold tabular-nums text-xs ${isCredit ? 'text-green-500' : 'text-red-500'}`}>
                          {isCredit ? '+' : '-'}₹{expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right text-xs font-medium">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleEditClick(expense)}
                              className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
                              title="Edit Transaction"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(expense)}
                              className="p-1 hover:bg-muted text-muted-foreground hover:text-red-500 rounded transition-colors"
                              title="Delete Transaction"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Controls */}
          {sortedExpenses.length > 0 && (
            <div className="border-t border-border/50 pt-2 mt-2 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 text-xs">
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                <span>
                  Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{' '}
                  <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, sortedExpenses.length)}</span> of{' '}
                  <span className="font-semibold text-foreground">{sortedExpenses.length}</span> txns
                </span>
                <div className="flex items-center gap-1.5">
                  <span>Show</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-1.5 py-0.5 rounded bg-card border border-border text-foreground text-[10px] outline-none cursor-pointer focus:ring-1 focus:ring-primary"
                  >
                    <option value={15}>15 entries</option>
                    <option value={30}>30 entries</option>
                    <option value={50}>50 entries</option>
                  </select>
                </div>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded border border-border bg-card hover:bg-muted text-muted-foreground disabled:opacity-40"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <span className="text-[10px] text-muted-foreground px-2">
                    Page <span className="font-semibold text-foreground">{currentPage}</span> of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded border border-border bg-card hover:bg-muted text-muted-foreground disabled:opacity-40"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
