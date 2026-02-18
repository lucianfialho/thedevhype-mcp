'use client';

import { useState, useEffect } from 'react';
import {
  getClickStats,
  getTopClickedArticles,
  getClicksBySource,
  getClicksOverTime,
} from '../actions';

type Period = 'today' | '7d' | '30d' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today',
  '7d': '7 days',
  '30d': '30 days',
  all: 'All',
};

export function AnalyticsTab() {
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
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total clicks</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">
            {stats?.totalClicks ?? '—'}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Clicks today</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">
            {stats?.todayClicks ?? '—'}
          </p>
        </div>
      </div>

      <p className="mb-4 text-sm text-slate-500">(Global data)</p>

      {/* Period filter */}
      <div className="mb-4 flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              period === p
                ? 'bg-slate-50 text-slate-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-8 text-center text-base text-slate-500">Loading...</p>
      ) : (
        <>
          {/* Top articles */}
          <section className="mb-6">
            <h3 className="mb-3 text-base font-semibold text-slate-600">
              Most clicked articles
            </h3>
            {topArticles.length === 0 ? (
              <p className="text-base text-slate-500">No clicks in this period.</p>
            ) : (
              <div className="space-y-2">
                {topArticles.map((a) => (
                  <div
                    key={a.articleId}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-medium text-slate-800">
                        {a.title}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-500">{a.sourceTitle}</p>
                    </div>
                    <div className="ml-4 shrink-0 text-right">
                      <p className="text-base font-semibold text-slate-800">
                        {a.clickCount}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {a.clickCount === 1 ? 'click' : 'clicks'}
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
              <h3 className="mb-3 text-base font-semibold text-slate-600">
                Clicks by source
              </h3>
              <div className="space-y-2">
                {bySource.map((s) => (
                  <div key={s.sourceTitle} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-sm text-slate-500">
                      {s.sourceTitle}
                    </span>
                    <div className="relative h-5 flex-1 rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-400"
                        style={{ width: `${(s.clickCount / maxSourceClicks) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-sm font-medium text-slate-600">
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
              <h3 className="mb-3 text-base font-semibold text-slate-600">
                Clicks over time
              </h3>
              <div className="flex items-end gap-1" style={{ height: 120 }}>
                {overTime.map((d) => (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-500">{d.count}</span>
                    <div
                      className="w-full rounded-t bg-slate-400"
                      style={{
                        height: `${(d.count / maxClicks) * 80}px`,
                        minHeight: d.count > 0 ? 4 : 0,
                      }}
                    />
                    <span className="text-[9px] text-slate-500">
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
