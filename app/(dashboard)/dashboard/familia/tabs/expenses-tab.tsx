'use client';

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
}

export function ExpensesTab({ expenses, balances }: ExpensesTabProps) {
  if (expenses.length === 0 && balances.settlements.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
        <p className="text-base text-slate-400">No expenses yet.</p>
        <p className="mt-1 text-sm text-slate-500">
          Use <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">log_expense</code> via MCP.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Balances */}
      {balances.settlements.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-lg font-semibold text-slate-800">Balances</h3>
          <div className="space-y-2">
            {balances.settlements.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
              >
                <span className="text-sm text-amber-800">
                  <span className="font-medium">{s.from}</span> owes <span className="font-medium">{s.to}</span>
                </span>
                <span className="text-base font-semibold text-amber-800">R${s.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {balances.settlements.length === 0 && expenses.length > 0 && (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-center">
          <p className="text-sm font-medium text-green-700">All settled!</p>
        </div>
      )}

      {/* Expense list */}
      <h3 className="mb-3 text-lg font-semibold text-slate-800">Expenses</h3>
      <div className="space-y-2">
        {expenses.map((exp) => (
          <div
            key={exp.id}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-500">
              $
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-medium text-slate-800">{exp.description}</p>
              <div className="mt-0.5 flex items-center gap-2 text-sm text-slate-400">
                {exp.paidByName && <span>Paid by {exp.paidByName}</span>}
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
              R${parseFloat(exp.amount).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
