'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface ConfigRow { key: string; value: unknown; description: string | null; updated_at: string; }

export default function RemoteConfigPage() {
  const [configs, setConfigs] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => { fetchConfigs(); }, []);

  async function fetchConfigs() {
    const { data } = await supabase.from('app_config').select('*').order('key');
    setConfigs((data ?? []) as ConfigRow[]);
    setLoading(false);
  }

  async function saveConfig(key: string) {
    try {
      setSaving(true);
      const value = JSON.parse(editingValue);
      await supabase.from('app_config').update({ value, updated_at: new Date().toISOString() }).eq('key', key);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await supabase.from('admin_logs').insert({ admin_id: session.user.id, action: 'update_config', target_type: 'config', target_id: key, details: { new_value: value } });
      setEditingKey(null);
      fetchConfigs();
    } catch { alert('JSON 格式错误'); } finally { setSaving(false); }
  }

  const announcement = configs.find(c => c.key === 'announcement');

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">远程配置</h2>
        <p className="text-zinc-500 text-sm mt-1">修改后实时下发至所有用户</p>
      </div>

      {announcement && (
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">📢</span>
            <h3 className="font-semibold text-cyan-400">全局公告</h3>
            <span className="badge badge-blue ml-auto">实时生效</span>
          </div>
          <div className="flex gap-3">
            <input type="text" value={announcement.value === null ? '' : String(announcement.value)}
              placeholder="输入公告内容（留空则不显示）"
              className="input-base flex-1"
              onChange={async (e) => {
                await supabase.from('app_config').update({ value: e.target.value || null }).eq('key', 'announcement');
                fetchConfigs();
              }} />
            <button onClick={async () => { await supabase.from('app_config').update({ value: null }).eq('key', 'announcement'); fetchConfigs(); }}
              className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-zinc-400 hover:bg-white/10 font-medium transition-colors">
              清除
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f11] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-zinc-500">
            <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>加载中...
          </div>
        ) : (
          <table className="w-full">
            <thead><tr className="bg-white/[0.03] border-b border-white/[0.06]">
              <th className="table-th w-48">配置键</th><th className="table-th">描述</th>
              <th className="table-th">当前值</th><th className="table-th w-32">操作</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {configs.map((c) => (
                <tr key={c.key} className="hover:bg-white/[0.03] transition-colors">
                  <td className="table-td font-mono text-xs text-cyan-400">{c.key}</td>
                  <td className="table-td text-zinc-500 text-xs">{c.description ?? '—'}</td>
                  <td className="table-td">
                    {editingKey === c.key ? (
                      <textarea value={editingValue} onChange={e => setEditingValue(e.target.value)} rows={3}
                        className="w-full border border-cyan-500/30 rounded-xl p-3 font-mono text-xs text-zinc-200 bg-white/5 focus:outline-none focus:ring-2 focus:ring-cyan-500/50" />
                    ) : (
                      <code className="text-xs bg-white/5 px-3 py-1.5 rounded-lg text-zinc-400 block max-w-sm truncate">
                        {JSON.stringify(c.value)}
                      </code>
                    )}
                  </td>
                  <td className="table-td">
                    {editingKey === c.key ? (
                      <div className="flex gap-2">
                        <button onClick={() => saveConfig(c.key)} disabled={saving}
                          className="text-xs font-semibold text-black bg-cyan-500 hover:bg-cyan-400 px-3 py-1.5 rounded-lg transition-colors">
                          {saving ? '保存中...' : '保存'}
                        </button>
                        <button onClick={() => setEditingKey(null)}
                          className="text-xs font-semibold text-zinc-400 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors">
                          取消
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingKey(c.key); setEditingValue(JSON.stringify(c.value, null, 2)); }}
                        className="text-xs font-semibold text-zinc-400 bg-white/5 hover:bg-cyan-500/15 hover:text-cyan-400 px-3 py-1.5 rounded-lg transition-colors">
                        编辑
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
