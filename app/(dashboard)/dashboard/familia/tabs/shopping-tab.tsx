'use client';

import { useState } from 'react';
import { addShoppingItem, toggleShoppingItem, deleteShoppingItem } from '../actions';

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
  familyId: number;
  onShoppingChange: (items: ShoppingItemInfo[], list?: { id: number; name: string } | null) => void;
}

export function ShoppingTab({ shopping, familyId, onShoppingChange }: ShoppingTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError('');
    const res = await addShoppingItem(
      familyId,
      name.trim(),
      quantity ? parseInt(quantity, 10) : undefined,
      unit.trim() || undefined,
      itemNotes.trim() || undefined,
    );
    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      const newItem: ShoppingItemInfo = {
        id: res.data.id,
        name: res.data.name,
        quantity: res.data.quantity,
        unit: res.data.unit,
        checked: false,
        notes: res.data.notes,
        addedByName: 'Você',
      };
      onShoppingChange([newItem, ...shopping.items]);
      if (!shopping.list) {
        onShoppingChange([newItem, ...shopping.items], { id: 0, name: 'Lista de Compras' });
      }
      setName('');
      setQuantity('');
      setUnit('');
      setItemNotes('');
      setShowForm(false);
    }
    setSubmitting(false);
  }

  function handleDelete(item: ShoppingItemInfo, e: React.MouseEvent) {
    e.stopPropagation();
    onShoppingChange(shopping.items.filter((i) => i.id !== item.id));
    deleteShoppingItem(familyId, item.id);
  }

  async function handleToggle(item: ShoppingItemInfo) {
    const newChecked = !item.checked;
    // Optimistic update
    const updated = shopping.items.map((i) =>
      i.id === item.id ? { ...i, checked: newChecked } : i,
    );
    onShoppingChange(updated);
    // Fire and forget
    toggleShoppingItem(familyId, item.id, newChecked);
  }

  const items = shopping.items;
  const pending = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">
          {shopping.list?.name || 'Lista de Compras'}
        </h3>
        <div className="flex items-center gap-3">
          {items.length > 0 && (
            <span className="text-sm text-slate-500">
              {pending.length} pendente{pending.length !== 1 ? 's' : ''}, {checked.length} feito{checked.length !== 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200"
          >
            {showForm ? 'Cancelar' : '+ Adicionar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="mb-4 space-y-2 rounded-2xl border border-slate-200 p-4">
          <input
            type="text"
            placeholder="Nome do item"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            required
            autoFocus
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Qtd"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-20 rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
              min="1"
            />
            <input
              type="text"
              placeholder="Unidade (kg, un...)"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="flex-1 rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <input
            type="text"
            placeholder="Observações (opcional)"
            value={itemNotes}
            onChange={(e) => setItemNotes(e.target.value)}
            className="w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            {submitting ? 'Adicionando...' : 'Adicionar item'}
          </button>
        </form>
      )}

      {items.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
          <p className="text-base text-slate-400">Nenhum item na lista.</p>
          <p className="mt-1 text-sm text-slate-500">
            Clique em &quot;+ Adicionar&quot; para começar.
          </p>
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-2">
          {pending.map((item) => (
            <div
              key={item.id}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 transition-colors hover:border-slate-300"
            >
              <button
                onClick={() => handleToggle(item)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-slate-300"
              />
              <button
                onClick={() => handleToggle(item)}
                className="min-w-0 flex-1 text-left"
              >
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
              </button>
              {item.addedByName && (
                <span className="shrink-0 text-sm text-slate-400">{item.addedByName}</span>
              )}
              <button
                onClick={(e) => handleDelete(item, e)}
                className="shrink-0 text-slate-400 transition-colors hover:text-red-500"
                title="Excluir item"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {checked.length > 0 && (
        <>
          <h4 className="mb-2 mt-6 text-sm font-medium text-slate-500">Comprados</h4>
          <div className="space-y-2">
            {checked.map((item) => (
              <div
                key={item.id}
                className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 opacity-60 transition-colors hover:opacity-80"
              >
                <button
                  onClick={() => handleToggle(item)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-slate-300 bg-slate-200"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
                    <path d="M3 8l4 4 6-6" />
                  </svg>
                </button>
                <p className="min-w-0 flex-1 text-base text-slate-500 line-through">{item.name}</p>
                <button
                  onClick={(e) => handleDelete(item, e)}
                  className="shrink-0 text-slate-400 transition-colors hover:text-red-500"
                  title="Excluir item"
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
