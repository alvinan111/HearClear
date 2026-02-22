'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface UserRow {
  id: string;
  phone: string;
  nickname: string | null;
  paywall_enabled: boolean;
  is_banned: boolean;
  created_at: string;
  first_use_at: string | null;
  total_usage_minutes: number;
  subscription?: {
    type: string;
    status: string;
    expires_at: string | null;
  } | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, [search]);

  async function fetchUsers() {
    setLoading(true);
    let query = supabase
      .from('profiles')
      .select(`
        id, phone, nickname, paywall_enabled, is_banned,
        created_at, first_use_at, total_usage_minutes,
        subscriptions!left(type, status, expires_at)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (search) {
      query = query.ilike('phone', `%${search}%`);
    }

    const { data } = await query;
    setUsers((data ?? []) as UserRow[]);
    setLoading(false);
  }

  async function grantUnlimited(userId: string) {
    await supabase.from('subscriptions').insert({
      user_id: userId,
      type: 'unlimited',
      status: 'active',
      expires_at: null,
    });
    await logAdminAction('grant_unlimited', 'user', userId);
    fetchUsers();
    alert('已授予无限制会员');
  }

  async function togglePaywall(userId: string, current: boolean) {
    await supabase
      .from('profiles')
      .update({ paywall_enabled: !current })
      .eq('id', userId);
    await logAdminAction('toggle_paywall', 'user', userId, { new_value: !current });
    fetchUsers();
  }

  async function toggleBan(userId: string, current: boolean) {
    await supabase
      .from('profiles')
      .update({ is_banned: !current, ban_reason: current ? null : '管理员操作' })
      .eq('id', userId);
    await logAdminAction('toggle_ban', 'user', userId, { new_value: !current });
    fetchUsers();
  }

  async function logAdminAction(
    action: string,
    targetType: string,
    targetId: string,
    details?: object
  ) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('admin_logs').insert({
      admin_id: session.user.id,
      action,
      target_type: targetType,
      target_id: targetId,
      details: details ?? {},
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
        <input
          type="text"
          placeholder="搜索手机号..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-20">加载中...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">手机号</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">会员状态</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">付费开关</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">封禁状态</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">使用时长</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">注册时间</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const sub = Array.isArray(user.subscription)
                  ? user.subscription[0]
                  : user.subscription;
                const hasPaid = sub?.status === 'active';
                return (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{user.phone}</td>
                    <td className="px-4 py-3">
                      {sub?.type === 'unlimited' ? (
                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                          👑 无限制
                        </span>
                      ) : hasPaid ? (
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                          ⭐ {sub?.type}
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs">
                          免费
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => togglePaywall(user.id, user.paywall_enabled)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          user.paywall_enabled
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {user.paywall_enabled ? '已开启' : '已关闭'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleBan(user.id, user.is_banned)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          user.is_banned
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {user.is_banned ? '已封禁' : '正常'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {user.total_usage_minutes} 分钟
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(user.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-3">
                      {!hasPaid && (
                        <button
                          onClick={() => grantUnlimited(user.id)}
                          className="bg-purple-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-purple-700 transition-colors"
                        >
                          授予会员
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
