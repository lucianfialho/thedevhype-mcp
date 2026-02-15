'use client';

import { useState, useEffect } from 'react';
import {
  getClickStats,
  getTopClickedArticles,
  getClicksBySource,
  getClicksOverTime,
} from '../actions';

type Period = 'today' | '7d' | '30d' | 'all';

interface AnalyticsTabProps {
  isAdmin: boolean;
}

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoje',
  '7d': '7 dias',
  '30d': '30 dias',
  all: 'Todos',
};

export function AnalyticsTab({ isAdmin }: AnalyticsTabProps) {
  const [period, setPeriod] = useState<Period>('7d');
  const [stats, setStats] = useState<{ totalClicks: number; todayClicks: number } | null>(null);
  const [topArticles, setTopArticles] = useState<
    Array<{
      articleId: number;
      title: string;
      url: string;
      shortCode: string | null;
      sourceTitle: string;
      clickCount: number;
      lastClickedAt: string;
    }>
  >([]);
  const [bySource, setBySource] = useState<Array<{ sourceTitle: string; clickCount: number }>>([]);
  const [overTime, setOverTime] = useState<Array<{ date: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClickStats().then(setStats);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getTopClickedArticles(10, period),
      getClicksBySource(period),
      getClicksOverTime(period === 'today' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90),
    ]).then(([top, src, time]) => {
      setTopArticles(top);
      setBySource(src);
      setOverTime(time);
      setLoading(false);
    });
  }, [period]);

  const maxClicks = Math.max(...overTime.map((d) => d.count), 1);
  const maxSourceClicks = Math.max(...bySource.map((s) => s.clickCount), 1);

  return (
    <div>
      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-400">Total de cliques</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {stats?.totalClicks ?? '—'}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-400">Cliques hoje</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {stats?.todayClicks ?? '—'}
          </p>
        </div>
      </div>

      {/* Admin badge */}
      {isAdmin && (
        <p className="mb-4 text-xs text-zinc-400">(Dados globais)</p>
      )}

      {/* Period filter */}
      <div className="mb-4 flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              period === p
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-zinc-400">Carregando...</p>
      ) : (
        <>
          {/* Top articles */}
          <section className="mb-6">
            <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Artigos mais clicados
            </h3>
            {topArticles.length === 0 ? (
              <p className="text-sm text-zinc-400">Nenhum clique neste periodo.</p>
            ) : (
              <div className="space-y-2">
                {topArticles.map((a) => (
                  <div
                    key={a.articleId}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {a.title}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-400">{a.sourceTitle}</p>
                    </div>
                    <div className="ml-4 shrink-0 text-right">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {a.clickCount}
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        {a.clickCount === 1 ? 'clique' : 'cliques'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Clicks by source */}
          {bySource.length > 0 && (
            <section className="mb-6">
              <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Cliques por fonte
              </h3>
              <div className="space-y-2">
                {bySource.map((s) => (
                  <div key={s.sourceTitle} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-xs text-zinc-600 dark:text-zinc-400">
                      {s.sourceTitle}
                    </span>
                    <div className="relative h-5 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-zinc-400 dark:bg-zinc-600"
                        style={{ width: `${(s.clickCount / maxSourceClicks) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {s.clickCount}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Clicks over time bar chart */}
          {overTime.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Cliques ao longo do tempo
              </h3>
              <div className="flex items-end gap-1" style={{ height: 120 }}>
                {overTime.map((d) => (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] text-zinc-400">{d.count}</span>
                    <div
                      className="w-full rounded-t bg-zinc-400 dark:bg-zinc-600"
                      style={{
                        height: `${(d.count / maxClicks) * 80}px`,
                        minHeight: d.count > 0 ? 4 : 0,
                      }}
                    />
                    <span className="text-[9px] text-zinc-400">
                      {d.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
