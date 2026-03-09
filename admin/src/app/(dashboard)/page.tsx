'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface Stats { totalUsers: number; paidUsers: number; todayRevenueCents: number; pendingFeedbacks: number; }

const QUICK = [
  { label: '授予会员', href: '/users', color: 'from-violet-500 to-violet-600', icon: '👑' },
  { label: '发布公告', href: '/config', color: 'from-cyan-500 to-cyan-600', icon: '📢' },
  { label: '推送通知', href: '/push', color: 'from-sky-500 to-sky-600', icon: '🔔' },
  { label: '版本更新', href: '/versions', color: 'from-emerald-500 to-emerald-600', icon: '📦' },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, paidUsers: 0, todayRevenueCents: 0, pendingFeedbacks: 0 });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const [
        { count: totalUsers },
        { count: paidUsers },
        { data: todayPayments },
        { count: pendingFeedbacks },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('payments').select('amount_cents').eq('status', 'paid').gte('paid_at', new Date().toISOString().split('T')[0]),
        supabase.from('feedbacks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      setStats({
        totalUsers: totalUsers ?? 0,
        paidUsers: paidUsers ?? 0,
        todayRevenueCents: (todayPayments ?? []).reduce((s, p) => s + (p.amount_cents as number), 0),
        pendingFeedbacks: pendingFeedbacks ?? 0,
      });
      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: '总用户数', value: stats.totalUsers.toLocaleString(), color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    { label: '付费会员', value: stats.paidUsers.toLocaleString(), color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: '今日收入', value: `¥${(stats.todayRevenueCents / 100).toFixed(2)}`, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { label: '待处理反馈', value: stats.pendingFeedbacks.toLocaleString(), color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">数据总览</h2>
        <p className="text-zinc-500 text-sm mt-1">HearClear 运营数据一览</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className={`stat-card border ${c.border}`}>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">{c.label}</p>
            <p className={`text-3xl font-bold ${c.color} tabular-nums mb-1`}>
              {loading ? <span className="inline-block w-20 h-8 bg-white/5 rounded animate-pulse" /> : c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f11] p-6">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">快速操作</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK.map((q) => (
              <a key={q.href} href={q.href}
                className="group flex flex-col items-center justify-center gap-3 p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all cursor-pointer">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${q.color} flex items-center justify-center text-base shadow-md group-hover:scale-105 transition-transform`}>{q.icon}</div>
                <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-200">{q.label}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 p-6">
          <h3 className="text-xs font-semibold text-cyan-400/80 uppercase tracking-widest mb-4">今日摘要</h3>
          <p className="text-4xl font-bold text-white tabular-nums mb-1">{loading ? '—' : stats.paidUsers}</p>
          <p className="text-cyan-400/70 text-sm mb-6">活跃付费用户</p>
          <div className="flex gap-3">
            <a href="/users" className="flex-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium py-2.5 px-4 text-center transition-colors border border-white/10">查看用户</a>
            <a href="/analytics" className="flex-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium py-2.5 px-4 text-center transition-colors border border-white/10">详细统计</a>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f11] p-6">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">系统信息</h3>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[['应用名称', 'HearClear'], ['后台版本', 'v1.0.0'], ['数据库', 'Supabase'], ['部署', 'Vercel']].map(([k, v]) => (
            <div key={k} className="flex flex-col gap-1">
              <dt className="text-xs text-zinc-500">{k}</dt>
              <dd className="text-sm font-medium text-zinc-200">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
