'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface VersionRow { id: string; platform: string; latest_version: string; min_version: string; update_url: string; release_notes: string | null; created_at: string; }
const EMPTY = { platform: 'android', latest_version: '', min_version: '', update_url: '', release_notes: '' };

export default function VersionsPage() {
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const supabase = createClient();

  useEffect(() => { fetchVersions(); }, []);

  async function fetchVersions() {
    const { data } = await supabase.from('app_versions').select('*').order('created_at', { ascending: false });
    setVersions((data ?? []) as VersionRow[]);
    setLoading(false);
  }

  async function submit() {
    if (!form.latest_version || !form.min_version || !form.update_url) { alert('请填写完整信息'); return; }
    await supabase.from('app_versions').insert({ ...form, release_notes: form.release_notes || null });
    setShowForm(false); setForm(EMPTY); fetchVersions();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">版本管理</h2>
          <p className="text-slate-500 text-sm mt-1">管理 App 更新推送</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ 发布新版本</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-5">发布新版本</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">平台</label>
              <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} className="input-base bg-white">
                <option value="android">🤖 Android</option>
                <option value="ios">🍎 iOS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">最新版本号</label>
              <input value={form.latest_version} onChange={e => setForm({ ...form, latest_version: e.target.value })} placeholder="1.2.0" className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">强制更新最低版本</label>
              <input value={form.min_version} onChange={e => setForm({ ...form, min_version: e.target.value })} placeholder="1.0.0" className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">下载地址</label>
              <input value={form.update_url} onChange={e => setForm({ ...form, update_url: e.target.value })} placeholder="https://..." className="input-base" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">更新说明</label>
              <textarea value={form.release_notes} onChange={e => setForm({ ...form, release_notes: e.target.value })} rows={3} placeholder="新版本改进内容..." className="input-base resize-none" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={submit} className="btn-primary">发布</button>
            <button onClick={() => setShowForm(false)} className="btn-ghost">取消</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-48 text-slate-400"><svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>加载中...</div> : (
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-100">
              <th className="table-th">平台</th><th className="table-th">最新版本</th>
              <th className="table-th">强制更新门槛</th><th className="table-th">更新说明</th><th className="table-th">发布时间</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {versions.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="table-td"><span className={`badge ${v.platform === 'ios' ? 'bg-slate-900 text-white' : 'badge-green'}`}>{v.platform === 'ios' ? '🍎 iOS' : '🤖 Android'}</span></td>
                  <td className="table-td font-mono font-bold text-indigo-600">{v.latest_version}</td>
                  <td className="table-td"><span className="badge badge-red font-mono">{v.min_version}</span></td>
                  <td className="table-td text-slate-500 max-w-xs truncate">{v.release_notes ?? '—'}</td>
                  <td className="table-td text-slate-400 text-xs">{new Date(v.created_at).toLocaleString('zh-CN')}</td>
                </tr>
              ))}
              {versions.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-16 text-sm">暂无版本记录</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
