'use client';

import { useState } from 'react';

const MONTH_SHORT: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
};

function fmtMonth(ym: string) {
  const [y, m] = ym.split('-');
  return `${MONTH_SHORT[m] || m} ${y}`;
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
  monthly: Array<{ month: string; total: number }>;
  byCategory: Array<{ month: string; categoria: string; total: number }>;
  categories: string[];
  comparison: {
    current: { month: string; total: number; compras: number };
    previous: { month: string; total: number; compras: number };
    change: number;
  };
}

export function GastosTrendChart({ data }: { data: GastosTrendData }) {
  const { monthly, byCategory, categories, comparison } = data;

  if (monthly.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-400">
        Sem dados de tendencia ainda.
      </p>
    );
  }

  return (
    <div className="mb-6 space-y-4">
      {/* Comparison card */}
      <ComparisonCard comparison={comparison} />

      {/* Monthly line chart */}
      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h3 className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Tendencia mensal
        </h3>
        <MonthlyLineChart monthly={monthly} />
      </div>

      {/* Category breakdown stacked bars */}
      {categories.length > 0 && byCategory.length > 0 && (
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h3 className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Top categorias por mes
          </h3>
          <CategoryStackedBars
            monthly={monthly}
            byCategory={byCategory}
            categories={categories}
          />
        </div>
      )}
    </div>
  );
}

/* ─── Comparison Card ─── */

function ComparisonCard({
  comparison,
}: {
  comparison: GastosTrendData['comparison'];
}) {
  const { current, previous, change } = comparison;
  const isUp = change > 0;
  const isZero = change === 0 && previous.total === 0;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-xs text-zinc-400">{fmtMonth(current.month)}</p>
        <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
          {fmtCurrency(current.total)}
        </p>
        <p className="text-xs text-zinc-400">{current.compras} compras</p>
      </div>
      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-xs text-zinc-400">{fmtMonth(previous.month)}</p>
        <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
          {fmtCurrency(previous.total)}
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <p className="text-xs text-zinc-400">{previous.compras} compras</p>
          {!isZero && (
            <span
              className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
                isUp
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }`}
            >
              {isUp ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Monthly Line Chart (SVG) ─── */

function MonthlyLineChart({
  monthly,
}: {
  monthly: Array<{ month: string; total: number }>;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const W = 600;
  const H = 200;
  const PX = 50;
  const PY = 24;
  const chartW = W - PX * 2;
  const chartH = H - PY * 2;

  const maxVal = Math.max(...monthly.map((m) => m.total), 1);
  const minVal = 0;
  const range = maxVal - minVal || 1;

  const points = monthly.map((m, i) => ({
    x: PX + (monthly.length === 1 ? chartW / 2 : (i / (monthly.length - 1)) * chartW),
    y: PY + chartH - ((m.total - minVal) / range) * chartH,
    ...m,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Y axis ticks
  const ticks = 4;
  const yLabels = Array.from({ length: ticks + 1 }, (_, i) => {
    const val = minVal + (range / ticks) * i;
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
            x1={PX}
            x2={W - PX}
            y1={t.y}
            y2={t.y}
            className="stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth={0.5}
          />
          <text
            x={PX - 6}
            y={t.y + 3}
            textAnchor="end"
            className="fill-zinc-400 text-[9px]"
          >
            {t.val >= 1000 ? `${(t.val / 1000).toFixed(1)}k` : t.val.toFixed(0)}
          </text>
        </g>
      ))}

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        className="stroke-zinc-600 dark:stroke-zinc-400"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Area fill */}
      <path
        d={`${linePath} L ${points[points.length - 1].x} ${PY + chartH} L ${points[0].x} ${PY + chartH} Z`}
        className="fill-zinc-200/40 dark:fill-zinc-700/30"
      />

      {/* Points + labels */}
      {points.map((p, i) => (
        <g
          key={i}
          onMouseEnter={() => setHovered(i)}
          className="cursor-pointer"
        >
          {/* Hit area */}
          <circle cx={p.x} cy={p.y} r={12} fill="transparent" />
          {/* Dot */}
          <circle
            cx={p.x}
            cy={p.y}
            r={hovered === i ? 5 : 3.5}
            className="fill-zinc-600 dark:fill-zinc-300"
          />
          {/* X label */}
          <text
            x={p.x}
            y={H - 4}
            textAnchor="middle"
            className="fill-zinc-400 text-[9px]"
          >
            {fmtMonth(p.month)}
          </text>
          {/* Value tooltip */}
          {hovered === i && (
            <>
              <rect
                x={p.x - 38}
                y={p.y - 22}
                width={76}
                height={16}
                rx={4}
                className="fill-zinc-800 dark:fill-zinc-200"
              />
              <text
                x={p.x}
                y={p.y - 11}
                textAnchor="middle"
                className="fill-zinc-100 dark:fill-zinc-900 text-[9px] font-medium"
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
  monthly,
  byCategory,
  categories,
}: {
  monthly: Array<{ month: string; total: number }>;
  byCategory: Array<{ month: string; categoria: string; total: number }>;
  categories: string[];
}) {
  // Build map: month -> category -> total
  const catMap = new Map<string, Map<string, number>>();
  for (const row of byCategory) {
    if (!catMap.has(row.month)) catMap.set(row.month, new Map());
    catMap.get(row.month)!.set(row.categoria, row.total);
  }

  const months = monthly.map((m) => m.month);
  const maxMonthTotal = Math.max(
    ...months.map((m) => {
      const cats = catMap.get(m);
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
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{cat}</span>
          </div>
        ))}
      </div>

      {/* Bars */}
      {months.map((m) => {
        const cats = catMap.get(m) || new Map<string, number>();
        return (
          <div key={m} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
              {fmtMonth(m)}
            </span>
            <div className="relative flex h-5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              {categories.map((cat, i) => {
                const val = cats.get(cat) || 0;
                const pct = (val / maxMonthTotal) * 100;
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
            <span className="w-20 shrink-0 text-right text-xs text-zinc-500">
              {fmtCurrency(
                categories.reduce((s, c) => s + (cats.get(c) || 0), 0),
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
