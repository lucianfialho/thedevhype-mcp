'use client';

import { useState, useTransition } from 'react';
import {
  toggleItemChecked,
  removeListItem,
  finalizeList,
  addItemToList,
} from '../actions';

interface ListItem {
  id: number;
  name: string;
  quantity: string | null;
  unit: string | null;
  estimatedPrice: string | null;
  cheapestStore: string | null;
  checked: boolean;
  notes: string | null;
  createdAt: string;
}

interface ListSummary {
  totalItems: number;
  checkedItems: number;
  estimatedTotal: number;
}

interface ListaTabProps {
  initialItems: ListItem[];
  initialSummary: ListSummary;
}

export function ListaTab({ initialItems, initialSummary }: ListaTabProps) {
  const [items, setItems] = useState(initialItems);
  const [summary, setSummary] = useState(initialSummary);
  const [newItemName, setNewItemName] = useState('');
  const [adding, setAdding] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const pending = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  async function handleAddItem() {
    const name = newItemName.trim();
    if (!name) return;

    setAdding(true);
    setNewItemName('');

    try {
      const item = await addItemToList(name);
      setItems((prev) => [...prev.filter((i) => !i.checked), item, ...prev.filter((i) => i.checked)]);
      setSummary((prev) => ({
        ...prev,
        totalItems: prev.totalItems + 1,
        estimatedTotal:
          item.estimatedPrice && item.quantity
            ? prev.estimatedTotal + Number(item.estimatedPrice) * Number(item.quantity)
            : prev.estimatedTotal,
      }));
    } finally {
      setAdding(false);
    }
  }

  function handleToggle(itemId: number, currentChecked: boolean) {
    const newChecked = !currentChecked;
    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, checked: newChecked } : i)),
    );
    setSummary((prev) => ({
      ...prev,
      checkedItems: newChecked ? prev.checkedItems + 1 : prev.checkedItems - 1,
    }));

    startTransition(async () => {
      await toggleItemChecked(itemId, newChecked);
    });
  }

  function handleDelete(itemId: number) {
    const item = items.find((i) => i.id === itemId);
    // Optimistic update
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    setSummary((prev) => ({
      ...prev,
      totalItems: prev.totalItems - 1,
      checkedItems: item?.checked ? prev.checkedItems - 1 : prev.checkedItems,
    }));

    startTransition(async () => {
      await removeListItem(itemId);
    });
  }

  async function handleFinalize() {
    if (!confirm('Finalizar lista de compras? A lista será arquivada e uma nova será criada.'))
      return;

    setFinalizing(true);
    await finalizeList();
    setItems([]);
    setSummary({ totalItems: 0, checkedItems: 0, estimatedTotal: 0 });
    setFinalizing(false);
  }

  return (
    <div>
      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-400">Total itens</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {summary.totalItems}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-400">Comprados</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {summary.checkedItems}/{summary.totalItems}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-400">Total estimado</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            R$ {summary.estimatedTotal.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Add item input */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Adicionar item (ex: açúcar, 2kg de frango)..."
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !adding && handleAddItem()}
          disabled={adding}
          className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <button
          onClick={handleAddItem}
          disabled={adding || !newItemName.trim()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {adding ? '...' : 'Adicionar'}
        </button>
      </div>

      {/* Pending items */}
      {pending.length > 0 && (
        <div className="mb-4 space-y-2">
          {pending.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
            >
              <button
                onClick={() => handleToggle(item.id, item.checked)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-zinc-300 transition-colors hover:border-zinc-500 dark:border-zinc-600"
              >
                {item.checked && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 6l3 3 5-5" />
                  </svg>
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {item.name}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {item.quantity && `${item.quantity} ${item.unit || ''}`.trim()}
                  {item.estimatedPrice && ` · ~R$ ${item.estimatedPrice}`}
                  {item.cheapestStore && ` · ${item.cheapestStore}`}
                </p>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="rounded p-1 text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-zinc-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                title="Remover item"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4m2 0v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4h9.34z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Checked items */}
      {checked.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-zinc-400">
            Comprados ({checked.length})
          </p>
          <div className="space-y-1">
            {checked.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-100 px-4 py-2 opacity-60 dark:border-zinc-800/50"
              >
                <button
                  onClick={() => handleToggle(item.id, item.checked)}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-zinc-300 bg-zinc-100 text-zinc-500 transition-colors dark:border-zinc-600 dark:bg-zinc-800"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 6l3 3 5-5" />
                  </svg>
                </button>
                <p className="min-w-0 flex-1 truncate text-sm text-zinc-400 line-through">
                  {item.name}
                  {item.quantity && ` — ${item.quantity} ${item.unit || ''}`.trim()}
                </p>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="rounded p-1 text-zinc-200 transition-colors hover:text-red-400 dark:text-zinc-700 dark:hover:text-red-400"
                  title="Remover item"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4m2 0v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4h9.34z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <p className="py-8 text-center text-sm text-zinc-400">
          Lista vazia. Adicione itens acima ou use o MCP: "acabou o açúcar".
        </p>
      )}

      {/* Finalize button */}
      {items.length > 0 && (
        <button
          onClick={handleFinalize}
          disabled={finalizing}
          className="mt-4 w-full rounded-lg border border-zinc-200 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          {finalizing ? 'Finalizando...' : 'Finalizar compras'}
        </button>
      )}
    </div>
  );
}
