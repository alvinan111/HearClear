'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError('邮箱或密码错误，请重试');
      setLoading(false);
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex">
      {/* Left: branding */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 to-slate-900" />
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 rounded-3xl bg-indigo-500 flex items-center justify-center text-4xl mx-auto mb-8 shadow-2xl shadow-indigo-500/40">
            👂
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">HearClear</h1>
          <p className="text-slate-400 text-lg">AI 助听器运营管理系统</p>
          <div className="mt-12 grid grid-cols-3 gap-4 text-center">
            {[['用户管理', '实时同步'], ['订单追踪', '精准统计'], ['远程配置', '一键生效']].map(([t, s]) => (
              <div key={t} className="bg-slate-800/60 rounded-2xl p-4">
                <p className="text-white font-semibold text-sm">{t}</p>
                <p className="text-slate-500 text-xs mt-1">{s}</p>
              </div>
            ))}
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-indigo-600/10" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-indigo-600/10" />
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center text-2xl">👂</div>
            <span className="text-xl font-bold text-slate-900">HearClear 管理后台</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">欢迎回来</h2>
          <p className="text-slate-500 text-sm mb-8">请使用管理员账号登录</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">邮箱地址</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@hearclear.app"
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="input-base"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2"
            >
              {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-8">仅限授权管理员访问 · HearClear &copy; 2025</p>
        </div>
      </div>
    </div>
  );
}
