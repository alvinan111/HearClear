'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface ConfigRow {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
}

export default function RemoteConfigPage() {
  const [configs, setConfigs] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const supabase = createClient();

  useEffect(() => {
    fetchConfigs();
  }, []);

  async function fetchConfigs() {
    const { data } = await supabase
      .from('app_config')
      .select('*')
      .order('key');
    setConfigs((data ?? []) as ConfigRow[]);
    setLoading(false);
  }

  function startEdit(config: ConfigRow) {
    setEditingKey(config.key);
    setEditingValue(JSON.stringify(config.value, null, 2));
  }

  async function saveConfig(key: string) {
    try {
      const value = JSON.parse(editingValue);
      await supabase
        .from('app_config')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', key);

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('admin_logs').insert({
          admin_id: session.user.id,
          action: 'update_config',
          target_type: 'config',
          target_id: key,
          details: { new_value: value },
        });
      }

      setEditingKey(null);
      fetchConfigs();
    } catch {
      alert('JSON 格式错误，请检查输入');
    }
  }

  // 特殊控件：公告
  const announcementConfig = configs.find((c) => c.key === 'announcement');

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">远程配置</h1>

      {/* 公告快捷编辑 */}
      {announcementConfig && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">📢 全局公告</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={announcementConfig.value === null ? '' : String(announcementConfig.value)}
              placeholder="输入公告内容（留空=不显示）"
              className="flex-1 border border-blue-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={async (e) => {
                const val = e.target.value || null;
                await supabase
                  .from('app_config')
                  .update({ value: val })
                  .eq('key', 'announcement');
                fetchConfigs();
              }}
            />
            <button
              onClick={async () => {
                await supabase
                  .from('app_config')
                  .update({ value: null })
                  .eq('key', 'announcement');
                fetchConfigs();
              }}
              className="px-4 py-2 bg-white border border-blue-300 rounded-lg text-sm text-blue-700 hover:bg-blue-100"
            >
              清除
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
                <th className="text-left px-4 py-3 font-semibold text-gray-700 w-1/4">配置键</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 w-1/4">描述</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 w-1/3">当前值</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config) => (
                <tr key={config.key} className="border-b border-gray-100">
                  <td className="px-4 py-3 font-mono text-blue-700">{config.key}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{config.description}</td>
                  <td className="px-4 py-3">
                    {editingKey === config.key ? (
                      <textarea
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="w-full border border-blue-400 rounded-lg p-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                    ) : (
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 block max-w-xs truncate">
                        {JSON.stringify(config.value)}
                      </code>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingKey === config.key ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveConfig(config.key)}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingKey(null)}
                          className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(config)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200"
                      >
                        编辑
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
