'use client';

import { useState, useRef, useTransition } from 'react';
import { getGastosData } from '../actions';

type Period = '7' | '30' | '90' | '365';
type Agrupamento = 'categoria' | 'loja' | 'mes';

const PERIOD_LABELS: Record<Period, string> = {
  '7': '7 dias',
  '30': '30 dias',
  '90': '90 dias',
  '365': '1 ano',
};

const AGRUPAMENTO_LABELS: Record<Agrupamento, string> = {
  categoria: 'Categoria',
  loja: 'Loja',
  mes: 'Mes',
};

interface GastoRow {
  label: string;
  total: number;
  percentual: number;
}

interface GastosSummaryData {
  totalGeral: number;
  comprasCount: number;
  mediaCompra: number;
}

interface GastosTabProps {
  initialGastos: GastoRow[];
  initialSummary: GastosSummaryData;
}

export function GastosTab({ initialGastos, initialSummary }: GastosTabProps) {
  const [period, setPeriod] = useState<Period>('30');
  const [agrupamento, setAgrupamento] = useState<Agrupamento>('categoria');
  const [gastos, setGastos] = useState(initialGastos);
  const [summary, setSummary] = useState(initialSummary);
  const [isPending, startTransition] = useTransition();
  const isFirstRender = useRef(true);

  function handleChange(newPeriod: Period, newAgrupamento: Agrupamento) {
    if (isFirstRender.current && newPeriod === '30' && newAgrupamento === 'categoria') {
      isFirstRender.current = false;
      return;
    }
    isFirstRender.current = false;

    setPeriod(newPeriod);
    setAgrupamento(newAgrupamento);

    startTransition(async () => {
      const result = await getGastosData(Number(newPeriod), newAgrupamento);
      setGastos(result.gastos);
      setSummary(result.summary);
    });
  }

  const maxTotal = Math.max(...gastos.map((g) => g.total), 1);

  return (
    <div>
      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-400">Total gasto</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            R$ {summary.totalGeral.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-400">Compras</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {summary.comprasCount}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-400">Media/compra</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            R$ {summary.mediaCompra.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Period + Agrupamento filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => handleChange(p, agrupamento)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                period === p
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
          {(Object.keys(AGRUPAMENTO_LABELS) as Agrupamento[]).map((a) => (
            <button
              key={a}
              onClick={() => handleChange(period, a)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                agrupamento === a
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              {AGRUPAMENTO_LABELS[a]}
            </button>
          ))}
        </div>
      </div>

      {/* Gastos table with percentage bars */}
      <div className={isPending ? 'opacity-60 transition-opacity' : ''}>
        {gastos.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-400">
            Nenhum gasto encontrado neste periodo.
          </p>
        ) : (
          <div className="space-y-2">
            {gastos.map((g) => (
              <div key={g.label} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-xs text-zinc-600 dark:text-zinc-400">
                  {g.label}
                </span>
                <div className="relative h-5 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-zinc-400 dark:bg-zinc-600"
                    style={{ width: `${(g.total / maxTotal) * 100}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  R$ {g.total.toFixed(2)}
                </span>
                <span className="w-12 shrink-0 text-right text-xs text-zinc-400">
                  {g.percentual.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
