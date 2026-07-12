import { useState, useEffect, useRef } from 'react';
import { Calendar, CheckCircle, Clock, FileText, Upload, Loader2 } from 'lucide-react';
import { apiClient } from '../api/client';

export default function Ledger() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // AI Parsing State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedSchedule, setParsedSchedule] = useState<any>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const data = await apiClient('/api/transactions/scheduled/pending').catch(() => []);
      setPayments(data || []);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    setProcessingId(id);
    try {
      await apiClient(`/api/transactions/process-scheduled/${id}`, { method: 'POST' });
      fetchPayments();
    } catch (error) {
      console.error('Failed to process payment:', error);
      alert('Failed to process payment. Please ensure you have sufficient balance.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParsedSchedule(null);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await apiClient('/api/ai/parse-schedule', {
        method: 'POST',
        body: formData
      });
      setParsedSchedule(data);
    } catch (error) {
      console.error('Failed to parse schedule:', error);
      alert('Failed to parse schedule document. The AI service might be unavailable.');
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Ledger & Scheduled Payments</h1>
        <p className="text-muted-foreground mt-2">Manage your upcoming manual payments and AI document parsing.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: AI Document Upload */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary/20 rounded-xl text-primary">
                  <Upload className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">AI Auto-Schedule</h2>
              </div>
              
              <p className="text-sm text-muted-foreground mb-6">
                Upload a loan schedule, mutual fund SIP statement, or RD passbook. 
                Our AI will extract the dates and amounts and automatically generate reminders for you.
              </p>
              
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
              />
              
              <div 
                onClick={() => !isParsing && fileInputRef.current?.click()}
                className={`border-2 border-dashed border-border/50 rounded-xl p-8 text-center transition-colors cursor-pointer bg-background/30 ${isParsing ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'}`}
              >
                {isParsing ? (
                  <Loader2 className="w-8 h-8 text-primary mx-auto mb-3 animate-spin" />
                ) : (
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                )}
                
                <p className="text-sm font-medium text-foreground">
                  {isParsing ? 'Analyzing Document...' : 'Click to upload document'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">PDF, PNG, or JPG up to 10MB</p>
              </div>

              {parsedSchedule && (
                <div className="mt-6 p-4 border border-primary/30 bg-primary/5 rounded-xl">
                  <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Extraction Successful
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Type:</span> {parsedSchedule.scheduleType}</p>
                    <p><span className="text-muted-foreground">Institution:</span> {parsedSchedule.institutionName}</p>
                    <p><span className="text-muted-foreground">Installments Found:</span> {parsedSchedule.installments?.length}</p>
                  </div>
                  <button 
                    onClick={async () => {
                      try {
                        await apiClient('/api/ai/save-schedule', {
                          method: 'POST',
                          body: JSON.stringify(parsedSchedule)
                        });
                        
                        setParsedSchedule(null);
                        fetchPayments();
                        alert('Schedule successfully saved!');
                      } catch (err: any) {
                        alert('Failed to save schedule: ' + err.message);
                      }
                    }}
                    className="mt-4 w-full py-2 bg-primary text-primary-foreground font-medium rounded-lg text-sm hover:opacity-90 transition-opacity"
                  >
                    Approve & Save Schedule
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Upcoming Payments */}
        <div className="lg:col-span-2">
          <div className="glass-panel p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Upcoming Payments
              </h2>
              <span className="px-3 py-1 bg-primary/20 text-primary text-xs font-semibold rounded-full">
                {payments.length} Pending
              </span>
            </div>

            {loading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-muted/20 rounded-xl"></div>
                ))}
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12 bg-background/30 rounded-xl border border-border/50">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-foreground">All caught up!</h3>
                <p className="text-sm text-muted-foreground">You have no pending scheduled payments.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {payments.map((payment) => {
                  const isDueToday = new Date(payment.dueDate).toDateString() === new Date().toDateString();
                  const isOverdue = new Date(payment.dueDate) < new Date() && !isDueToday;
                  
                  return (
                    <div 
                      key={payment.id} 
                      className={`flex items-center justify-between p-4 rounded-xl border ${
                        isOverdue ? 'border-destructive/30 bg-destructive/5' : 
                        isDueToday ? 'border-primary/30 bg-primary/5' : 
                        'border-border/50 bg-background/30'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${
                          isOverdue ? 'bg-destructive/20 text-destructive' : 
                          isDueToday ? 'bg-primary/20 text-primary' : 
                          'bg-muted text-muted-foreground'
                        }`}>
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{payment.description || payment.referenceType}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                              isOverdue ? 'bg-destructive/20 text-destructive' : 
                              isDueToday ? 'bg-primary/20 text-primary' : 
                              'bg-muted text-muted-foreground'
                            }`}>
                              Due {new Date(payment.dueDate).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-muted-foreground">ID: {payment.referenceId?.substring(0,8) || ''}...</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-foreground">₹{payment.amount?.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{payment.transactionType}</p>
                        </div>
                        <button
                          onClick={() => handleMarkAsPaid(payment.id)}
                          disabled={processingId === payment.id}
                          className="px-4 py-2 bg-gradient-to-r from-primary to-purple-500 text-white font-medium rounded-lg hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95 disabled:opacity-50"
                        >
                          {processingId === payment.id ? 'Processing...' : 'Mark as Paid'}
                        </button>
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
  );
}
