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
    <div className="min-h-screen flex bg-[#0a0a0c]">
      {/* Left: branding - premium dark */}
      <div className="hidden lg:flex w-[55%] flex-col items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(6,182,212,0.15),transparent)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-500/[0.03] blur-3xl" />
        <div className="relative z-10 text-center max-w-md">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center mx-auto mb-8 shadow-lg shadow-cyan-500/20">
            <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h3l-3.5-3.5M19 12a7 7 0 11-14 0 7 7 0 0114 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 19a2 2 0 100-4 2 2 0 000 4z"/></svg>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-3">HearClear</h1>
          <p className="text-zinc-500 text-base font-medium">AI 助听器 · 运营管理平台</p>
          <div className="mt-12 grid grid-cols-3 gap-3 text-left">
            {[['用户管理', '实时同步'], ['订单追踪', '精准统计'], ['远程配置', '一键生效']].map(([t, s]) => (
              <div key={t} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-white/[0.1] transition-colors">
                <p className="text-white font-semibold text-sm">{t}</p>
                <p className="text-zinc-500 text-xs mt-1">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h3l-3.5-3.5M19 12a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <span className="text-lg font-bold text-white">HearClear</span>
          </div>

          <h2 className="text-2xl font-bold text-white tracking-tight mb-1">欢迎回来</h2>
          <p className="text-zinc-500 text-sm mb-8">请使用管理员账号登录</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">邮箱地址</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@hearclear.app" className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">密码</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="input-base" />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 mt-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition-all disabled:opacity-60">
              {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <p className="text-center text-xs text-zinc-600 mt-10">仅限授权管理员 · HearClear &copy; 2025</p>
        </div>
      </div>
    </div>
  );
}
