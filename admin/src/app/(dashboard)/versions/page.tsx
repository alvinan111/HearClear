'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface VersionRow {
  id: string;
  platform: string;
  latest_version: string;
  min_version: string;
  update_url: string;
  release_notes: string | null;
  created_at: string;
}

export default function VersionsPage() {
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    platform: 'ios',
    latest_version: '',
    min_version: '',
    update_url: '',
    release_notes: '',
  });
  const supabase = createClient();

  useEffect(() => {
    fetchVersions();
  }, []);

  async function fetchVersions() {
    const { data } = await supabase
      .from('app_versions')
      .select('*')
      .order('created_at', { ascending: false });
    setVersions((data ?? []) as VersionRow[]);
    setLoading(false);
  }

  async function submitVersion() {
    if (!form.latest_version || !form.min_version || !form.update_url) {
      alert('请填写完整信息');
      return;
    }
    await supabase.from('app_versions').insert({
      platform: form.platform,
      latest_version: form.latest_version,
      min_version: form.min_version,
      update_url: form.update_url,
      release_notes: form.release_notes || null,
    });
    setShowForm(false);
    setForm({ platform: 'ios', latest_version: '', min_version: '', update_url: '', release_notes: '' });
    fetchVersions();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">版本管理</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + 发布新版本
        </button>
      </div>

      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">发布新版本</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">平台</label>
              <select
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="ios">iOS</option>
                <option value="android">Android</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">最新版本号</label>
              <input
                type="text"
                placeholder="如：1.2.0"
                value={form.latest_version}
                onChange={(e) => setForm({ ...form, latest_version: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">强制更新最低版本</label>
              <input
                type="text"
                placeholder="如：1.0.0（低于此版本强制更新）"
                value={form.min_version}
                onChange={(e) => setForm({ ...form, min_version: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">更新下载地址</label>
              <input
                type="text"
                placeholder="App Store / Google Play URL"
                value={form.update_url}
                onChange={(e) => setForm({ ...form, update_url: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">更新说明</label>
              <textarea
                placeholder="新版本更新内容..."
                value={form.release_notes}
                onChange={(e) => setForm({ ...form, release_notes: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                rows={3}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={submitVersion} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              发布
            </button>
            <button onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg text-sm hover:bg-gray-300">
              取消
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-20">加载中...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">平台</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">最新版本</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">强制更新门槛</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">更新说明</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">发布时间</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${v.platform === 'ios' ? 'bg-gray-900 text-white' : 'bg-green-100 text-green-700'}`}>
                      {v.platform === 'ios' ? '🍎 iOS' : '🤖 Android'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-blue-700">{v.latest_version}</td>
                  <td className="px-4 py-3 font-mono text-red-600">{v.min_version}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{v.release_notes ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(v.created_at).toLocaleString('zh-CN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
