'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface OrderRow {
  id: string; user_id: string; subscription_type: string;
  amount_cents: number; channel: string; status: string;
  paid_at: string | null; created_at: string;
  profiles: { phone: string } | null;
}

const STATUS: Record<string, [string, string]> = {
  paid:     ['已支付', 'badge-green'],
  pending:  ['待支付', 'badge-amber'],
  failed:   ['失败',   'badge-red'],
  refunded: ['已退款', 'badge-gray'],
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.from('payments').select('*, profiles(phone)').order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => { setOrders((data ?? []) as OrderRow[]); setLoading(false); });
  }, []);

  const totalRevenue = orders.filter(o => o.status === 'paid').reduce((s, o) => s + o.amount_cents, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">订单管理</h2>
          <p className="text-slate-500 text-sm mt-1">共 {orders.length} 笔订单 · 累计收入 ¥{(totalRevenue / 100).toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-400">
            <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            加载中...
          </div>
        ) : (
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-100">
              <th className="table-th">用户</th><th className="table-th">方案</th>
              <th className="table-th">金额</th><th className="table-th">渠道</th>
              <th className="table-th">状态</th><th className="table-th">支付时间</th><th className="table-th">下单时间</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {orders.map((o) => {
                const [label, cls] = STATUS[o.status] ?? [o.status, 'badge-gray'];
                return (
                  <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="table-td font-mono text-xs">{o.profiles?.phone ?? o.user_id.slice(0, 8)}</td>
                    <td className="table-td"><span className="badge badge-blue">{o.subscription_type}</span></td>
                    <td className="table-td font-semibold text-slate-900">¥{(o.amount_cents / 100).toFixed(2)}</td>
                    <td className="table-td text-slate-500">{o.channel === 'wechat' ? '💚 微信' : '💙 支付宝'}</td>
                    <td className="table-td"><span className={`badge ${cls}`}>{label}</span></td>
                    <td className="table-td text-slate-400 text-xs">{o.paid_at ? new Date(o.paid_at).toLocaleString('zh-CN') : '—'}</td>
                    <td className="table-td text-slate-400 text-xs">{new Date(o.created_at).toLocaleString('zh-CN')}</td>
                  </tr>
                );
              })}
              {orders.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 py-16 text-sm">暂无订单数据</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
