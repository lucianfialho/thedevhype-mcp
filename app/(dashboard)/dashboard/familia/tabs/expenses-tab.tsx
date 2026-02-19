'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addExpense, deleteExpense } from '../actions';

function formatBRL(value: string | number) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function MoneyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

interface ExpenseInfo {
  id: number;
  description: string;
  amount: string;
  category: string | null;
  date: string;
  splitType: string;
  paidByName: string | null;
  createdAt: string;
}

interface ExpensesTabProps {
  expenses: ExpenseInfo[];
  balances: {
    settlements: Array<{ from: string; to: string; amount: string }>;
    summary: string;
  };
  familyId: number;
  onExpensesChange: (expenses: ExpenseInfo[]) => void;
}

export function ExpensesTab({ expenses, balances, familyId, onExpensesChange }: ExpensesTabProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [splitType, setSplitType] = useState('equal');
  const [expenseDate, setExpenseDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || !amount) return;
    setSubmitting(true);
    setError('');
    const res = await addExpense(
      familyId,
      description.trim(),
      parseFloat(amount),
      category.trim() || undefined,
      splitType,
      expenseDate || undefined,
    );
    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      const newExpense: ExpenseInfo = {
        id: res.data.id,
        description: res.data.description,
        amount: res.data.amount,
        category: res.data.category,
        date: res.data.date,
        splitType: res.data.splitType,
        paidByName: 'Você',
        createdAt: res.data.createdAt,
      };
      onExpensesChange([newExpense, ...expenses]);
      setDescription('');
      setAmount('');
      setCategory('');
      setSplitType('equal');
      setExpenseDate('');
      setShowForm(false);
      // Refresh to recalculate balances server-side
      router.refresh();
    }
    setSubmitting(false);
  }

  function handleDelete(exp: ExpenseInfo) {
    onExpensesChange(expenses.filter((e) => e.id !== exp.id));
    deleteExpense(familyId, exp.id);
    router.refresh(); // recalculate balances
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Despesas</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200"
        >
          {showForm ? 'Cancelar' : '+ Registrar'}
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="mb-4 space-y-2 rounded-2xl border border-slate-200 p-4">
          <input
            type="text"
            placeholder="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            required
            autoFocus
          />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
              <input
                type="number"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border-0 bg-slate-100 py-3 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                step="0.01"
                min="0.01"
                required
              />
            </div>
            <input
              type="text"
              placeholder="Categoria"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-36 rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={splitType}
              onChange={(e) => setSplitType(e.target.value)}
              className="flex-1 rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="equal">Dividir igualmente</option>
              <option value="custom">Personalizado</option>
            </select>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="flex-1 rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !description.trim() || !amount}
            className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            {submitting ? 'Registrando...' : 'Registrar despesa'}
          </button>
        </form>
      )}

      {expenses.length === 0 && balances.settlements.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
          <p className="text-base text-slate-400">Nenhuma despesa ainda.</p>
          <p className="mt-1 text-sm text-slate-500">
            Clique em &quot;+ Registrar&quot; para começar.
          </p>
        </div>
      )}

      {/* Balances */}
      {balances.settlements.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-3 text-base font-semibold text-slate-800">Saldo</h4>
          <div className="space-y-2">
            {balances.settlements.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
              >
                <span className="text-sm text-amber-800">
                  <span className="font-medium">{s.from}</span> deve para <span className="font-medium">{s.to}</span>
                </span>
                <span className="text-base font-semibold text-amber-800">{formatBRL(s.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {balances.settlements.length === 0 && expenses.length > 0 && (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-center">
          <p className="text-sm font-medium text-green-700">Tudo acertado!</p>
        </div>
      )}

      {/* Expense list */}
      {expenses.length > 0 && (
        <>
          <h4 className="mb-3 text-base font-semibold text-slate-800">Histórico</h4>
          <div className="space-y-2">
            {expenses.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  <MoneyIcon />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium text-slate-800">{exp.description}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-sm text-slate-400">
                    {exp.paidByName && <span>Pago por {exp.paidByName}</span>}
                    {exp.category && (
                      <>
                        <span>-</span>
                        <span>{exp.category}</span>
                      </>
                    )}
                    <span>{exp.date}</span>
                  </div>
                </div>
                <span className="shrink-0 text-base font-semibold text-slate-800">
                  {formatBRL(exp.amount)}
                </span>
                <button
                  onClick={() => handleDelete(exp)}
                  className="shrink-0 text-slate-400 transition-colors hover:text-red-500"
                  title="Excluir despesa"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
