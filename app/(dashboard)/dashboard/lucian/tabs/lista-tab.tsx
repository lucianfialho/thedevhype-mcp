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
  const progress = summary.totalItems > 0 ? (summary.checkedItems / summary.totalItems) * 100 : 0;

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
    if (!confirm('Finalize shopping list? The list will be archived and a new one will be created.'))
      return;

    setFinalizing(true);
    await finalizeList();
    setItems([]);
    setSummary({ totalItems: 0, checkedItems: 0, estimatedTotal: 0 });
    setFinalizing(false);
  }

  return (
    <div>
      {/* Progress + summary */}
      {summary.totalItems > 0 && (
        <div className="mb-4 rounded-2xl border border-slate-200 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-slate-400">
              {summary.checkedItems}/{summary.totalItems} items
            </span>
            {summary.estimatedTotal > 0 && (
              <span className="text-sm text-slate-500">
                ~R$ {summary.estimatedTotal.toFixed(2)}
              </span>
            )}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-800 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Add item input */}
      <div className="mb-5 flex gap-2">
        <input
          type="text"
          placeholder="Add item (e.g. sugar, 2kg chicken)..."
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !adding && handleAddItem()}
          disabled={adding}
          className="min-w-0 flex-1 rounded-xl border-0 bg-slate-100 px-4 py-3 text-base text-slate-800 outline-none placeholder:text-slate-400"
        />
        <button
          onClick={handleAddItem}
          disabled={adding || !newItemName.trim()}
          className="shrink-0 rounded-xl bg-slate-800 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
        >
          {adding ? '...' : 'Add'}
        </button>
      </div>

      {/* Pending items */}
      {pending.length > 0 && (
        <div className="mb-5 space-y-1.5">
          {pending.map((item) => (
            <div
              key={item.id}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50"
            >
              <button
                onClick={() => handleToggle(item.id, item.checked)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 transition-colors hover:border-slate-400"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base text-slate-800">
                  {item.name}
                </p>
                {(item.quantity || item.estimatedPrice || item.cheapestStore) && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                    {item.quantity && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
                        {item.quantity} {item.unit || ''}
                      </span>
                    )}
                    {item.estimatedPrice && (
                      <span>~R$ {item.estimatedPrice}</span>
                    )}
                    {item.cheapestStore && (
                      <span>{item.cheapestStore}</span>
                    )}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="rounded-lg p-1.5 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-400 group-hover:opacity-100"
                title="Remove item"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Checked items */}
      {checked.length > 0 && (
        <div className="mb-4">
          <button
            className="mb-1 flex w-full items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-500"
            onClick={() => {}}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 6l3 3 5-5" />
            </svg>
            Purchased ({checked.length})
          </button>
          <div className="space-y-0.5">
            {checked.map((item) => (
              <div
                key={item.id}
                className="group flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-slate-50"
              >
                <button
                  onClick={() => handleToggle(item.id, item.checked)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-400 bg-slate-800 text-white transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M2.5 6l2.5 2.5 4.5-4.5" />
                  </svg>
                </button>
                <p className="min-w-0 flex-1 truncate text-base text-slate-500 line-through">
                  {item.name}
                </p>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="rounded-lg p-1.5 text-slate-400 opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
                  title="Remove item"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-slate-400">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-base text-slate-400">Empty list</p>
          <p className="mt-1 text-sm text-slate-500">
            Add items above or use the MCP
          </p>
        </div>
      )}

      {/* Finalize button */}
      {checked.length > 0 && (
        <button
          onClick={handleFinalize}
          disabled={finalizing}
          className="w-full rounded-2xl bg-slate-800 py-3 text-base font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
        >
          {finalizing ? 'Finalizing...' : 'Finalize shopping'}
        </button>
      )}
    </div>
  );
}
