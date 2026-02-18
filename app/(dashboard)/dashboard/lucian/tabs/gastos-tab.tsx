'use client';

import { useState, useRef, useTransition } from 'react';
import { getGastosData } from '../actions';
import { GastosTrendChart, type GastosTrendData } from './gastos-trend-chart';
import { MiniSelect } from '../../components/ui';

type Period = '7' | '30' | '90' | '365';
type Agrupamento = 'categoria' | 'loja' | 'mes';

const PERIOD_LABELS: Record<Period, string> = {
  '7': '7 days',
  '30': '30 days',
  '90': '90 days',
  '365': '1 year',
};

const AGRUPAMENTO_LABELS: Record<Agrupamento, string> = {
  categoria: 'Category',
  loja: 'Store',
  mes: 'Month',
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
  trendData: GastosTrendData;
}

export function GastosTab({ initialGastos, initialSummary, trendData }: GastosTabProps) {
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
      {/* Trend charts */}
      <GastosTrendChart data={trendData} />

      {/* Period + Agrupamento filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <MiniSelect
          value={period}
          options={(Object.keys(PERIOD_LABELS) as Period[]).map((p) => ({
            value: p,
            label: PERIOD_LABELS[p],
          }))}
          onChange={(p) => handleChange(p, agrupamento)}
        />
        <MiniSelect
          value={agrupamento}
          options={(Object.keys(AGRUPAMENTO_LABELS) as Agrupamento[]).map((a) => ({
            value: a,
            label: AGRUPAMENTO_LABELS[a],
          }))}
          onChange={(a) => handleChange(period, a)}
        />
      </div>

      {/* Gastos table with percentage bars */}
      <div className={`rounded-2xl border border-slate-200 p-4 ${isPending ? 'opacity-60 transition-opacity' : ''}`}>
        {gastos.length === 0 ? (
          <p className="py-4 text-center text-base text-slate-500">
            No spending found for this period.
          </p>
        ) : (
          <div className="space-y-2.5">
            {gastos.map((g) => (
              <div key={g.label} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-sm text-slate-500">
                  {g.label}
                </span>
                <div className="relative h-5 flex-1 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-400"
                    style={{ width: `${(g.total / maxTotal) * 100}%` }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right text-sm font-medium text-slate-600">
                  R$ {g.total.toFixed(2)}
                </span>
                <span className="w-10 shrink-0 text-right text-sm text-slate-500">
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
