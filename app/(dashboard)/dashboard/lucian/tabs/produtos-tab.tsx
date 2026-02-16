'use client';

import { useState } from 'react';
import { getProdutos, classificarProduto } from '../actions';

interface ProdutoRow {
  id: number;
  codigo: string;
  nome: string;
  unidade: string | null;
  categoria: string | null;
  storeId: number;
  storeName: string;
}

interface ProdutosSummary {
  total: number;
  comCategoria: number;
  semCategoria: number;
  categorias: string[];
}

interface ProdutosTabProps {
  initialProdutos: ProdutoRow[];
  summary: ProdutosSummary;
}

export function ProdutosTab({ initialProdutos, summary }: ProdutosTabProps) {
  const [produtos, setProdutos] = useState(initialProdutos);
  const [summaryState, setSummaryState] = useState(summary);
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(50);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  async function handleFilter() {
    setLoading(true);
    const data = await getProdutos(categoriaFiltro || undefined, busca || undefined, limit);
    setProdutos(data);
    setLoading(false);
  }

  async function handleLoadMore() {
    const newLimit = limit + 50;
    setLimit(newLimit);
    setLoading(true);
    const data = await getProdutos(categoriaFiltro || undefined, busca || undefined, newLimit);
    setProdutos(data);
    setLoading(false);
  }

  async function handleSaveCategoria(produtoId: number) {
    await classificarProduto(produtoId, editValue);
    setProdutos((prev) =>
      prev.map((p) => (p.id === produtoId ? { ...p, categoria: editValue } : p)),
    );
    // Update summary counts
    const wasUncategorized = produtos.find((p) => p.id === produtoId)?.categoria === null;
    if (wasUncategorized && editValue) {
      setSummaryState((prev) => ({
        ...prev,
        comCategoria: prev.comCategoria + 1,
        semCategoria: prev.semCategoria - 1,
        categorias: prev.categorias.includes(editValue)
          ? prev.categorias
          : [...prev.categorias, editValue].sort(),
      }));
    }
    setEditingId(null);
    setEditValue('');
  }

  return (
    <div>
      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-400">Total produtos</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {summaryState.total}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-400">Com categoria</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {summaryState.comCategoria}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-400">Sem categoria</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {summaryState.semCategoria}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Buscar produto..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
          className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <select
          value={categoriaFiltro}
          onChange={(e) => {
            setCategoriaFiltro(e.target.value);
          }}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <option value="">Todas categorias</option>
          {summaryState.categorias.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <button
          onClick={handleFilter}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Buscar
        </button>
      </div>

      {/* Products list */}
      {loading ? (
        <p className="py-8 text-center text-sm text-zinc-400">Carregando...</p>
      ) : produtos.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-400">Nenhum produto encontrado.</p>
      ) : (
        <div className="space-y-2">
          {produtos.map((produto) => (
            <div
              key={produto.id}
              className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {produto.nome}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {produto.codigo} · {produto.storeName}
                </p>
              </div>
              <div className="ml-4 shrink-0">
                {editingId === produto.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveCategoria(produto.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                      placeholder="Categoria"
                      className="w-28 rounded border border-zinc-300 px-2 py-1 text-xs outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <button
                      onClick={() => handleSaveCategoria(produto.id)}
                      className="rounded bg-zinc-900 px-2 py-1 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingId(produto.id);
                      setEditValue(produto.categoria || '');
                    }}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      produto.categoria
                        ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                        : 'border border-dashed border-zinc-300 text-zinc-400 dark:border-zinc-600'
                    }`}
                  >
                    {produto.categoria || '+ categoria'}
                  </button>
                )}
              </div>
            </div>
          ))}

          {produtos.length >= limit && (
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
