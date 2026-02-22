'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface UserRow {
  id: string; phone: string; nickname: string | null;
  paywall_enabled: boolean; is_banned: boolean;
  created_at: string; total_usage_minutes: number;
  subscription?: { type: string; status: string; expires_at: string | null } | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const supabase = createClient();

  useEffect(() => { fetchUsers(); }, [search]);

  async function fetchUsers() {
    setLoading(true);
    let q = supabase.from('profiles')
      .select('id,phone,nickname,paywall_enabled,is_banned,created_at,total_usage_minutes,subscriptions!left(type,status,expires_at)')
      .order('created_at', { ascending: false }).limit(100);
    if (search) q = q.ilike('phone', `%${search}%`);
    const { data } = await q;
    setUsers((data ?? []) as UserRow[]);
    setLoading(false);
  }

  async function logAction(action: string, targetId: string, details?: object) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('admin_logs').insert({ admin_id: session.user.id, action, target_type: 'user', target_id: targetId, details: details ?? {} });
  }

  async function grantUnlimited(userId: string) {
    await supabase.from('subscriptions').insert({ user_id: userId, type: 'unlimited', status: 'active', expires_at: null });
    await logAction('grant_unlimited', userId);
    fetchUsers();
  }

  async function togglePaywall(userId: string, current: boolean) {
    await supabase.from('profiles').update({ paywall_enabled: !current }).eq('id', userId);
    await logAction('toggle_paywall', userId, { new_value: !current });
    fetchUsers();
  }

  async function toggleBan(userId: string, current: boolean) {
    await supabase.from('profiles').update({ is_banned: !current, ban_reason: current ? null : '管理员操作' }).eq('id', userId);
    await logAction('toggle_ban', userId, { new_value: !current });
    fetchUsers();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">用户管理</h2>
          <p className="text-slate-500 text-sm mt-1">管理所有注册用户</p>
        </div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索手机号..."
            className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56" />
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
              <th className="table-th">用户</th><th className="table-th">会员状态</th>
              <th className="table-th">付费开关</th><th className="table-th">账号状态</th>
              <th className="table-th">使用时长</th><th className="table-th">注册时间</th>
              <th className="table-th">操作</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((u) => {
                const sub = Array.isArray(u.subscription) ? u.subscription[0] : u.subscription;
                const hasPaid = sub?.status === 'active';
                return (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                          {(u.nickname?.[0] || u.phone?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 text-xs">{u.phone || '—'}</p>
                          {u.nickname && <p className="text-xs text-slate-400">{u.nickname}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="table-td">
                      {sub?.type === 'unlimited' ? <span className="badge badge-purple">👑 无限制</span>
                        : hasPaid ? <span className="badge badge-green">⭐ {sub?.type}</span>
                        : <span className="badge badge-gray">免费</span>}
                    </td>
                    <td className="table-td">
                      <button onClick={() => togglePaywall(u.id, u.paywall_enabled)}
                        className={`badge cursor-pointer transition-opacity hover:opacity-75 ${u.paywall_enabled ? 'badge-blue' : 'badge-gray'}`}>
                        {u.paywall_enabled ? '已开启' : '已关闭'}
                      </button>
                    </td>
                    <td className="table-td">
                      <button onClick={() => toggleBan(u.id, u.is_banned)}
                        className={`badge cursor-pointer transition-opacity hover:opacity-75 ${u.is_banned ? 'badge-red' : 'badge-green'}`}>
                        {u.is_banned ? '已封禁' : '正常'}
                      </button>
                    </td>
                    <td className="table-td text-slate-500">{u.total_usage_minutes} 分钟</td>
                    <td className="table-td text-slate-400 text-xs">{new Date(u.created_at).toLocaleDateString('zh-CN')}</td>
                    <td className="table-td">
                      {!hasPaid && (
                        <button onClick={() => grantUnlimited(u.id)}
                          className="text-xs font-semibold text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors">
                          授予会员
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr><td colSpan={7} className="text-center text-slate-400 py-16 text-sm">暂无用户数据</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
