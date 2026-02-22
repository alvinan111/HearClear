'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface FeedbackRow {
  id: string; user_id: string | null; type: string; content: string;
  contact_info: string | null; status: string; created_at: string;
  profiles: { phone: string } | null;
}

const TYPE_LABEL: Record<string, string> = { bug: '🐛 Bug', feature: '✨ 功能', other: '💬 其他' };
const STATUS: Record<string, [string, string]> = {
  pending:  ['待处理', 'badge-amber'],
  resolved: ['已解决', 'badge-green'],
  ignored:  ['已忽略', 'badge-gray'],
};

export default function FeedbackPage() {
  const [list, setList] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const supabase = createClient();

  useEffect(() => { fetchList(); }, [filter]);

  async function fetchList() {
    setLoading(true);
    let q = supabase.from('feedbacks').select('*, profiles(phone)').order('created_at', { ascending: false }).limit(100);
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    setList((data ?? []) as FeedbackRow[]);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('feedbacks').update({ status }).eq('id', id);
    fetchList();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">用户反馈</h2>
          <p className="text-slate-500 text-sm mt-1">查看并处理用户提交的反馈</p>
        </div>
        <div className="flex gap-2">
          {[['pending','待处理'],['resolved','已解决'],['all','全部']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === v ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400">
          <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>加载中...
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((f) => {
            const [statusLabel, statusCls] = STATUS[f.status] ?? [f.status, 'badge-gray'];
            return (
              <div key={f.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-600">{TYPE_LABEL[f.type] ?? f.type}</span>
                      <span className={`badge ${statusCls}`}>{statusLabel}</span>
                      <span className="text-xs text-slate-400">{f.profiles?.phone ?? '匿名用户'}</span>
                      <span className="text-xs text-slate-400 ml-auto">{new Date(f.created_at).toLocaleString('zh-CN')}</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{f.content}</p>
                    {f.contact_info && <p className="text-xs text-indigo-600 mt-2">联系方式：{f.contact_info}</p>}
                  </div>
                  {f.status === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => updateStatus(f.id, 'resolved')}
                        className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors">
                        标记解决
                      </button>
                      <button onClick={() => updateStatus(f.id, 'ignored')}
                        className="text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">
                        忽略
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {list.length === 0 && (
            <div className="text-center text-slate-400 py-16 bg-white rounded-2xl border border-slate-100">
              <p className="text-4xl mb-3">🎉</p>
              <p className="text-sm">暂无{filter === 'pending' ? '待处理的' : ''}反馈</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
