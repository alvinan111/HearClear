'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface OrderRow {
  id: string;
  user_id: string;
  subscription_type: string;
  amount_cents: number;
  channel: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  profiles: { phone: string } | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  paid: { label: '已支付', color: 'bg-green-100 text-green-700' },
  pending: { label: '待支付', color: 'bg-yellow-100 text-yellow-700' },
  failed: { label: '失败', color: 'bg-red-100 text-red-700' },
  refunded: { label: '已退款', color: 'bg-gray-100 text-gray-500' },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchOrders() {
      const { data } = await supabase
        .from('payments')
        .select('*, profiles(phone)')
        .order('created_at', { ascending: false })
        .limit(200);
      setOrders((data ?? []) as OrderRow[]);
      setLoading(false);
    }
    fetchOrders();
  }, []);

  if (loading) return <div className="text-center text-gray-400 py-20">加载中...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">订单管理</h1>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-700">手机号</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">方案</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">金额</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">渠道</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">状态</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">支付时间</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">下单时间</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const statusInfo = STATUS_LABELS[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-500' };
              return (
                <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono">{order.profiles?.phone ?? order.user_id.slice(0, 8)}</td>
                  <td className="px-4 py-3">{order.subscription_type}</td>
                  <td className="px-4 py-3 font-semibold">¥{(order.amount_cents / 100).toFixed(2)}</td>
                  <td className="px-4 py-3">{order.channel === 'wechat' ? '微信' : '支付宝'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {order.paid_at ? new Date(order.paid_at).toLocaleString('zh-CN') : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(order.created_at).toLocaleString('zh-CN')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
