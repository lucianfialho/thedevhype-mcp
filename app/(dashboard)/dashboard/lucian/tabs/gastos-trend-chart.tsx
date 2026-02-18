'use client';

import { useState, useTransition } from 'react';
import { getGastosTrend, type Granularidade } from '../actions';
import { MiniSelect } from '../../components/ui';

const MONTH_SHORT: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const GRANULARIDADE_LABELS: Record<Granularidade, string> = {
  diario: 'Daily',
  semanal: 'Weekly',
  mensal: 'Monthly',
};

const PERIOD_OPTIONS: Record<Granularidade, Array<{ dias: number; label: string }>> = {
  diario: [
    { dias: 7, label: '7d' },
    { dias: 14, label: '14d' },
    { dias: 30, label: '30d' },
  ],
  semanal: [
    { dias: 28, label: '4 wk' },
    { dias: 56, label: '8 wk' },
    { dias: 84, label: '12 wk' },
  ],
  mensal: [
    { dias: 90, label: '3m' },
    { dias: 180, label: '6m' },
    { dias: 365, label: '1y' },
  ],
};

function fmtPeriodLabel(period: string, granularidade: Granularidade) {
  if (granularidade === 'mensal') {
    const [y, m] = period.split('-');
    return `${MONTH_SHORT[m] || m} ${y}`;
  }
  if (granularidade === 'semanal') {
    const d = new Date(period + 'T12:00:00');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getDate()}/${m}`;
  }
  // diario
  const d = new Date(period + 'T12:00:00');
  const day = WEEKDAY_SHORT[d.getDay()];
  return `${day} ${d.getDate()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmtPeriodFull(period: string, granularidade: Granularidade) {
  if (granularidade === 'mensal') {
    const [y, m] = period.split('-');
    return `${MONTH_SHORT[m] || m} ${y}`;
  }
  if (granularidade === 'semanal') {
    const start = new Date(period + 'T12:00:00');
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.getDate()}/${String(start.getMonth() + 1).padStart(2, '0')} - ${end.getDate()}/${String(end.getMonth() + 1).padStart(2, '0')}`;
  }
  const d = new Date(period + 'T12:00:00');
  return `${d.getDate()}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function fmtCurrency(v: number) {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CATEGORY_COLORS = [
  { fill: '#6366f1', bg: 'bg-indigo-500' },
  { fill: '#f59e0b', bg: 'bg-amber-500' },
  { fill: '#10b981', bg: 'bg-emerald-500' },
  { fill: '#ef4444', bg: 'bg-red-500' },
  { fill: '#8b5cf6', bg: 'bg-violet-500' },
];

export interface GastosTrendData {
  granularidade: Granularidade;
  timeline: Array<{ period: string; total: number }>;
  byCategory: Array<{ period: string; categoria: string; total: number }>;
  categories: string[];
  comparison: {
    current: { period: string; total: number; compras: number };
    previous: { period: string; total: number; compras: number };
    change: number;
  };
}

export function GastosTrendChart({ data: initialData }: { data: GastosTrendData }) {
  const [data, setData] = useState(initialData);
  const [granularidade, setGranularidade] = useState<Granularidade>(initialData.granularidade);
  const [dias, setDias] = useState(() => PERIOD_OPTIONS[initialData.granularidade][1].dias);
  const [isPending, startTransition] = useTransition();

  const { timeline, byCategory, categories, comparison } = data;

  function handleChange(newGran: Granularidade, newDias: number) {
    setGranularidade(newGran);
    setDias(newDias);
    startTransition(async () => {
      const result = await getGastosTrend(newGran, newDias);
      setData(result);
    });
  }

  return (
    <div className="mb-6 space-y-4">
      {/* Granularity + Period controls */}
      <div className="flex flex-wrap gap-2">
        <MiniSelect
          value={granularidade}
          options={(Object.keys(GRANULARIDADE_LABELS) as Granularidade[]).map((g) => ({
            value: g,
            label: GRANULARIDADE_LABELS[g],
          }))}
          onChange={(g) => handleChange(g, PERIOD_OPTIONS[g][1].dias)}
        />
        <MiniSelect
          value={dias}
          options={PERIOD_OPTIONS[granularidade].map((opt) => ({
            value: opt.dias,
            label: opt.label,
          }))}
          onChange={(d) => handleChange(granularidade, d)}
        />
      </div>

      <div className={isPending ? 'opacity-60 transition-opacity' : ''}>
        {timeline.length === 0 ? (
          <p className="py-6 text-center text-base text-slate-500">
            No trend data for this period.
          </p>
        ) : (
          <>
            {/* Comparison card */}
            <ComparisonCard comparison={comparison} granularidade={granularidade} />

            {/* Line chart */}
            <div className="mt-4 rounded-2xl border border-slate-200 p-4">
              <h3 className="mb-3 text-base font-medium text-slate-500">
                {GRANULARIDADE_LABELS[granularidade]} trend
              </h3>
              <LineChart timeline={timeline} granularidade={granularidade} />
            </div>

            {/* Category stacked bars */}
            {categories.length > 0 && byCategory.length > 0 && (
              <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                <h3 className="mb-3 text-base font-medium text-slate-500">
                  Top categories by period
                </h3>
                <CategoryStackedBars
                  timeline={timeline}
                  byCategory={byCategory}
                  categories={categories}
                  granularidade={granularidade}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Comparison Card ─── */

function ComparisonCard({
  comparison,
  granularidade,
}: {
  comparison: GastosTrendData['comparison'];
  granularidade: Granularidade;
}) {
  const { current, previous, change } = comparison;
  const isUp = change > 0;
  const isZero = change === 0 && previous.total === 0;

  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-slate-500">
      <span>{fmtPeriodFull(current.period, granularidade)} <strong className="text-base text-slate-800">{fmtCurrency(current.total)}</strong></span>
      <span>vs {fmtPeriodFull(previous.period, granularidade)} <strong className="text-base text-slate-800">{fmtCurrency(previous.total)}</strong></span>
      {!isZero && (
        <span
          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-sm font-medium ${
            isUp
              ? 'bg-red-100 text-red-600'
              : 'bg-green-100 text-green-600'
          }`}
        >
          {isUp ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
        </span>
      )}
    </div>
  );
}

/* ─── Line Chart (SVG) ─── */

function LineChart({
  timeline,
  granularidade,
}: {
  timeline: Array<{ period: string; total: number }>;
  granularidade: Granularidade;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const W = 600;
  const H = 200;
  const PX = 50;
  const PY = 24;
  const chartW = W - PX * 2;
  const chartH = H - PY * 2;

  const maxVal = Math.max(...timeline.map((m) => m.total), 1);
  const range = maxVal || 1;

  const points = timeline.map((m, i) => ({
    x: PX + (timeline.length === 1 ? chartW / 2 : (i / (timeline.length - 1)) * chartW),
    y: PY + chartH - (m.total / range) * chartH,
    ...m,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Show fewer X labels when there are many points
  const maxXLabels = granularidade === 'diario' ? 10 : 12;
  const step = Math.max(1, Math.ceil(points.length / maxXLabels));

  const ticks = 4;
  const yLabels = Array.from({ length: ticks + 1 }, (_, i) => {
    const val = (range / ticks) * i;
    const y = PY + chartH - (i / ticks) * chartH;
    return { val, y };
  });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      onMouseLeave={() => setHovered(null)}
    >
      {/* Grid lines */}
      {yLabels.map((t, i) => (
        <g key={i}>
          <line
            x1={PX} x2={W - PX} y1={t.y} y2={t.y}
            className="stroke-slate-200"
            strokeWidth={0.5}
          />
          <text x={PX - 6} y={t.y + 3} textAnchor="end" className="fill-slate-500 text-[9px]">
            {t.val >= 1000 ? `${(t.val / 1000).toFixed(1)}k` : t.val.toFixed(0)}
          </text>
        </g>
      ))}

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        className="stroke-slate-500"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Area fill */}
      <path
        d={`${linePath} L ${points[points.length - 1].x} ${PY + chartH} L ${points[0].x} ${PY + chartH} Z`}
        className="fill-slate-200/50"
      />

      {/* Points + labels */}
      {points.map((p, i) => (
        <g key={i} onMouseEnter={() => setHovered(i)} className="cursor-pointer">
          <circle cx={p.x} cy={p.y} r={12} fill="transparent" />
          <circle
            cx={p.x} cy={p.y}
            r={hovered === i ? 5 : timeline.length > 20 ? 2 : 3.5}
            className="fill-slate-600"
          />
          {/* X label (show every Nth) */}
          {i % step === 0 && (
            <text x={p.x} y={H - 4} textAnchor="middle" className="fill-slate-500 text-[9px]">
              {fmtPeriodLabel(p.period, granularidade)}
            </text>
          )}
          {/* Tooltip */}
          {hovered === i && (
            <>
              <rect
                x={p.x - 42} y={p.y - 22} width={84} height={16} rx={4}
                className="fill-slate-800"
              />
              <text
                x={p.x} y={p.y - 11} textAnchor="middle"
                className="fill-white text-[9px] font-medium"
              >
                {fmtCurrency(p.total)}
              </text>
            </>
          )}
        </g>
      ))}
    </svg>
  );
}

/* ─── Category Stacked Bars ─── */

function CategoryStackedBars({
  timeline,
  byCategory,
  categories,
  granularidade,
}: {
  timeline: Array<{ period: string; total: number }>;
  byCategory: Array<{ period: string; categoria: string; total: number }>;
  categories: string[];
  granularidade: Granularidade;
}) {
  const catMap = new Map<string, Map<string, number>>();
  for (const row of byCategory) {
    if (!catMap.has(row.period)) catMap.set(row.period, new Map());
    catMap.get(row.period)!.set(row.categoria, row.total);
  }

  const periods = timeline.map((m) => m.period);
  const maxPeriodTotal = Math.max(
    ...periods.map((p) => {
      const cats = catMap.get(p);
      if (!cats) return 0;
      let sum = 0;
      cats.forEach((v) => (sum += v));
      return sum;
    }),
    1,
  );

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {categories.map((cat, i) => (
          <div key={cat} className="flex items-center gap-1.5">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-sm ${CATEGORY_COLORS[i % CATEGORY_COLORS.length].bg}`}
            />
            <span className="text-sm text-slate-500">{cat}</span>
          </div>
        ))}
      </div>

      {/* Bars */}
      {periods.map((p) => {
        const cats = catMap.get(p) || new Map<string, number>();
        return (
          <div key={p} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-sm text-slate-500">
              {fmtPeriodLabel(p, granularidade)}
            </span>
            <div className="relative flex h-5 flex-1 overflow-hidden rounded-full bg-slate-100">
              {categories.map((cat, i) => {
                const val = cats.get(cat) || 0;
                const pct = (val / maxPeriodTotal) * 100;
                if (pct === 0) return null;
                return (
                  <div
                    key={cat}
                    title={`${cat}: ${fmtCurrency(val)}`}
                    className="h-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length].fill,
                    }}
                  />
                );
              })}
            </div>
            <span className="w-20 shrink-0 text-right text-sm text-slate-400">
              {fmtCurrency(categories.reduce((s, c) => s + (cats.get(c) || 0), 0))}
            </span>
          </div>
        );
      })}
    </div>
  );
}
