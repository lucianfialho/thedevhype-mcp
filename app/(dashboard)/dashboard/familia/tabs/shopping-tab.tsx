'use client';

interface ShoppingItemInfo {
  id: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  checked: boolean;
  notes: string | null;
  addedByName: string | null;
}

interface ShoppingTabProps {
  shopping: {
    list: { id: number; name: string } | null;
    items: ShoppingItemInfo[];
  };
}

export function ShoppingTab({ shopping }: ShoppingTabProps) {
  if (!shopping.list) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
        <p className="text-base text-slate-400">No shopping list yet.</p>
        <p className="mt-1 text-sm text-slate-500">
          Use <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">add_shopping_item</code> via MCP to start.
        </p>
      </div>
    );
  }

  const pending = shopping.items.filter((i) => !i.checked);
  const checked = shopping.items.filter((i) => i.checked);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">{shopping.list.name}</h3>
        <span className="text-sm text-slate-500">
          {pending.length} pending, {checked.length} done
        </span>
      </div>

      {pending.length > 0 && (
        <div className="space-y-2">
          {pending.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-slate-300" />
              <div className="min-w-0 flex-1">
                <p className="text-base text-slate-800">
                  {item.name}
                  {item.quantity && item.quantity > 1 && (
                    <span className="ml-1 text-sm text-slate-500">
                      x{item.quantity}{item.unit ? ` ${item.unit}` : ''}
                    </span>
                  )}
                </p>
                {item.notes && (
                  <p className="mt-0.5 text-sm text-slate-400">{item.notes}</p>
                )}
              </div>
              {item.addedByName && (
                <span className="shrink-0 text-sm text-slate-400">{item.addedByName}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {checked.length > 0 && (
        <>
          <h4 className="mb-2 mt-6 text-sm font-medium text-slate-500">Checked off</h4>
          <div className="space-y-2">
            {checked.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 opacity-60"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-slate-300 bg-slate-200">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
                    <path d="M3 8l4 4 6-6" />
                  </svg>
                </div>
                <p className="text-base text-slate-500 line-through">{item.name}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
