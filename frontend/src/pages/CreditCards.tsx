import React, { useState, useEffect } from 'react';
import { Plus, CreditCard as CardIcon, Trash2, Landmark, Clock, ArrowUpRight, ArrowDownLeft, Calendar, Edit2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { useToastStore } from '../store/toastStore';
import { useConfirmStore } from '../store/confirmStore';

interface CreditCard {
  id: string;
  cardName: string;
  bankName: string;
  cardHolderName: string;
  cardNumber: string;
  creditLimit: number;
  openingOutstanding: number;
  billingCycleDate: number;
  dueDate: number;
  currentOutstanding?: number;
}

export default function CreditCards() {
  const toast = useToastStore();
  const confirm = useConfirmStore();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'ALL' | 'DEBIT' | 'CREDIT'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CreditCard>>({
    cardName: '',
    bankName: '',
    cardHolderName: '',
    cardNumber: '',
    creditLimit: 0,
    openingOutstanding: 0,
    billingCycleDate: 1,
    dueDate: 20
  });

  const [viewMode, setViewMode] = useState<'card' | 'list' | 'detailed'>('card');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [txnPage, setTxnPage] = useState(1);
  const [txnItemsPerPage, setTxnItemsPerPage] = useState(10);

  useEffect(() => {
    fetchCards();
    fetchExpenses();
  }, []);

  useEffect(() => {
    setItemsPerPage(viewMode === 'card' ? 6 : 10);
    setCurrentPage(1);
  }, [viewMode]);

  useEffect(() => {
    if (cards.length > 0 && !expandedCardId) {
      setExpandedCardId(cards[0].id);
    }
  }, [cards, expandedCardId]);

  useEffect(() => {
    setTransactionTypeFilter('ALL');
    setTxnPage(1);
  }, [expandedCardId]);

  useEffect(() => {
    setTxnPage(1);
  }, [transactionTypeFilter]);

  const fetchCards = async () => {
    try {
      const data = await apiClient('/api/creditcards');
      setCards(data);
    } catch (error) {
      console.error('Failed to fetch credit cards', error);
      toast.error('Error', 'Failed to fetch credit cards');
    }
  };

  const fetchExpenses = async () => {
    try {
      const data = await apiClient('/api/expenses');
      setExpenses(data);
    } catch (error) {
      console.error('Failed to fetch transactions', error);
    }
  };

  const handleEditClick = (card: CreditCard) => {
    setEditingCardId(card.id);
    setFormData({
      cardName: card.cardName,
      bankName: card.bankName,
      cardHolderName: card.cardHolderName || '',
      cardNumber: card.cardNumber || '',
      creditLimit: card.creditLimit,
      openingOutstanding: card.openingOutstanding || 0,
      billingCycleDate: card.billingCycleDate,
      dueDate: card.dueDate
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCardId(null);
    setFormData({
      cardName: '',
      bankName: '',
      cardHolderName: '',
      cardNumber: '',
      creditLimit: 0,
      openingOutstanding: 0,
      billingCycleDate: 1,
      dueDate: 20
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCardId ? `/api/creditcards/${editingCardId}` : '/api/creditcards';
      const method = editingCardId ? 'PUT' : 'POST';
      await apiClient(url, {
        method,
        body: JSON.stringify(formData)
      });
      toast.success('Success', editingCardId ? 'Credit card updated successfully' : 'Credit card added successfully');
      handleCloseModal();
      fetchCards();
    } catch (error: any) {
      toast.error('Error', error.message || 'Failed to save card');
    }
  };

  const handleDelete = async (id: string) => {
    confirm.show({
      title: 'Delete Credit Card',
      message: 'Are you sure you want to delete this credit card? This will unlink it from any daily transactions.',
      onConfirm: async () => {
        try {
          await apiClient(`/api/creditcards/${id}`, { method: 'DELETE' });
          toast.success('Deleted', 'Credit card deleted successfully');
          if (expandedCardId === id) setExpandedCardId(null);
          fetchCards();
          fetchExpenses();
        } catch (error: any) {
          toast.error('Error', error.message || 'Failed to delete card');
        }
      }
    });
  };

  const getCreditCardTxnClassification = (e: any) => {
    if (e.linkedAccount || e.linkedAccountId || e.linkedBankAccount) {
      if (e.type === 'DEBIT') {
        return 'CREDIT'; 
      } else {
        return 'DEBIT';
      }
    } else {
      if (e.type === 'DEBIT') {
        return 'DEBIT';
      } else {
        return 'CREDIT';
      }
    }
  };

  const selectedCard = cards.find(c => c.id === expandedCardId) || cards[0];

  const selectedCardTransactions = selectedCard 
    ? expenses.filter((e) => e.linkedCreditCard?.id === selectedCard.id)
    : [];

  const cardTxnsWithClassification = selectedCardTransactions.map(e => ({
    ...e,
    cardClassification: getCreditCardTxnClassification(e)
  }));

  const totalDebits = cardTxnsWithClassification.filter(e => e.cardClassification === 'DEBIT').reduce((sum, e) => sum + e.amount, 0);
  const totalCredits = cardTxnsWithClassification.filter(e => e.cardClassification === 'CREDIT').reduce((sum, e) => sum + e.amount, 0);

  const filteredTransactions = cardTxnsWithClassification.filter(e => {
    if (transactionTypeFilter === 'ALL') return true;
    return e.cardClassification === transactionTypeFilter;
  });

  const txnStartIndex = (txnPage - 1) * txnItemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(txnStartIndex, txnStartIndex + txnItemsPerPage);
  const totalTxnPages = Math.ceil(filteredTransactions.length / txnItemsPerPage);

  // Pagination for main cards list
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCards = cards.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(cards.length / itemsPerPage);

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Credit Cards</h1>
          <p className="text-sm text-muted-foreground">Manage your credit card outstanding balances and statement cycles</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-muted p-1 rounded-xl border border-border">
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'card' ? 'bg-background text-primary shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Card View"
            >
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-background text-primary shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="List View"
            >
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'detailed' ? 'bg-background text-primary shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Statement Ledger View"
            >
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </button>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/95 text-white font-semibold py-2 px-4 rounded-xl transition-all shadow-md shadow-primary/20"
          >
            <Plus className="h-4 w-4" /> Add Credit Card
          </button>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center glass-panel rounded-2xl border border-border/50 p-12 text-center">
          <CardIcon className="h-16 w-16 text-muted-foreground stroke-1 mb-4 opacity-40" />
          <h3 className="text-lg font-semibold mb-1">No Credit Cards Found</h3>
          <p className="text-muted-foreground text-sm max-w-sm mb-6">Add your credit cards to keep track of limits, due dates, and charge history.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary hover:bg-primary/95 text-white font-semibold py-2 px-4 rounded-xl transition-all shadow-md shadow-primary/20"
          >
            Add Your First Card
          </button>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          {viewMode === 'card' && (
            <div className="flex flex-col h-full justify-between">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedCards.map((card) => {
                  const outstanding = card.currentOutstanding ?? 0;
                  const available = Math.max(0, card.creditLimit - outstanding);
                  const limitPercent = Math.min(100, Math.max(0, (outstanding / card.creditLimit) * 100));

                  return (
                    <div
                      key={card.id}
                      className="glass-panel p-5 rounded-2xl border border-border/50 flex flex-col justify-between hover:border-primary/30 transition-all group hover:shadow-lg relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors -mr-6 -mt-6"></div>
                      <div>
                        <div className="flex justify-between items-start mb-4 relative z-10">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
                              <CardIcon className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-bold text-foreground text-base group-hover:text-primary transition-colors leading-snug">{card.cardName}</h3>
                              <p className="text-xs text-muted-foreground mt-0.5">{card.bankName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditClick(card)}
                              className="text-muted-foreground hover:text-primary p-1"
                              title="Edit Card"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(card.id)}
                              className="text-muted-foreground hover:text-red-500 p-1"
                              title="Delete Card"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3 mt-4">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Outstanding Balance:</span>
                            <span className="font-semibold text-red-500">₹{outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Available Limit:</span>
                            <span className="font-semibold text-green-600">₹{available.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                          
                          {/* Limit usage progress bar */}
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                limitPercent > 80 ? 'bg-red-500' : limitPercent > 50 ? 'bg-yellow-500' : 'bg-primary'
                              }`}
                              style={{ width: `${limitPercent}%` }}
                            ></div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
                            <div>
                              <span className="font-semibold text-foreground">Cycle Date:</span> {card.billingCycleDate}th
                            </div>
                            <div className="text-right">
                              <span className="font-semibold text-foreground">Due Date:</span> {card.dueDate}th
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-border/40 flex gap-2">
                        <button
                          onClick={() => {
                            setExpandedCardId(card.id);
                            setViewMode('detailed');
                          }}
                          className="w-full text-center py-2 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold rounded-lg transition-all"
                        >
                          View Card Statement
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-border/50 text-sm text-muted-foreground">
                  <span>Showing page <span className="font-semibold text-foreground">{currentPage}</span> of {totalPages}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground font-semibold disabled:opacity-40 transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground font-semibold disabled:opacity-40 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {viewMode === 'list' && (
            <div className="glass-panel border border-border/50 rounded-2xl overflow-hidden flex flex-col h-full justify-between">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border/50">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Card Details</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Holder / Card No.</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Statement / Due Date</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Credit Limit</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Outstanding Balance</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Available Limit</th>
                      <th className="px-6 py-3.5 text-right text-xs font-bold text-muted-foreground tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 bg-card/30">
                    {paginatedCards.map((card) => {
                      const outstanding = card.currentOutstanding ?? 0;
                      const available = Math.max(0, card.creditLimit - outstanding);
                      return (
                        <tr key={card.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                <CardIcon className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="font-semibold text-foreground text-sm">{card.cardName}</div>
                                <div className="text-xs text-muted-foreground">{card.bankName}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-foreground">{card.cardHolderName || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">{card.cardNumber ? `•••• ${card.cardNumber}` : 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            Cycle: {card.billingCycleDate}th | Due: {card.dueDate}th
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                            ₹{card.creditLimit.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-500">
                            ₹{outstanding.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                            ₹{available.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end gap-3">
                            <button
                              onClick={() => {
                                setExpandedCardId(card.id);
                                setViewMode('detailed');
                              }}
                              className="text-primary hover:text-primary/80 font-semibold"
                            >
                              Statement
                            </button>
                            <button
                              onClick={() => handleEditClick(card)}
                              className="text-muted-foreground hover:text-primary p-1"
                              title="Edit Card"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDelete(card.id)} className="text-muted-foreground hover:text-red-500 p-1">
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-border/50 flex justify-between items-center text-sm text-muted-foreground bg-muted/20">
                  <span>Showing page <span className="font-semibold text-foreground">{currentPage}</span> of {totalPages}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground font-semibold disabled:opacity-40 transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground font-semibold disabled:opacity-40 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {viewMode === 'detailed' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-10rem)] overflow-hidden">
              {/* Left pane: Cards selection list */}
              <div className="lg:col-span-4 bg-card/30 border border-border/50 rounded-xl p-4 flex flex-col h-full overflow-y-auto space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Credit Cards</h4>
                {cards.map((card) => {
                  const outstanding = card.currentOutstanding ?? 0;
                  return (
                    <div
                      key={card.id}
                      onClick={() => setExpandedCardId(card.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        selectedCard?.id === card.id
                          ? 'bg-primary/10 border-primary shadow-sm'
                          : 'bg-card/50 border-border/50 hover:bg-card/80 hover:border-border'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${selectedCard?.id === card.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            <CardIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm text-foreground">{card.cardName}</h4>
                            <p className="text-xs text-muted-foreground">{card.bankName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(card);
                            }}
                            className="text-muted-foreground hover:text-primary p-1"
                            title="Edit Card"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(card.id);
                            }}
                            className="text-muted-foreground hover:text-red-500 p-1"
                            title="Delete Card"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-between items-baseline">
                        <span className="text-xs text-muted-foreground">Outstanding:</span>
                        <span className="text-sm font-bold text-foreground">₹{outstanding.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right pane: Detailed Transactions statement */}
              <div className="lg:col-span-8 bg-card border border-border rounded-xl p-6 flex flex-col h-full overflow-hidden">
                {selectedCard ? (
                  <div className="flex flex-col flex-1 min-h-0 overflow-hidden text-sm">
                    <div className="border-b border-border/50 pb-3 mb-3">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div>
                          <h3 className="font-bold text-base text-foreground leading-tight">{selectedCard.cardName}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Holder: {selectedCard.cardHolderName || 'N/A'} | Number: {selectedCard.cardNumber ? `•••• ${selectedCard.cardNumber}` : 'N/A'}
                          </p>
                        </div>
                        <div className="flex items-center gap-6 text-right">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold leading-tight">Billing Cycle</span>
                            <span className="text-xs font-semibold text-foreground">Cycle: {selectedCard.billingCycleDate}th | Due: {selectedCard.dueDate}th</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold leading-tight">Outstanding Balance</span>
                            <span className="text-lg font-bold text-red-500">₹{(selectedCard.currentOutstanding ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-3 mb-3 shrink-0">
                      <div className="p-2.5 bg-red-500/5 border border-red-500/10 rounded-xl flex justify-between items-center">
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-bold mb-0.5">Total Charges (Debits)</span>
                          <span className="text-sm font-bold text-red-500">
                            +₹{totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="text-[9px] bg-red-500/10 text-red-500 font-bold px-1.5 py-0.5 rounded-full">
                          {cardTxnsWithClassification.filter(e => e.cardClassification === 'DEBIT').length} txn
                        </div>
                      </div>
                      <div className="p-2.5 bg-green-500/5 border border-green-500/10 rounded-xl flex justify-between items-center">
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-bold mb-0.5">Total Payments (Credits)</span>
                          <span className="text-sm font-bold text-green-600">
                            -₹{totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="text-[9px] bg-green-500/10 text-green-600 font-bold px-1.5 py-0.5 rounded-full">
                          {cardTxnsWithClassification.filter(e => e.cardClassification === 'CREDIT').length} txn
                        </div>
                      </div>
                    </div>

                    {/* Tab Filters */}
                    <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2 shrink-0">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statement Ledger</h4>
                      <div className="flex gap-1 bg-muted p-0.5 rounded-lg border border-border">
                        <button
                          onClick={() => setTransactionTypeFilter('ALL')}
                          className={`px-2.5 py-1 text-[11px] rounded-md transition-all font-medium ${
                            transactionTypeFilter === 'ALL'
                              ? 'bg-background text-foreground shadow-xs'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setTransactionTypeFilter('DEBIT')}
                          className={`px-2.5 py-1 text-[11px] rounded-md transition-all font-medium ${
                            transactionTypeFilter === 'DEBIT'
                              ? 'bg-background text-red-500 shadow-xs'
                              : 'text-muted-foreground hover:text-red-500'
                          }`}
                        >
                          Charges
                        </button>
                        <button
                          onClick={() => setTransactionTypeFilter('CREDIT')}
                          className={`px-2.5 py-1 text-[11px] rounded-md transition-all font-medium ${
                            transactionTypeFilter === 'CREDIT'
                              ? 'bg-background text-green-600 shadow-xs'
                              : 'text-muted-foreground hover:text-green-600'
                          }`}
                        >
                          Payments
                        </button>
                      </div>
                    </div>

                    {/* Compact Transaction History List */}
                    <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 min-h-0 custom-scrollbar">
                      {paginatedTransactions.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                          {selectedCardTransactions.length === 0 
                            ? 'No transactions logged against this credit card.' 
                            : 'No transactions match the selected filter.'}
                        </p>
                      ) : (
                        paginatedTransactions.map((exp) => {
                          const isCredit = exp.cardClassification === 'CREDIT';
                          return (
                            <div
                              key={exp.id}
                              className="flex justify-between items-center py-2 px-3 rounded-lg border border-border/30 bg-background/50 hover:bg-background/80 transition-colors gap-4"
                            >
                              <div className="min-w-0">
                                <div className="font-semibold text-xs text-foreground truncate">{exp.category}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">{exp.expenseDate}</div>
                                {exp.description && <p className="text-[10px] text-muted-foreground italic truncate mt-0.5">{exp.description}</p>}
                              </div>
                              <span className={`font-bold text-xs shrink-0 ${isCredit ? 'text-green-500' : 'text-red-500'}`}>
                                {isCredit ? '-' : '+'}₹{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Ledger Pagination Controls */}
                    {filteredTransactions.length > 0 && (
                      <div className="border-t border-border/50 pt-2 mt-2 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            Showing <span className="font-semibold text-foreground">{txnStartIndex + 1}</span> to{' '}
                            <span className="font-semibold text-foreground">{Math.min(txnStartIndex + txnItemsPerPage, filteredTransactions.length)}</span> of{' '}
                            <span className="font-semibold text-foreground">{filteredTransactions.length}</span> txns
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span>Show</span>
                            <select
                              value={txnItemsPerPage}
                              onChange={(e) => {
                                setTxnItemsPerPage(Number(e.target.value));
                                setTxnPage(1);
                              }}
                              className="px-2 py-0.5 rounded bg-card border border-border text-foreground text-[11px] outline-none cursor-pointer focus:ring-1 focus:ring-primary"
                            >
                              <option value={5}>5 entries</option>
                              <option value={10}>10 entries</option>
                              <option value={20}>20 entries</option>
                              <option value={50}>50 entries</option>
                            </select>
                          </div>
                        </div>
                        {totalTxnPages > 1 && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setTxnPage(prev => Math.max(prev - 1, 1))}
                              disabled={txnPage === 1}
                              className="p-1 rounded border border-border bg-card hover:bg-muted text-muted-foreground disabled:opacity-40"
                              title="Previous Page"
                            >
                              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                              </svg>
                            </button>
                            <span className="text-xs text-muted-foreground px-2">
                              Page <span className="font-semibold text-foreground">{txnPage}</span> of {totalTxnPages}
                            </span>
                            <button
                              onClick={() => setTxnPage(prev => Math.min(prev + 1, totalTxnPages))}
                              disabled={txnPage === totalTxnPages}
                              className="p-1 rounded border border-border bg-card hover:bg-muted text-muted-foreground disabled:opacity-40"
                              title="Next Page"
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
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                    <CardIcon className="h-12 w-12 stroke-1 mb-2 opacity-50" />
                    <p className="text-sm">Select a credit card on the left to view statement ledgers and charge history.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold text-foreground mb-4">{editingCardId ? 'Edit Credit Card' : 'Add Credit Card'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Card Name</label>
                <input required value={formData.cardName} onChange={e => setFormData({ ...formData, cardName: e.target.value })} className="w-full p-2.5 rounded-lg bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" placeholder="Amazon Pay ICICI, HDFC Regalia, etc." />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Bank Name</label>
                <input required value={formData.bankName} onChange={e => setFormData({ ...formData, bankName: e.target.value })} className="w-full p-2.5 rounded-lg bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" placeholder="ICICI Bank, HDFC, SBI, etc." />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Card Holder Name</label>
                <input required value={formData.cardHolderName} onChange={e => setFormData({ ...formData, cardHolderName: e.target.value })} className="w-full p-2.5 rounded-lg bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" placeholder="Ravi Kumar" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Card Number (Last 4 digits)</label>
                <input required maxLength={4} pattern="\d{4}" value={formData.cardNumber} onChange={e => setFormData({ ...formData, cardNumber: e.target.value })} className="w-full p-2.5 rounded-lg bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" placeholder="1234" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Credit Limit (₹)</label>
                <input required type="number" min={0} value={formData.creditLimit} onChange={e => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) })} className="w-full p-2.5 rounded-lg bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Opening Outstanding Balance (₹)</label>
                <input required type="number" min={0} value={formData.openingOutstanding} onChange={e => setFormData({ ...formData, openingOutstanding: parseFloat(e.target.value) })} className="w-full p-2.5 rounded-lg bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Cycle Date (1-31)</label>
                  <input required type="number" min={1} max={31} value={formData.billingCycleDate} onChange={e => setFormData({ ...formData, billingCycleDate: parseInt(e.target.value) })} className="w-full p-2.5 rounded-lg bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Due Date (1-31)</label>
                  <input required type="number" min={1} max={31} value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: parseInt(e.target.value) })} className="w-full p-2.5 rounded-lg bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 border border-border text-muted-foreground hover:bg-muted rounded-xl text-sm font-semibold transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/95 text-sm font-semibold transition-all">{editingCardId ? 'Save Changes' : 'Save Card'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
