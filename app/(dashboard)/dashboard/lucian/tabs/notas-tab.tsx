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
      {/* Filter */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Filtrar por loja..."
          value={filtroLoja}
          onChange={(e) => setFiltroLoja(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
          className="flex-1 rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
        />
        <button
          onClick={handleFilter}
          className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          Filtrar
        </button>
      </div>

      {/* Notas list */}
      {loading ? (
        <p className="py-8 text-center text-sm text-slate-500">Carregando...</p>
      ) : notas.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">Nenhuma nota encontrada.</p>
      ) : (
        <div className="space-y-3">
          {notas.map((nota) => (
            <div
              key={nota.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  {nota.storeName}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {new Date(nota.createdAt).toLocaleDateString('pt-BR')} · {nota.totalItens} itens
                </p>
              </div>
              <div className="ml-4 flex shrink-0 items-center gap-3">
                <p className="text-sm font-semibold text-slate-800">
                  R$ {nota.valorAPagar.toFixed(2)}
                </p>
                <button
                  onClick={() => handleDelete(nota.id)}
                  disabled={deleting === nota.id}
                  className="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-400 disabled:opacity-50"
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
              className="w-full rounded-2xl bg-slate-100 py-2.5 text-sm text-slate-500 transition-colors hover:bg-slate-200"
            >
              Carregar mais
            </button>
          )}
        </div>
      )}
    </div>
  );
}
