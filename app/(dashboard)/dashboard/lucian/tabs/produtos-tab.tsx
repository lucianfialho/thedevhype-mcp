'use client';

import { useState } from 'react';
import { getProdutosWithPrices, classificarProduto } from '../actions';
import { TabSelect } from '../../components/ui';

interface ProdutoRow {
  id: number;
  codigo: string;
  nome: string;
  unidade: string | null;
  categoria: string | null;
  storeId: number;
  storeName: string;
  minPrice: number | null;
  maxPrice: number | null;
  avgPrice: number | null;
  entryCount: number;
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
    const data = await getProdutosWithPrices(categoriaFiltro || undefined, busca || undefined, limit);
    setProdutos(data);
    setLoading(false);
  }

  async function handleLoadMore() {
    const newLimit = limit + 50;
    setLimit(newLimit);
    setLoading(true);
    const data = await getProdutosWithPrices(categoriaFiltro || undefined, busca || undefined, newLimit);
    setProdutos(data);
    setLoading(false);
  }

  async function handleSaveCategoria(produtoId: number) {
    await classificarProduto(produtoId, editValue);
    setProdutos((prev) =>
      prev.map((p) => (p.id === produtoId ? { ...p, categoria: editValue } : p)),
    );
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
      {/* Filters */}
      <div className="mb-4 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search product..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
            className="min-w-0 flex-1 rounded-xl border-0 bg-slate-100 px-4 py-3 text-base text-slate-800 outline-none placeholder:text-slate-400"
          />
          <button
            onClick={handleFilter}
            className="shrink-0 rounded-xl bg-slate-800 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-slate-700"
          >
            Search
          </button>
        </div>
        <TabSelect
          options={[
            { id: '', label: 'All categories' },
            ...summaryState.categorias.map((cat) => ({ id: cat, label: cat })),
          ]}
          value={categoriaFiltro}
          onChange={setCategoriaFiltro}
          fullWidth
        />
      </div>

      {/* Products list */}
      {loading ? (
        <p className="py-8 text-center text-base text-slate-500">Loading...</p>
      ) : produtos.length === 0 ? (
        <p className="py-8 text-center text-base text-slate-500">No products found.</p>
      ) : (
        <div className="space-y-2">
          {produtos.map((produto) => (
            <div
              key={produto.id}
              className="rounded-2xl border border-slate-200 px-4 py-3.5"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium text-slate-800">
                    {produto.nome}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {produto.storeName}
                  </p>
                </div>
                <div className="ml-3 shrink-0">
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
                        placeholder="Category"
                        className="w-28 rounded-xl border-0 bg-slate-100 px-2 py-1.5 text-sm text-slate-800 outline-none"
                      />
                      <button
                        onClick={() => handleSaveCategoria(produto.id)}
                        className="rounded bg-slate-800 px-2 py-1 text-sm text-white"
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
                      className={`rounded-full px-2.5 py-0.5 text-sm font-medium ${
                        produto.categoria
                          ? 'bg-slate-100 text-slate-600'
                          : 'border border-dashed border-slate-300 text-slate-500'
                      }`}
                    >
                      {produto.categoria || '+ category'}
                    </button>
                  )}
                </div>
              </div>

              {/* Inline price data */}
              {produto.entryCount > 0 && (
                <div className="mt-2 flex items-center gap-3">
                  <span className="flex items-center gap-1 text-sm">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#16a34a" strokeWidth="2"><path d="M8 12V4M5 7l3-3 3 3" /></svg>
                    <span className="font-medium text-green-400">R$ {produto.minPrice!.toFixed(2)}</span>
                  </span>
                  <span className="flex items-center gap-1 text-sm">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#dc2626" strokeWidth="2"><path d="M8 4v8M5 9l3 3 3-3" /></svg>
                    <span className="font-medium text-red-400">R$ {produto.maxPrice!.toFixed(2)}</span>
                  </span>
                  <span className="flex items-center gap-1 text-sm">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500"><path d="M3 8h10" /></svg>
                    <span className="font-medium text-slate-600">R$ {produto.avgPrice!.toFixed(2)}</span>
                  </span>
                  <span className="text-sm text-slate-500">
                    {produto.entryCount}x
                  </span>
                </div>
              )}
            </div>
          ))}

          {produtos.length >= limit && (
            <button
              onClick={handleLoadMore}
              className="w-full rounded-2xl bg-slate-100 py-2.5 text-base text-slate-500 transition-colors hover:bg-slate-200"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
