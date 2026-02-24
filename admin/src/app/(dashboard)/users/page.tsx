'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface UserRow {
  id: string;
  email: string | null;
  phone: string;
  nickname: string | null;
  paywall_enabled: boolean;
  is_banned: boolean;
  created_at: string;
  total_usage_minutes: number;
  has_profile: boolean;
  sub_type: string | null;
  sub_status: string | null;
  sub_expires_at: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const supabase = createClient();

  useEffect(() => { fetchUsers(); }, [search]);

  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_get_all_users', {
      p_search: search.trim() || null,
    });
    if (error) {
      console.error(error);
      setUsers([]);
    } else {
      setUsers((data ?? []) as UserRow[]);
    }
    setLoading(false);
  }

  async function logAction(action: string, targetId: string, details?: object) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('admin_logs').insert({ admin_id: session.user.id, action, target_type: 'user', target_id: targetId, details: details ?? {} });
  }

  async function ensureProfile(userId: string, defaults?: { paywall_enabled?: boolean; is_banned?: boolean }) {
    const { data: existing } = await supabase.from('profiles').select('id').eq('id', userId).single();
    if (existing) return;
    await supabase.from('profiles').insert({
      id: userId,
      phone: '',
      paywall_enabled: defaults?.paywall_enabled ?? true,
      is_banned: defaults?.is_banned ?? false,
    });
  }

  async function grantUnlimited(userId: string, hasProfile: boolean) {
    if (!hasProfile) await ensureProfile(userId, { paywall_enabled: true });
    await supabase.from('subscriptions').insert({ user_id: userId, type: 'unlimited', status: 'active', expires_at: null });
    await logAction('grant_unlimited', userId);
    fetchUsers();
  }

  async function togglePaywall(userId: string, hasProfile: boolean, current: boolean) {
    if (!hasProfile) await ensureProfile(userId, { paywall_enabled: !current });
    else await supabase.from('profiles').update({ paywall_enabled: !current }).eq('id', userId);
    await logAction('toggle_paywall', userId, { new_value: !current });
    fetchUsers();
  }

  async function toggleBan(userId: string, hasProfile: boolean, current: boolean) {
    if (!hasProfile) await ensureProfile(userId, { is_banned: !current });
    else await supabase.from('profiles').update({ is_banned: !current, ban_reason: current ? null : '管理员操作' }).eq('id', userId);
    await logAction('toggle_ban', userId, { new_value: !current });
    fetchUsers();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">用户管理</h2>
          <p className="text-zinc-500 text-sm mt-1">管理所有用户（含未登录）</p>
        </div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索手机/邮箱/昵称/ID..."
            className="pl-9 pr-4 py-2 rounded-xl border border-white/10 bg-white/5 text-zinc-200 placeholder:text-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 w-64" />
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f11] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-zinc-500">
            <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            加载中...
          </div>
        ) : (
          <table className="w-full">
            <thead><tr className="bg-white/[0.03] border-b border-white/[0.06]">
              <th className="table-th">用户</th><th className="table-th">会员状态</th>
              <th className="table-th">付费开关</th><th className="table-th">账号状态</th>
              <th className="table-th">使用时长</th><th className="table-th">注册时间</th>
              <th className="table-th">操作</th>
            </tr></thead>
            <tbody className="divide-y divide-white/[0.04]">
              {users.map((u) => {
                const hasPaid = u.sub_status === 'active';
                const displayId = u.phone || u.email || (u.has_profile ? '—' : '未登录');
                return (
                  <tr key={u.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs font-bold text-cyan-400">
                          {(u.nickname?.[0] || u.phone?.[0] || u.email?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-200 text-xs">{displayId}</p>
                          {u.nickname && <p className="text-xs text-zinc-500">{u.nickname}</p>}
                          {!u.has_profile && <span className="badge badge-gray text-[10px]">未登录</span>}
                        </div>
                      </div>
                    </td>
                    <td className="table-td">
                      {u.sub_type === 'unlimited' ? <span className="badge badge-purple">👑 无限制</span>
                        : hasPaid ? <span className="badge badge-green">⭐ {u.sub_type}</span>
                        : <span className="badge badge-gray">免费</span>}
                    </td>
                    <td className="table-td">
                      <button onClick={() => togglePaywall(u.id, u.has_profile, u.paywall_enabled)}
                        className={`badge cursor-pointer transition-opacity hover:opacity-75 ${u.paywall_enabled ? 'badge-blue' : 'badge-gray'}`}>
                        {u.paywall_enabled ? '已开启' : '已关闭'}
                      </button>
                    </td>
                    <td className="table-td">
                      <button onClick={() => toggleBan(u.id, u.has_profile, u.is_banned)}
                        className={`badge cursor-pointer transition-opacity hover:opacity-75 ${u.is_banned ? 'badge-red' : 'badge-green'}`}>
                        {u.is_banned ? '已封禁' : '正常'}
                      </button>
                    </td>
                    <td className="table-td text-zinc-400">{u.total_usage_minutes} 分钟</td>
                    <td className="table-td text-zinc-500 text-xs">{new Date(u.created_at).toLocaleDateString('zh-CN')}</td>
                    <td className="table-td">
                      {!hasPaid && (
                        <button onClick={() => grantUnlimited(u.id, u.has_profile)}
                          className="text-xs font-semibold text-violet-400 hover:text-violet-300 bg-violet-500/15 hover:bg-violet-500/25 px-3 py-1.5 rounded-lg transition-colors">
                          授予会员
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr><td colSpan={7} className="text-center text-zinc-500 py-16 text-sm">暂无用户数据</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
