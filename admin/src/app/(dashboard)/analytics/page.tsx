'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { createClient } from '@/lib/supabase';

interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
}

interface SubscriptionDistribution {
  type: string;
  count: number;
}

export default function AnalyticsPage() {
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [subDist, setSubDist] = useState<SubscriptionDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      // 近30天收入（从 payments 聚合）
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: payments } = await supabase
        .from('payments')
        .select('paid_at, amount_cents, subscription_type')
        .eq('status', 'paid')
        .gte('paid_at', thirtyDaysAgo.toISOString());

      // 按日聚合
      const revenueByDay: Record<string, DailyRevenue> = {};
      for (const p of payments ?? []) {
        const date = (p.paid_at as string).split('T')[0];
        if (!revenueByDay[date]) {
          revenueByDay[date] = { date, revenue: 0, orders: 0 };
        }
        revenueByDay[date].revenue += (p.amount_cents as number) / 100;
        revenueByDay[date].orders += 1;
      }
      setDailyRevenue(Object.values(revenueByDay).sort((a, b) => a.date.localeCompare(b.date)));

      // 订阅类型分布
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('type')
        .eq('status', 'active');

      const dist: Record<string, number> = {};
      for (const s of subs ?? []) {
        const type = s.type as string;
        dist[type] = (dist[type] ?? 0) + 1;
      }
      setSubDist(
        Object.entries(dist).map(([type, count]) => ({ type, count }))
      );

      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return <div className="text-center text-gray-400 py-20">加载中...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">数据统计</h1>

      {/* 近30天收入趋势 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">近30天收入趋势（元）</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyRevenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => `¥${v.toFixed(2)}`} />
            <Line type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 订阅类型分布 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">活跃订阅类型分布</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={subDist}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="type" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#16A34A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
