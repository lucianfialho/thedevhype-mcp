'use client';

import { useState } from 'react';
import { getNotas, deleteNota } from '../actions';

interface NotaRow {
  id: number;
  storeName: string;
  cnpj: string;
  totalItens: number;
  valorAPagar: number;
  createdAt: string;
}

interface NotasSummary {
  totalNotas: number;
  totalValor: number;
  totalLojas: number;
}

interface NotasTabProps {
  initialNotas: NotaRow[];
  summary: NotasSummary;
  onSummaryChange?: () => void;
}

export function NotasTab({ initialNotas, summary, onSummaryChange }: NotasTabProps) {
  const [notas, setNotas] = useState(initialNotas);
  const [filtroLoja, setFiltroLoja] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [limit, setLimit] = useState(20);

  async function handleFilter() {
    setLoading(true);
    const data = await getNotas(filtroLoja || undefined, limit);
    setNotas(data);
    setLoading(false);
  }

  async function handleDelete(notaId: number) {
    if (!confirm('Excluir esta nota e todos os precos associados?')) return;
    setDeleting(notaId);
    await deleteNota(notaId);
    setNotas((prev) => prev.filter((n) => n.id !== notaId));
    setDeleting(null);
    onSummaryChange?.();
  }

  async function handleLoadMore() {
    const newLimit = limit + 20;
    setLimit(newLimit);
    setLoading(true);
    const data = await getNotas(filtroLoja || undefined, newLimit);
    setNotas(data);
    setLoading(false);
  }

  return (
    <div>
      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-400">Total notas</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {summary.totalNotas}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-400">Total gasto</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            R$ {summary.totalValor.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-400">Lojas</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {summary.totalLojas}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Filtrar por loja..."
          value={filtroLoja}
          onChange={(e) => setFiltroLoja(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
          className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <button
          onClick={handleFilter}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Filtrar
        </button>
      </div>

      {/* Notas list */}
      {loading ? (
        <p className="py-8 text-center text-sm text-zinc-400">Carregando...</p>
      ) : notas.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-400">Nenhuma nota encontrada.</p>
      ) : (
        <div className="space-y-2">
          {notas.map((nota) => (
            <div
              key={nota.id}
              className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {nota.storeName}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {new Date(nota.createdAt).toLocaleDateString('pt-BR')} · {nota.totalItens} itens
                </p>
              </div>
              <div className="ml-4 flex shrink-0 items-center gap-3">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  R$ {nota.valorAPagar.toFixed(2)}
                </p>
                <button
                  onClick={() => handleDelete(nota.id)}
                  disabled={deleting === nota.id}
                  className="rounded p-1 text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:text-zinc-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                  title="Excluir nota"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4m2 0v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4h9.34z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {notas.length >= limit && (
            <button
              onClick={handleLoadMore}
              className="w-full rounded-lg border border-zinc-200 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              Carregar mais
            </button>
          )}
        </div>
      )}
    </div>
  );
}
