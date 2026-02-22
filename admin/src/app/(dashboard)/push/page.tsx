'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface PushRow {
  id: string;
  title: string;
  body: string;
  target_type: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

export default function PushPage() {
  const [pushes, setPushes] = useState<PushRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', body: '', target_type: 'all' });
  const [showForm, setShowForm] = useState(false);
  const supabase = createClient();

  useEffect(() => { fetchPushes(); }, []);

  async function fetchPushes() {
    const { data } = await supabase
      .from('push_notifications')
      .select('*')
      .order('created_at', { ascending: false });
    setPushes((data ?? []) as PushRow[]);
    setLoading(false);
  }

  async function createPush() {
    if (!form.title || !form.body) { alert('请填写标题和内容'); return; }
    await supabase.from('push_notifications').insert({
      title: form.title,
      body: form.body,
      target_type: form.target_type,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });
    setShowForm(false);
    setForm({ title: '', body: '', target_type: 'all' });
    fetchPushes();
  }

  const TARGET_LABELS: Record<string, string> = {
    all: '📢 全体用户',
    paid: '⭐ 付费用户',
    free: '🆓 免费用户',
    specific: '🎯 指定用户',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">推送通知</h1>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + 发送通知
        </button>
      </div>

      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">新建推送</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="推送标题" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
              <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={3} placeholder="推送内容" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">目标用户</label>
              <select value={form.target_type} onChange={(e) => setForm({ ...form, target_type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="all">全体用户</option>
                <option value="paid">付费用户</option>
                <option value="free">免费用户</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={createPush} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">发送</button>
            <button onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg text-sm hover:bg-gray-300">取消</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-20">加载中...</div>
      ) : (
        <div className="space-y-3">
          {pushes.map((push) => (
            <div key={push.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900">{push.title}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{TARGET_LABELS[push.target_type] ?? push.target_type}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${push.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {push.status === 'sent' ? '已发送' : push.status}
                  </span>
                </div>
              </div>
              <p className="text-gray-600 text-sm">{push.body}</p>
              <p className="text-xs text-gray-400 mt-2">{new Date(push.created_at).toLocaleString('zh-CN')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
