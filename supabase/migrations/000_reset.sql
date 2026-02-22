-- ============================================================
-- HearClear 数据库重置脚本
-- 警告：此脚本会删除所有用户数据！仅在开发/重建环境使用
-- ============================================================

-- --------------------------------------------------------
-- 第一步：删除触发器
-- --------------------------------------------------------
DROP TRIGGER IF EXISTS trg_profiles_updated_at  ON public.profiles;
DROP TRIGGER IF EXISTS trg_payments_updated_at  ON public.payments;
DROP TRIGGER IF EXISTS trg_feedbacks_updated_at ON public.feedbacks;

-- --------------------------------------------------------
-- 第二步：删除函数
-- --------------------------------------------------------
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(UUID) CASCADE;

-- --------------------------------------------------------
-- 第三步：删除所有表（按外键依赖倒序）
-- --------------------------------------------------------
DROP TABLE IF EXISTS public.ad_impressions      CASCADE;
DROP TABLE IF EXISTS public.banners             CASCADE;
DROP TABLE IF EXISTS public.admin_logs          CASCADE;
DROP TABLE IF EXISTS public.push_notifications  CASCADE;
DROP TABLE IF EXISTS public.feedbacks           CASCADE;
DROP TABLE IF EXISTS public.user_sessions       CASCADE;
DROP TABLE IF EXISTS public.app_versions        CASCADE;
DROP TABLE IF EXISTS public.app_config          CASCADE;
DROP TABLE IF EXISTS public.admin_roles         CASCADE;
DROP TABLE IF EXISTS public.payments            CASCADE;
DROP TABLE IF EXISTS public.subscriptions       CASCADE;
DROP TABLE IF EXISTS public.profiles            CASCADE;

-- ============================================================
-- 重建 Schema（来自 001_initial_schema.sql）
-- ============================================================

-- --------------------------------------------------------
-- 1. 用户 Profiles（扩展 auth.users）
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone                TEXT NOT NULL,
  nickname             TEXT,
  avatar_url           TEXT,
  first_use_at         TIMESTAMPTZ DEFAULT NOW(),
  last_active_at       TIMESTAMPTZ DEFAULT NOW(),
  total_usage_minutes  INTEGER NOT NULL DEFAULT 0,
  paywall_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  trial_days_override  INTEGER,
  is_banned            BOOLEAN NOT NULL DEFAULT FALSE,
  ban_reason           TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- 2. 订阅记录
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('daily','monthly','yearly','lifetime','unlimited')),
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ,
  granted_by   UUID REFERENCES public.profiles(id),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_status ON public.subscriptions(user_id, status);

-- --------------------------------------------------------
-- 3. 支付记录
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id   UUID REFERENCES public.subscriptions(id),
  subscription_type TEXT NOT NULL,
  amount_cents      INTEGER NOT NULL,
  channel           TEXT NOT NULL CHECK (channel IN ('wechat','alipay')),
  channel_order_id  TEXT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded')),
  paid_at           TIMESTAMPTZ,
  refund_reason     TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_status  ON public.payments(status);

-- --------------------------------------------------------
-- 4. 管理员角色
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin','admin','support')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

-- --------------------------------------------------------
-- 5. 全局远程配置（Key-Value）
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_config (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES public.profiles(id),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.app_config (key, value, description) VALUES
  ('default_paywall_enabled', 'true',                                                              '新用户默认是否开启付费'),
  ('default_trial_days',      '3',                                                                 '全局默认试用天数'),
  ('prices',                  '{"daily":100,"monthly":1800,"yearly":12800,"lifetime":29800}',      '各方案价格（分）'),
  ('recommended_plan',        '"yearly"',                                                          '推荐方案'),
  ('announcement',            'null',                                                              '全局公告，null=无'),
  ('ads_enabled',             'false',                                                             '广告总开关'),
  ('splash_ad_enabled',       'false',                                                             '开屏广告开关'),
  ('banner_ad_enabled',       'false',                                                             'Banner广告开关'),
  ('splash_ad_id',            '{"ios":"","android":""}',                                          '穿山甲开屏广告位ID'),
  ('banner_ad_id',            '{"ios":"","android":""}',                                          '穿山甲Banner广告位ID'),
  ('splash_ad_duration',      '5',                                                                 '开屏广告最长展示秒数')
ON CONFLICT (key) DO NOTHING;

-- --------------------------------------------------------
-- 6. 版本管理
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform        TEXT NOT NULL CHECK (platform IN ('ios','android')),
  latest_version  TEXT NOT NULL,
  min_version     TEXT NOT NULL,
  update_url      TEXT NOT NULL,
  release_notes   TEXT,
  is_force        BOOLEAN GENERATED ALWAYS AS (FALSE) STORED,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_app_versions_platform ON public.app_versions(platform, created_at DESC);

-- --------------------------------------------------------
-- 7. 用户会话（统计使用时长）
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at     TIMESTAMPTZ,
  duration_min INTEGER,
  device_info  JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);

-- --------------------------------------------------------
-- 8. 用户反馈
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type         TEXT NOT NULL CHECK (type IN ('bug','feature','complaint','other')),
  content      TEXT NOT NULL,
  contact_info TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','resolved','closed')),
  admin_reply  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- 9. 推送通知
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  target_type  TEXT NOT NULL CHECK (target_type IN ('all','paid','free','specific')),
  target_users UUID[],
  sent_at      TIMESTAMPTZ,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','failed')),
  created_by   UUID REFERENCES public.profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- 10. 操作日志（管理员操作审计）
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID NOT NULL REFERENCES public.profiles(id),
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  details     JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_logs_admin_id ON public.admin_logs(admin_id, created_at DESC);

-- --------------------------------------------------------
-- 11. 横幅/Banner 内容
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.banners (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT,
  image_url  TEXT NOT NULL,
  link_url   TEXT,
  position   TEXT NOT NULL DEFAULT 'home' CHECK (position IN ('home','paywall','splash')),
  sort_order INTEGER DEFAULT 0,
  is_active  BOOLEAN DEFAULT TRUE,
  start_at   TIMESTAMPTZ,
  end_at     TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- 12. 广告展示记录
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ad_impressions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ad_type    TEXT NOT NULL CHECK (ad_type IN ('splash','banner')),
  ad_id      TEXT NOT NULL,
  event      TEXT NOT NULL CHECK (event IN ('impression','click','skip','error')),
  platform   TEXT NOT NULL CHECK (platform IN ('ios','android')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ad_impressions_user_id ON public.ad_impressions(user_id, created_at DESC);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_versions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_impressions      ENABLE ROW LEVEL SECURITY;

-- 管理员判断函数
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_roles WHERE admin_roles.user_id = $1);
$$;

-- profiles
CREATE POLICY "用户只能读写自己的 profile"
  ON public.profiles FOR ALL
  USING (id = auth.uid() OR public.is_admin());

-- subscriptions
CREATE POLICY "用户只能读自己的订阅"
  ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "只有管理员可以写订阅"
  ON public.subscriptions FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "只有管理员可以更新订阅"
  ON public.subscriptions FOR UPDATE USING (public.is_admin());

-- payments
CREATE POLICY "用户只能读自己的支付记录"
  ON public.payments FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Service role 可写支付记录"
  ON public.payments FOR INSERT WITH CHECK (TRUE);

-- app_config
CREATE POLICY "所有用户可读远程配置"
  ON public.app_config FOR SELECT USING (TRUE);

CREATE POLICY "只有管理员可修改远程配置"
  ON public.app_config FOR ALL USING (public.is_admin());

-- app_versions
CREATE POLICY "所有用户可读版本信息"
  ON public.app_versions FOR SELECT USING (TRUE);

CREATE POLICY "只有管理员可管理版本"
  ON public.app_versions FOR ALL USING (public.is_admin());

-- feedbacks
CREATE POLICY "用户可提交反馈"
  ON public.feedbacks FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "用户可读自己的反馈"
  ON public.feedbacks FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- banners
CREATE POLICY "所有用户可读 Banner"
  ON public.banners FOR SELECT USING (is_active = TRUE);

CREATE POLICY "只有管理员可管理 Banner"
  ON public.banners FOR ALL USING (public.is_admin());

-- user_sessions
CREATE POLICY "用户只能读写自己的会话"
  ON public.user_sessions FOR ALL
  USING (user_id = auth.uid() OR public.is_admin());

-- admin_logs
CREATE POLICY "只有管理员可读操作日志"
  ON public.admin_logs FOR ALL USING (public.is_admin());

-- admin_roles（管理员才能管理角色）
CREATE POLICY "只有管理员可管理角色"
  ON public.admin_roles FOR ALL USING (public.is_admin());

-- push_notifications
CREATE POLICY "只有管理员可管理推送"
  ON public.push_notifications FOR ALL USING (public.is_admin());

-- ad_impressions
CREATE POLICY "任意用户可写广告记录"
  ON public.ad_impressions FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "只有管理员可读广告记录"
  ON public.ad_impressions FOR SELECT USING (public.is_admin());

-- ============================================================
-- 触发器：自动更新 updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_feedbacks_updated_at
  BEFORE UPDATE ON public.feedbacks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
