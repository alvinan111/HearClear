'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface LogRow {
  id: string; admin_id: string; action: string; target_type: string | null;
  target_id: string | null; details: Record<string, unknown> | null;
  created_at: string; profiles: { phone: string } | null;
}

const ACTION_COLOR: Record<string, string> = {
  grant_unlimited: 'badge-purple', toggle_paywall: 'badge-blue', toggle_ban: 'badge-red',
  update_config: 'badge-amber', publish_version: 'badge-green',
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.from('admin_logs').select('*, profiles(phone)').order('created_at', { ascending: false }).limit(500)
      .then(({ data }) => { setLogs((data ?? []) as LogRow[]); setLoading(false); });
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">操作日志</h2>
        <p className="text-zinc-500 text-sm mt-1">所有管理员操作记录</p>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f11] overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-48 text-zinc-500"><svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>加载中...</div> : (
          <table className="w-full">
            <thead><tr className="bg-white/[0.03] border-b border-white/[0.06]">
              <th className="table-th">管理员</th><th className="table-th">操作</th>
              <th className="table-th">目标</th><th className="table-th">详情</th><th className="table-th">时间</th>
            </tr></thead>
            <tbody className="divide-y divide-white/[0.04]">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="table-td font-mono text-xs text-cyan-400">{l.profiles?.phone ?? l.admin_id.slice(0, 8)}</td>
                  <td className="table-td">
                    <span className={`badge ${ACTION_COLOR[l.action] ?? 'badge-gray'}`}>{l.action}</span>
                  </td>
                  <td className="table-td text-zinc-500 text-xs">
                    {l.target_type && <span className="text-zinc-400 font-medium mr-1">{l.target_type}:</span>}
                    {l.target_id?.slice(0, 12)}
                  </td>
                  <td className="table-td text-zinc-500 text-xs max-w-xs truncate">
                    {l.details ? JSON.stringify(l.details) : '—'}
                  </td>
                  <td className="table-td text-zinc-500 text-xs">{new Date(l.created_at).toLocaleString('zh-CN')}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={5} className="text-center text-zinc-500 py-16 text-sm">暂无日志</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
