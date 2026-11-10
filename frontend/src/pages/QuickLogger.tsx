import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, Plus, Trash2, Coins, Briefcase, Tv, ShoppingCart, 
  Wallet, Check, ArrowRight 
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useToastStore } from '../store/toastStore';
import { useAuthStore } from '../store/authStore';
import { PrimaryAction, SecondaryAction } from '../components/ui/LiquidControls';

interface QuickTemplate {
  id: string;
  name: string;
  amount: number;
  category: string;
  type: 'DEBIT' | 'CREDIT';
  madeAgainst: string;
  linkedInvestmentId?: string;
  linkedIncomeSourceId?: string;
}

const LEGACY_KEY = 'fin_quick_templates';
/** What the server accepts: no client id. */
const toRequest = ({ name, amount, category, type, madeAgainst, linkedInvestmentId, linkedIncomeSourceId }: QuickTemplate) =>
  ({ name, amount, category, type, madeAgainst, linkedInvestmentId, linkedIncomeSourceId });

export default function QuickLogger() {
  const toast = useToastStore();
  const role = useAuthStore((s) => s.user?.role);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [incomeSources, setIncomeSources] = useState<any[]>([]);
  const [templates, setTemplates] = useState<QuickTemplate[]>([]);

  // Add Template Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateAmount, setTemplateAmount] = useState('');
  const [templateCategory, setTemplateCategory] = useState('Investment');
  const [templateType, setTemplateType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [templateLinkType, setTemplateLinkType] = useState<'none' | 'investment' | 'income'>('none');
  const [templateLinkId, setTemplateLinkId] = useState('');

  // Active Logging Form State
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [logAmount, setLogAmount] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentSource, setPaymentSource] = useState(''); // "bank:id" or "card:id" or ""

  // Load resources
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [banks, cards, invs, incomes] = await Promise.all([
          apiClient('/api/bankaccounts'),
          apiClient('/api/creditcards'),
          apiClient('/api/investments'),
          apiClient('/api/incomesources')
        ]);
        setBankAccounts(banks);
        setCreditCards(cards);
        setInvestments(invs);
        setIncomeSources(incomes);
      } catch (err) {
        console.error('Failed to load resources for Quick Logger', err);
      }
    };
    fetchData();
  }, []);

  // the person's own templates, once we know who is signed in
  useEffect(() => {
    if (role) loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  /**
   * Sprint 8: templates are the signed-in person's own, kept on the server (D-02). They used to sit in the browser's
   * storage, where everyone who used this computer saw them. An owner's old browser templates move to their account
   * once; a member never sees or touches them.
   */
  const loadTemplates = async () => {
    try {
      const mine: QuickTemplate[] = await apiClient('/api/quick-templates');
      const imported = role === 'OWNER' ? await importBrowserTemplates() : [];
      setTemplates([...mine, ...imported]);
    } catch (err) {
      console.error('Failed to load Quick Logger templates', err);
    }
  };

  const importBrowserTemplates = async (): Promise<QuickTemplate[]> => {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    localStorage.removeItem(LEGACY_KEY); // first, so a second render cannot import them twice
    try {
      const old: QuickTemplate[] = JSON.parse(raw);
      const saved: QuickTemplate[] = [];
      for (const t of old) saved.push(await apiClient('/api/quick-templates', { method: 'POST', body: JSON.stringify(toRequest(t)) }));
      if (saved.length) toast.success('Templates moved to your account', `${saved.length} template(s) from this browser are now saved to your account.`);
      return saved;
    } catch (err) {
      localStorage.setItem(LEGACY_KEY, raw); // try again next time
      console.error('Could not move browser templates', err);
      return [];
    }
  };

  // Unified Accounts and Cards dropdown data
  const unifiedSources = useMemo(() => {
    const list: { id: string; label: string; type: 'bank' | 'card' }[] = [];
    bankAccounts.forEach(b => {
      list.push({
        id: `bank:${b.id}`,
        label: `🏦 Account: ${b.bankName || 'Unknown Bank'} ${b.name ? `(${b.name})` : ''}`,
        type: 'bank'
      });
    });
    creditCards.forEach(c => {
      list.push({
        id: `card:${c.id}`,
        label: `💳 Card: ${c.cardName || 'Credit Card'} (${c.bankName || ''})`,
        type: 'card'
      });
    });
    return list;
  }, [bankAccounts, creditCards]);

  const handleAddTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim() || !templateAmount) return;

    const draft = {
      name: templateName.trim(),
      amount: parseFloat(templateAmount),
      category: templateCategory,
      type: templateType,
      madeAgainst: templateType === 'CREDIT' ? 'INCOME_SOURCE' : (templateCategory === 'Investment' ? 'SIP_INVESTMENT' : 'MANUAL_ENTRY'),
      linkedInvestmentId: templateLinkType === 'investment' ? templateLinkId || undefined : undefined,
      linkedIncomeSourceId: templateLinkType === 'income' ? templateLinkId || undefined : undefined
    };
    try {
      const created: QuickTemplate = await apiClient('/api/quick-templates', { method: 'POST', body: JSON.stringify(draft) });
      setTemplates(prev => [...prev, created]);
      setTemplateName('');
      setTemplateAmount('');
      setTemplateLinkType('none');
      setTemplateLinkId('');
      setShowAddForm(false);
      toast.success('Template Created', `Quick template '${created.name}' created successfully.`);
    } catch (err: any) {
      toast.error('Could not save template', err.message || 'Please check the details and try again.');
    }
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    try {
      await apiClient(`/api/quick-templates/${id}`, { method: 'DELETE' });
      setTemplates(prev => prev.filter(t => t.id !== id));
      if (activeTemplateId === id) setActiveTemplateId(null);
      toast.success('Template Removed', `Quick template '${name}' has been deleted.`);
    } catch (err: any) {
      toast.error('Could not remove template', err.message || 'Please try again.');
    }
  };

  const handleTriggerLog = (tpl: QuickTemplate) => {
    setActiveTemplateId(tpl.id);
    setLogAmount(tpl.amount.toString());
    setLogDate(new Date().toISOString().split('T')[0]);
    
    // Find matching link dynamically if possible or default to first unified payment source
    if (unifiedSources.length > 0) {
      setPaymentSource(unifiedSources[0].id);
    } else {
      setPaymentSource('');
    }
  };

  const handleConfirmLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const tpl = templates.find(t => t.id === activeTemplateId);
    if (!tpl) return;

    try {
      const payload: any = {
        amount: parseFloat(logAmount),
        category: tpl.category,
        expenseDate: logDate,
        description: tpl.name,
        type: tpl.type,
        madeAgainst: tpl.madeAgainst
      };

      // Set linked payment account/card
      if (paymentSource) {
        const [sourceType, sourceId] = paymentSource.split(':');
        if (sourceType === 'bank') {
          payload.linkedAccount = { id: sourceId };
        } else if (sourceType === 'card') {
          payload.linkedCreditCard = { id: sourceId };
        }
      }

      // Set entity link
      if (tpl.linkedInvestmentId) {
        payload.linkedInvestment = { id: tpl.linkedInvestmentId };
      } else if (tpl.linkedIncomeSourceId) {
        payload.linkedIncomeSource = { id: tpl.linkedIncomeSourceId };
      } else if (tpl.category === 'Investment') {
        // Fallback search: try to match investment by name automatically
        const match = investments.find(i => 
          i.name.toLowerCase().includes(tpl.name.toLowerCase()) || 
          tpl.name.toLowerCase().includes(i.name.toLowerCase())
        );
        if (match) {
          payload.linkedInvestment = { id: match.id };
        }
      }

      await apiClient('/api/expenses', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      toast.success('Transaction Logged', `Successfully recorded ₹${payload.amount} for '${tpl.name}'.`);
      setActiveTemplateId(null);
    } catch (err: any) {
      toast.error('Failed to log transaction', err.message || 'Could not save log entry.');
    }
  };

  return (
    <div className="min-h-full flex flex-col space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary fill-primary/10" /> Quick Transaction Logger
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Instantly log wages, side incomes, investments, subscriptions, and daily expenses. Select a template and confirm your bank account.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left pane: Templates Grid */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex justify-between items-center bg-card/40 p-4 rounded-xl border border-border/50 shrink-0">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recurring Quick Templates</span>
            <PrimaryAction onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white hover:bg-primary/90 text-xs font-bold rounded-lg transition-colors" icon={<Plus className="h-3.5 w-3.5" />}>New Template</PrimaryAction>
          </div>

          {showAddForm && (
            <div className="bg-card border border-border p-5 rounded-2xl shadow-xl space-y-4 transition-all">
              <h3 className="text-sm font-semibold text-foreground">Create Custom Transaction Template</h3>
              <form onSubmit={handleAddTemplateSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Template Name</label>
                    <input 
                      required 
                      value={templateName} 
                      onChange={e => setTemplateName(e.target.value)} 
                      placeholder="e.g. Airtel Internet Bill, Kotak FD" 
                      className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary outline-none transition-all text-xs" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Default Amount (₹)</label>
                    <input 
                      required 
                      type="number"
                      value={templateAmount} 
                      onChange={e => setTemplateAmount(e.target.value)} 
                      placeholder="0.00" 
                      className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary outline-none transition-all text-xs font-mono" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Transaction Type</label>
                    <select 
                      value={templateType} 
                      onChange={e => {
                        const newType = e.target.value as 'DEBIT' | 'CREDIT';
                        setTemplateType(newType);
                        if (newType === 'CREDIT') setTemplateCategory('Wages');
                        else setTemplateCategory('Investment');
                      }} 
                      className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary outline-none transition-all text-xs"
                    >
                      <option value="DEBIT">Debit (Outflow / Expense / SIP)</option>
                      <option value="CREDIT">Credit (Inflow / Wages / Profit)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Category</label>
                    {templateType === 'DEBIT' ? (
                      <select 
                        value={templateCategory} 
                        onChange={e => setTemplateCategory(e.target.value)} 
                        className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary outline-none transition-all text-xs"
                      >
                        <option value="Investment">Investment</option>
                        <option value="Entertainment">Entertainment</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Rent">Rent</option>
                        <option value="Food">Food / Groceries</option>
                        <option value="Travel">Travel / Fuel</option>
                        <option value="Other">Other Expenses</option>
                      </select>
                    ) : (
                      <select 
                        value={templateCategory} 
                        onChange={e => setTemplateCategory(e.target.value)} 
                        className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary outline-none transition-all text-xs"
                      >
                        <option value="Wages">Wages & Salary</option>
                        <option value="Side Income">Side Income Channel</option>
                        <option value="Refund">Refund / Cashback</option>
                        <option value="Other">Other Inflow</option>
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Link to System Entity</label>
                    <select 
                      value={templateLinkType} 
                      onChange={e => {
                        setTemplateLinkType(e.target.value as any);
                        setTemplateLinkId('');
                      }} 
                      className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary outline-none transition-all text-xs"
                    >
                      <option value="none">No Link</option>
                      {templateType === 'DEBIT' && <option value="investment">Investment Asset</option>}
                      {templateType === 'CREDIT' && <option value="income">Side Income Source</option>}
                    </select>
                  </div>
                </div>

                {templateLinkType !== 'none' && (
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/40">
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                      {templateLinkType === 'investment' ? 'Link Investment Asset' : 'Link Side Income Source'}
                    </label>
                    {templateLinkType === 'investment' ? (
                      <select 
                        required
                        value={templateLinkId} 
                        onChange={e => setTemplateLinkId(e.target.value)} 
                        className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary outline-none transition-all text-xs"
                      >
                        <option value="">-- Choose Investment --</option>
                        {investments.map(i => (
                          <option key={i.id} value={i.id}>{i.name} ({i.type})</option>
                        ))}
                      </select>
                    ) : (
                      <select 
                        required
                        value={templateLinkId} 
                        onChange={e => setTemplateLinkId(e.target.value)} 
                        className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary outline-none transition-all text-xs"
                      >
                        <option value="">-- Choose Income Source --</option>
                        {incomeSources.map(i => (
                          <option key={i.id} value={i.id}>{i.sourceName} ({i.ownerName})</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <SecondaryAction onClick={() => setShowAddForm(false)} className="px-4 py-2 text-xs text-muted-foreground hover:bg-muted rounded-lg font-semibold">Cancel</SecondaryAction>
                  <PrimaryAction type="submit" className="px-4 py-2 text-xs bg-primary text-white rounded-lg hover:bg-primary/90 font-bold transition-all">Create Template</PrimaryAction>
                </div>
              </form>
            </div>
          )}

          {/* Grid of existing templates */}
          {templates.length === 0 && !showAddForm && (
            <div className="bg-card rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No templates yet. Use <span className="font-semibold text-foreground">New Template</span> for the entries you log often.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(tpl => {
              const isDebit = tpl.type === 'DEBIT';
              const isSelected = activeTemplateId === tpl.id;
              
              // Get appropriate visual color mappings
              let accentClass = "border-l-4 border-l-blue-500";
              let iconElement = <Briefcase className="h-4 w-4 text-blue-500" />;
              
              if (tpl.category === 'Wages') {
                accentClass = "border-l-4 border-l-green-500";
                iconElement = <Coins className="h-4 w-4 text-green-500" />;
              } else if (tpl.category === 'Side Income') {
                accentClass = "border-l-4 border-l-teal-500";
                iconElement = <Coins className="h-4 w-4 text-teal-500" />;
              } else if (tpl.category === 'Entertainment' || tpl.category === 'Utilities') {
                accentClass = "border-l-4 border-l-purple-500";
                iconElement = <Tv className="h-4 w-4 text-purple-500" />;
              } else if (!isDebit) {
                accentClass = "border-l-4 border-l-emerald-500";
                iconElement = <Wallet className="h-4 w-4 text-emerald-500" />;
              } else {
                accentClass = "border-l-4 border-l-amber-500";
                iconElement = <ShoppingCart className="h-4 w-4 text-amber-500" />;
              }

              return (
                <div 
                  key={tpl.id} 
                  className={`bg-card rounded-xl border transition-all flex flex-col justify-between p-4 ${accentClass} ${
                    isSelected ? 'border-primary shadow-md ring-1 ring-primary/20 bg-primary/5' : 'border-border hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-muted/40 rounded-lg shrink-0">
                        {iconElement}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground leading-snug">{tpl.name}</h4>
                        <span className="text-[10px] uppercase font-black text-muted-foreground tracking-wider block mt-0.5">
                          {tpl.category} • {tpl.type}
                        </span>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleDeleteTemplate(tpl.id, tpl.name)} 
                      className="text-muted-foreground hover:text-red-500 p-1 rounded-lg transition-colors shrink-0"
                      title="Remove Template"
                      aria-label={`Remove template ${tpl.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/30 flex justify-between items-center">
                    <span className="font-mono font-bold text-sm text-foreground">
                      ₹{tpl.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    
                    <button 
                      onClick={() => handleTriggerLog(tpl)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isSelected 
                          ? 'bg-primary text-white' 
                          : 'bg-primary/10 text-primary hover:bg-primary/20'
                      }`}
                    >
                      Log Entry <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right pane: Quick Logger form submission details */}
        <div className="lg:col-span-5">
          {activeTemplateId ? (
            (() => {
              const selectedTpl = templates.find(t => t.id === activeTemplateId);
              if (!selectedTpl) return null;

              const isDebit = selectedTpl.type === 'DEBIT';

              return (
                <div className="bg-card border border-border rounded-2xl p-5 shadow-xl space-y-4 sticky top-4">
                  <div className="border-b border-border/40 pb-3 mb-1">
                    <h3 className="text-base font-bold text-foreground">Confirm Logging Details</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Confirm amounts and select the account to deduct/credit.
                    </p>
                  </div>

                  <form onSubmit={handleConfirmLog} className="space-y-4">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Transaction Details</span>
                      <div className="p-3 bg-muted/30 border border-border/40 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{selectedTpl.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider mt-0.5">{selectedTpl.category}</p>
                        </div>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${isDebit ? 'bg-red-500/10 text-red-500 border border-red-500/10' : 'bg-green-500/10 text-green-500 border border-green-500/10'}`}>
                          {selectedTpl.type}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Confirm Amount (₹)</label>
                        <input 
                          required 
                          type="number"
                          value={logAmount} 
                          onChange={e => setLogAmount(e.target.value)} 
                          className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary outline-none transition-all text-sm font-mono font-bold" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Select Date</label>
                        <input 
                          required 
                          type="date"
                          value={logDate} 
                          onChange={e => setLogDate(e.target.value)} 
                          className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary outline-none transition-all text-sm font-mono" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                        {isDebit ? 'Deduct From Bank Account / Card' : 'Deposit Into Bank Account'}
                      </label>
                      {unifiedSources.length === 0 ? (
                        <p className="text-xs text-amber-500 italic py-2">No bank accounts or credit cards loaded. Add them first in their respective pages.</p>
                      ) : (
                        <select 
                          required
                          value={paymentSource} 
                          onChange={e => setPaymentSource(e.target.value)} 
                          className="w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary outline-none transition-all text-xs cursor-pointer"
                        >
                          <option value="">-- Choose Account/Card --</option>
                          {unifiedSources.map(src => (
                            <option key={src.id} value={src.id}>{src.label}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                      <SecondaryAction onClick={() => setActiveTemplateId(null)} className="px-4 py-2 text-xs text-muted-foreground hover:bg-muted rounded-lg font-semibold">Cancel</SecondaryAction>
                      <button 
                        type="submit" 
                        disabled={!paymentSource}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs bg-primary text-white rounded-lg hover:bg-primary/90 font-bold transition-all disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" /> Confirm & Log Transaction
                      </button>
                    </div>
                  </form>
                </div>
              );
            })()
          ) : (
            <div className="bg-card/30 border border-border/50 border-dashed rounded-2xl p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-64">
              <Zap className="h-10 w-10 stroke-1 mb-2 opacity-50 text-primary" />
              <p className="text-xs font-medium">Select a recurring template on the left to start logging a transaction instantly.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
