'use client';

import { useState } from 'react';
import { getPrecos } from '../actions';
import { TabSelect } from '../../components/ui';

type Period = '7' | '30' | '90' | '365';

const PERIOD_OPTIONS = [
  { id: '7', label: '7 days' },
  { id: '30', label: '30 days' },
  { id: '90', label: '90 days' },
  { id: '365', label: '1 year' },
] as const;

interface ProdutoPreco {
  produtoNome: string;
  min: number;
  max: number;
  avg: number;
  entries: Array<{ storeName: string; valorUnitario: string; dataCompra: string }>;
}

interface PrecosTabProps {
  initialPrecos: ProdutoPreco[];
}

export function PrecosTab({ initialPrecos }: PrecosTabProps) {
  const [busca, setBusca] = useState('');
  const [period, setPeriod] = useState<Period>('90');
  const [resultados, setResultados] = useState<ProdutoPreco[]>(initialPrecos);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(initialPrecos.length > 0);

  async function handleSearch() {
    if (!busca.trim()) return;
    setLoading(true);
    setSearched(true);
    const data = await getPrecos(busca, Number(period));
    setResultados(data);
    setLoading(false);
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-4 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search product to compare prices..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-800 outline-none placeholder:text-slate-400"
          />
          <button
            onClick={handleSearch}
            className="shrink-0 rounded-xl bg-slate-800 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-slate-700"
          >
            Search
          </button>
        </div>
        <TabSelect
          options={PERIOD_OPTIONS}
          value={period}
          onChange={(id) => setPeriod(id as Period)}
          fullWidth
        />
      </div>

      {loading ? (
        <p className="py-8 text-center text-base text-slate-500">Loading...</p>
      ) : !searched ? (
        <p className="py-12 text-center text-base text-slate-500">
          Search for a product to see price history.
        </p>
      ) : resultados.length === 0 ? (
        <p className="py-8 text-center text-base text-slate-500">No results found.</p>
      ) : (
        <div className="space-y-3">
          {resultados.map((produto) => (
            <div
              key={produto.produtoNome}
              className="rounded-2xl border border-slate-200 px-4 py-4"
            >
              <p className="text-base font-medium text-slate-800">
                {produto.produtoNome}
              </p>
              <div className="mt-2 flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-sm text-slate-400">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#16a34a" strokeWidth="2"><path d="M8 12V4M5 7l3-3 3 3" /></svg>
                  <strong className="text-base text-green-600">R$ {produto.min.toFixed(2)}</strong>
                </span>
                <span className="flex items-center gap-1.5 text-sm text-slate-400">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#dc2626" strokeWidth="2"><path d="M8 4v8M5 9l3 3 3-3" /></svg>
                  <strong className="text-base text-red-600">R$ {produto.max.toFixed(2)}</strong>
                </span>
                <span className="flex items-center gap-1.5 text-sm text-slate-400">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8h10" /></svg>
                  <strong className="text-base text-slate-800">R$ {produto.avg.toFixed(2)}</strong>
                </span>
              </div>
              <p className="mt-1.5 text-sm text-slate-500">
                {produto.entries.length} {produto.entries.length === 1 ? 'entry' : 'entries'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
