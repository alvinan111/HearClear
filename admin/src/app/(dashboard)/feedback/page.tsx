'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface FeedbackRow {
  id: string;
  user_id: string | null;
  type: string;
  content: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
  profiles: { phone: string } | null;
}

const TYPE_LABELS: Record<string, string> = {
  bug: '🐛 问题',
  feature: '✨ 建议',
  complaint: '😤 投诉',
  other: '📝 其他',
};

const STATUS_OPTIONS = ['pending', 'processing', 'resolved', 'closed'];
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'bg-yellow-100 text-yellow-700' },
  processing: { label: '处理中', color: 'bg-blue-100 text-blue-700' },
  resolved: { label: '已解决', color: 'bg-green-100 text-green-700' },
  closed: { label: '已关闭', color: 'bg-gray-100 text-gray-500' },
};

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const supabase = createClient();

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  async function fetchFeedbacks() {
    const { data } = await supabase
      .from('feedbacks')
      .select('*, profiles(phone)')
      .order('created_at', { ascending: false })
      .limit(200);
    setFeedbacks((data ?? []) as FeedbackRow[]);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('feedbacks').update({ status }).eq('id', id);
    fetchFeedbacks();
  }

  async function submitReply(id: string) {
    await supabase
      .from('feedbacks')
      .update({ admin_reply: replyContent, status: 'resolved' })
      .eq('id', id);
    setReplyingId(null);
    setReplyContent('');
    fetchFeedbacks();
  }

  if (loading) return <div className="text-center text-gray-400 py-20">加载中...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">用户反馈</h1>
      <div className="space-y-4">
        {feedbacks.map((fb) => {
          const statusInfo = STATUS_LABELS[fb.status] ?? STATUS_LABELS.pending;
          return (
            <div key={fb.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">{TYPE_LABELS[fb.type] ?? fb.type}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                  {fb.profiles?.phone && (
                    <span className="text-xs text-gray-400 font-mono">{fb.profiles.phone}</span>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(fb.created_at).toLocaleString('zh-CN')}
                </span>
              </div>

              <p className="text-gray-800 mb-3">{fb.content}</p>

              {fb.admin_reply && (
                <div className="bg-blue-50 border-l-4 border-blue-400 px-4 py-2 rounded text-sm text-blue-800 mb-3">
                  <strong>管理员回复：</strong>{fb.admin_reply}
                </div>
              )}

              <div className="flex items-center gap-2">
                <select
                  value={fb.status}
                  onChange={(e) => updateStatus(fb.id, e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]?.label ?? s}</option>
                  ))}
                </select>
                <button
                  onClick={() => { setReplyingId(fb.id); setReplyContent(''); }}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200"
                >
                  回复
                </button>
              </div>

              {replyingId === fb.id && (
                <div className="mt-3">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="输入回复内容..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => submitReply(fb.id)} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs hover:bg-blue-700">
                      发送回复
                    </button>
                    <button onClick={() => setReplyingId(null)} className="bg-gray-200 text-gray-700 px-4 py-1.5 rounded-lg text-xs hover:bg-gray-300">
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
