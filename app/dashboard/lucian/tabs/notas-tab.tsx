'use client';

import { useState } from 'react';
import { getNotas } from '../actions';

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
}

export function NotasTab({ initialNotas, summary }: NotasTabProps) {
  const [notas, setNotas] = useState(initialNotas);
  const [filtroLoja, setFiltroLoja] = useState('');
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(20);

  async function handleFilter() {
    setLoading(true);
    const data = await getNotas(filtroLoja || undefined, limit);
    setNotas(data);
    setLoading(false);
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
              <div className="ml-4 shrink-0 text-right">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  R$ {nota.valorAPagar.toFixed(2)}
                </p>
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
