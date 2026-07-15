import React, { useState, useEffect } from 'react';
import { Target, Plus, TrendingUp, Calendar, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../api/client';

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: string;
  priority: string;
}

interface Recommendation {
  title: string;
  description: string;
  type: string;
}

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // AI Insights
  const [insights, setInsights] = useState<Recommendation[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // New Goal Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('MEDIUM');

  // Contribution Form
  const [contributingTo, setContributingTo] = useState<string | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');

  const fetchGoals = async () => {
    try {
      const data = await apiClient('/api/goals');
      setGoals(data);
    } catch (error) {
      console.error('Failed to fetch goals', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    setLoadingInsights(true);
    try {
      const data = await apiClient('/api/ai/recommendations');
      setInsights(data);
    } catch (error) {
      console.error('Failed to fetch AI insights', error);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/api/goals', {
        method: 'POST',
        body: JSON.stringify({
          name,
          targetAmount: parseFloat(targetAmount),
          targetDate,
          category,
          priority
        })
      });
      setShowAddForm(false);
      setName('');
      setTargetAmount('');
      setTargetDate('');
      setCategory('');
      setPriority('MEDIUM');
      fetchGoals();
    } catch (error) {
      console.error('Failed to create goal', error);
    }
  };

  const handleContribute = async (e: React.FormEvent, goalId: string) => {
    e.preventDefault();
    try {
      await apiClient(`/api/goals/${goalId}/contribute`, {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat(contributionAmount)
        })
      });
      setContributingTo(null);
      setContributionAmount('');
      fetchGoals();
    } catch (error) {
      console.error('Failed to contribute to goal', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Financial Goals</h2>
          <p className="text-muted-foreground">Track sinking funds for car service, insurance, home renovation, etc.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchInsights}
            disabled={loadingInsights}
            className="px-4 py-2 bg-purple-500/10 text-purple-500 font-medium rounded-xl hover:bg-purple-500/20 transition-colors flex items-center gap-2"
          >
            {loadingInsights ? 'Analyzing...' : <><Sparkles className="h-4 w-4" /> Get AI Insights</>}
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            {showAddForm ? 'Cancel' : <><Plus className="h-4 w-4" /> Create Goal</>}
          </button>
        </div>
      </div>

      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 animate-in slide-in-from-top-4">
          {insights.map((insight, idx) => (
            <div 
              key={idx} 
              className={`p-5 rounded-2xl border ${
                insight.type === 'REALLOCATION' ? 'bg-green-500/10 border-green-500/20' : 
                insight.type === 'WARNING' ? 'bg-amber-500/10 border-amber-500/20' : 
                'bg-blue-500/10 border-blue-500/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {insight.type === 'REALLOCATION' ? <CheckCircle2 className="h-5 w-5 text-green-500" /> :
                   insight.type === 'WARNING' ? <AlertCircle className="h-5 w-5 text-amber-500" /> :
                   <Sparkles className="h-5 w-5 text-blue-500" />}
                </div>
                <div>
                  <h4 className={`font-semibold ${
                    insight.type === 'REALLOCATION' ? 'text-green-600 dark:text-green-400' : 
                    insight.type === 'WARNING' ? 'text-amber-600 dark:text-amber-400' : 
                    'text-blue-600 dark:text-blue-400'
                  }`}>{insight.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{insight.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddForm && (
        <div className="glass-panel p-6 rounded-2xl border border-border/50 animate-in fade-in slide-in-from-top-4">
          <form onSubmit={handleCreateGoal} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Goal Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Car Insurance 2024"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Target Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="15000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Target Date</label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Priority</label>
              <select
                required
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="HIGH">High Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="LOW">Low Priority</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2 bg-primary text-primary-foreground font-medium rounded-xl hover:opacity-90 transition-opacity"
              >
                Save Goal
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center text-muted-foreground py-10">Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="glass-panel p-10 rounded-2xl border border-border/50 text-center flex flex-col items-center">
          <Target className="h-16 w-16 text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No Goals Yet</h3>
          <p className="text-muted-foreground max-w-md">Start tracking your sinking funds and small goals like buying a new phone, paying annual car insurance, or home renovations.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map(goal => {
            const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
            const isCompleted = progress >= 100;

            return (
              <div key={goal.id} className="glass-panel p-6 rounded-2xl border border-border/50 flex flex-col hover:border-primary/30 transition-colors relative overflow-hidden">
                <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-bold rounded-bl-xl ${
                  goal.priority === 'HIGH' ? 'bg-red-500/20 text-red-500' :
                  goal.priority === 'MEDIUM' ? 'bg-amber-500/20 text-amber-500' :
                  'bg-blue-500/20 text-blue-500'
                }`}>
                  {goal.priority}
                </div>
                
                <div className="flex justify-between items-start mb-4 mt-2">
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">{goal.name}</h3>
                    <div className="flex items-center text-xs text-muted-foreground mt-1 gap-1">
                      <Calendar className="h-3 w-3" />
                      Target: {new Date(goal.targetDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className={`p-2 rounded-lg ${isCompleted ? 'bg-green-500/20 text-green-500' : 'bg-primary/10 text-primary'}`}>
                    <Target className="h-5 w-5" />
                  </div>
                </div>

                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      ₹{goal.currentAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">of ₹{goal.targetAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-secondary/50 rounded-full h-2.5 mb-2 overflow-hidden">
                  <div 
                    className={`h-2.5 rounded-full transition-all duration-1000 ${isCompleted ? 'bg-green-500' : 'bg-primary'}`}
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="text-right mb-6">
                  <p className="text-xs font-medium text-foreground">{progress.toFixed(1)}% Completed</p>
                </div>

                <div className="mt-auto">
                  {contributingTo === goal.id ? (
                    <form onSubmit={(e) => handleContribute(e, goal.id)} className="flex gap-2 animate-in fade-in">
                      <input
                        type="number"
                        step="0.01"
                        required
                        autoFocus
                        value={contributionAmount}
                        onChange={(e) => setContributionAmount(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm bg-background/50 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="Amount"
                      />
                      <button type="submit" className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90">
                        Add
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { setContributingTo(null); setContributionAmount(''); }}
                        className="px-3 py-1.5 text-sm bg-muted text-muted-foreground rounded-lg hover:bg-muted/80"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <button
                      onClick={() => setContributingTo(goal.id)}
                      disabled={isCompleted}
                      className={`w-full py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-opacity ${
                        isCompleted 
                          ? 'bg-green-500/10 text-green-500 cursor-default' 
                          : 'bg-primary/10 text-primary hover:bg-primary/20'
                      }`}
                    >
                      {isCompleted ? (
                        'Goal Achieved! 🎉'
                      ) : (
                        <><TrendingUp className="h-4 w-4" /> Add Funds</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
