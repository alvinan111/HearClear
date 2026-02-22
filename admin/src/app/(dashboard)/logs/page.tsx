'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface LogRow {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  profiles: { phone: string } | null;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchLogs() {
      const { data } = await supabase
        .from('admin_logs')
        .select('*, profiles(phone)')
        .order('created_at', { ascending: false })
        .limit(500);
      setLogs((data ?? []) as LogRow[]);
      setLoading(false);
    }
    fetchLogs();
  }, []);

  if (loading) return <div className="text-center text-gray-400 py-20">加载中...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">操作日志</h1>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-700">管理员</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">操作</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">目标</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">详情</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">时间</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-blue-700">
                  {log.profiles?.phone ?? log.admin_id.slice(0, 8)}
                </td>
                <td className="px-4 py-3">
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{log.action}</code>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {log.target_type && <span className="mr-1">{log.target_type}:</span>}
                  {log.target_id?.slice(0, 12)}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                  {log.details ? JSON.stringify(log.details) : '-'}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(log.created_at).toLocaleString('zh-CN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
