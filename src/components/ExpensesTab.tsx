import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { analyzeExpenses } from '../services/geminiService';
import type { Trip, Expense } from '../types';

interface Props {
  trip: Trip;
  onUpdateTrip: (trip: Trip) => void;
}

const CATEGORIES = [
  { value: 'Food',          label: 'Food',          emoji: '🍽️' },
  { value: 'Transport',     label: 'Transport',     emoji: '🚕' },
  { value: 'Accommodation', label: 'Accommodation', emoji: '🏨' },
  { value: 'Activities',    label: 'Activities',    emoji: '🎡' },
  { value: 'Other',         label: 'Other',         emoji: '📦' },
];

const CHART_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#f87171', '#8b5cf6'];

function getCategoryEmoji(cat: string) {
  return CATEGORIES.find(c => c.value === cat)?.emoji ?? '📦';
}

function buildChartData(expenses: Expense[]) {
  const totals: Record<string, number> = {};
  for (const e of expenses) {
    totals[e.category] = (totals[e.category] ?? 0) + e.amount;
  }
  return Object.entries(totals).map(([name, value]) => ({ name, value }));
}

export default function ExpensesTab({ trip, onUpdateTrip }: Props) {
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    amount: '',
    category: 'Food',
    date: new Date().toISOString().slice(0, 10),
  });

  const totalSpent = trip.expenses.reduce((s, e) => s + e.amount, 0);
  const chartData = buildChartData(trip.expenses);

  async function handleAudit() {
    setAuditLoading(true);
    setAuditResult(null);
    try {
      const result = await analyzeExpenses(trip.expenses, trip.budget);
      setAuditResult(result);
    } finally {
      setAuditLoading(false);
    }
  }

  function handleAddExpense() {
    if (!form.title.trim() || !form.amount) return;
    const newExpense: Expense = {
      id: crypto.randomUUID(),
      title: form.title.trim(),
      amount: parseFloat(form.amount),
      currency: 'USD',
      category: form.category,
      date: form.date,
      payerId: trip.creatorId,
    };
    onUpdateTrip({ ...trip, expenses: [...trip.expenses, newExpense] });
    setForm({ title: '', amount: '', category: 'Food', date: new Date().toISOString().slice(0, 10) });
    setShowAddForm(false);
  }

  return (
    <div className="space-y-6">
      {/* ── AI Budget Analyst Card ── */}
      <div className="bg-slate-900 text-white rounded-[2.5rem] p-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-2xl font-black tracking-tight mb-1">⚡ Gemini Budget Analyst</h2>
            <p className="text-slate-400 text-sm mb-6">
              AI-powered insights to track your spending and uncover savings opportunities.
            </p>

            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Total Spent</p>
              <p className="text-5xl font-black text-amber-400">
                ${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <button
              onClick={handleAudit}
              disabled={auditLoading}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-white font-bold px-6 py-3 rounded-2xl transition-colors"
            >
              {auditLoading && (
                <span className="w-4 h-4 border-4 border-amber-500/20 border-t-white rounded-full animate-spin" />
              )}
              {auditLoading ? 'Analysing…' : 'Run AI Spend Audit'}
            </button>
          </div>
        </div>

        {auditResult && (
          <div className="mt-6 bg-white/5 rounded-2xl p-5 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
            {auditResult}
          </div>
        )}
      </div>

      {/* ── Bottom 2-col grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Donut Chart */}
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
          <h3 className="text-base font-black tracking-tight text-slate-800 mb-4">Spending by Category</h3>
          {chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <p className="italic text-slate-400">No spending data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="45%"
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    value != null
                      ? [`$${(value as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Spent']
                      : ['', 'Spent']
                  }
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Transaction List */}
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-black tracking-tight text-slate-800">Transactions</h3>
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
              >
                + Add Expense
              </button>
            )}
          </div>

          {/* Inline Add Form */}
          {showAddForm && (
            <div className="mb-4 bg-slate-50 rounded-2xl p-4 space-y-3">
              <input
                type="text"
                placeholder="Title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Amount"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>
                      {c.emoji} {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowAddForm(false); setForm({ title: '', amount: '', category: 'Food', date: new Date().toISOString().slice(0, 10) }); }}
                  className="text-sm text-slate-500 hover:text-slate-700 font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddExpense}
                  className="bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold px-5 py-2 rounded-xl transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto max-h-[450px] space-y-2 hide-scrollbar">
            {trip.expenses.length === 0 ? (
              <p className="italic text-slate-400 text-sm text-center py-8">No expenses recorded yet.</p>
            ) : (
              [...trip.expenses]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map(expense => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-2xl"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">{getCategoryEmoji(expense.category)}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{expense.title}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {expense.date}
                          {expense.payerId ? ` · ${expense.payerId.slice(0, 6)}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-slate-900 shrink-0 ml-4">
                      ${expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
