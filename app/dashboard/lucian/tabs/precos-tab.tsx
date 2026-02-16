'use client';

import { useState } from 'react';
import { getPrecos } from '../actions';

type Period = '7' | '30' | '90' | '365';

const PERIOD_LABELS: Record<Period, string> = {
  '7': '7 dias',
  '30': '30 dias',
  '90': '90 dias',
  '365': '1 ano',
};

interface ProdutoPreco {
  produtoNome: string;
  min: number;
  max: number;
  avg: number;
  entries: Array<{ storeName: string; valorUnitario: string; dataCompra: string }>;
}

export function PrecosTab() {
  const [busca, setBusca] = useState('');
  const [period, setPeriod] = useState<Period>('90');
  const [resultados, setResultados] = useState<ProdutoPreco[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

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
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Buscar produto para comparar precos..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                period === p
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <button
          onClick={handleSearch}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Buscar
        </button>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-zinc-400">Carregando...</p>
      ) : !searched ? (
        <p className="py-12 text-center text-sm text-zinc-400">
          Busque um produto para ver o historico de precos.
        </p>
      ) : resultados.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-400">Nenhum resultado encontrado.</p>
      ) : (
        <div className="space-y-6">
          {resultados.map((produto) => (
            <div key={produto.produtoNome}>
              <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {produto.produtoNome}
              </h3>

              {/* Min/Max/Avg cards */}
              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <p className="text-xs text-zinc-400">Minimo</p>
                  <p className="mt-1 text-lg font-bold text-green-600 dark:text-green-400">
                    R$ {produto.min.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <p className="text-xs text-zinc-400">Maximo</p>
                  <p className="mt-1 text-lg font-bold text-red-600 dark:text-red-400">
                    R$ {produto.max.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <p className="text-xs text-zinc-400">Media</p>
                  <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    R$ {produto.avg.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* History table */}
              <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                      <th className="px-4 py-2 text-xs font-medium text-zinc-500">Data</th>
                      <th className="px-4 py-2 text-xs font-medium text-zinc-500">Loja</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-zinc-500">
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {produto.entries.map((entry, i) => (
                      <tr
                        key={i}
                        className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                      >
                        <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">
                          {new Date(entry.dataCompra + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">
                          {entry.storeName}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-zinc-900 dark:text-zinc-100">
                          R$ {Number(entry.valorUnitario).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
