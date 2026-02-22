'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface BannerRow {
  id: string;
  title: string | null;
  image_url: string;
  link_url: string | null;
  position: string;
  sort_order: number;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
}

export default function BannersPage() {
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => { fetchBanners(); }, []);

  async function fetchBanners() {
    const { data } = await supabase
      .from('banners')
      .select('*')
      .order('sort_order', { ascending: true });
    setBanners((data ?? []) as BannerRow[]);
    setLoading(false);
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('banners').update({ is_active: !current }).eq('id', id);
    fetchBanners();
  }

  async function deleteBanner(id: string) {
    if (!confirm('确定删除该 Banner？')) return;
    await supabase.from('banners').delete().eq('id', id);
    fetchBanners();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">内容管理（Banner）</h1>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-20">加载中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map((banner) => (
            <div key={banner.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <img src={banner.image_url} alt={banner.title ?? ''} className="w-full h-40 object-cover" />
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900 text-sm">{banner.title ?? '(无标题)'}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${banner.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {banner.is_active ? '展示中' : '已隐藏'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  位置：{banner.position} · 排序：{banner.sort_order}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => toggleActive(banner.id, banner.is_active)}
                    className="flex-1 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200">
                    {banner.is_active ? '隐藏' : '展示'}
                  </button>
                  <button onClick={() => deleteBanner(banner.id)}
                    className="flex-1 py-1.5 bg-red-50 text-red-600 text-xs rounded-lg hover:bg-red-100">
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
          {banners.length === 0 && (
            <div className="col-span-full text-center text-gray-400 py-20">
              暂无 Banner，可通过 Supabase 控制台添加
            </div>
          )}
        </div>
      )}
    </div>
  );
}
