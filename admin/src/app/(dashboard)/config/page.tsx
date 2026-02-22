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
        <h2 className="text-2xl font-bold text-slate-900">远程配置</h2>
        <p className="text-slate-500 text-sm mt-1">修改后实时下发至所有用户</p>
      </div>

      {/* 公告快捷编辑 */}
      {announcement && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📢</span>
            <h3 className="font-semibold text-indigo-900">全局公告</h3>
            <span className="badge badge-blue ml-auto">实时生效</span>
          </div>
          <div className="flex gap-3">
            <input type="text" value={announcement.value === null ? '' : String(announcement.value)}
              placeholder="输入公告内容（留空则不显示）"
              className="input-base flex-1 bg-white"
              onChange={async (e) => {
                await supabase.from('app_config').update({ value: e.target.value || null }).eq('key', 'announcement');
                fetchConfigs();
              }} />
            <button onClick={async () => { await supabase.from('app_config').update({ value: null }).eq('key', 'announcement'); fetchConfigs(); }}
              className="px-4 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm text-indigo-700 hover:bg-indigo-100 font-medium transition-colors">
              清除
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-400">
            <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>加载中...
          </div>
        ) : (
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-100">
              <th className="table-th w-48">配置键</th><th className="table-th">描述</th>
              <th className="table-th">当前值</th><th className="table-th w-32">操作</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {configs.map((c) => (
                <tr key={c.key} className="hover:bg-slate-50/50 transition-colors">
                  <td className="table-td font-mono text-xs text-indigo-600">{c.key}</td>
                  <td className="table-td text-slate-400 text-xs">{c.description ?? '—'}</td>
                  <td className="table-td">
                    {editingKey === c.key ? (
                      <textarea value={editingValue} onChange={e => setEditingValue(e.target.value)} rows={3}
                        className="w-full border border-indigo-300 rounded-xl p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50" />
                    ) : (
                      <code className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg text-slate-700 block max-w-sm truncate">
                        {JSON.stringify(c.value)}
                      </code>
                    )}
                  </td>
                  <td className="table-td">
                    {editingKey === c.key ? (
                      <div className="flex gap-2">
                        <button onClick={() => saveConfig(c.key)} disabled={saving}
                          className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors">
                          {saving ? '保存中...' : '保存'}
                        </button>
                        <button onClick={() => setEditingKey(null)}
                          className="text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">
                          取消
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingKey(c.key); setEditingValue(JSON.stringify(c.value, null, 2)); }}
                        className="text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 px-3 py-1.5 rounded-lg transition-colors">
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
