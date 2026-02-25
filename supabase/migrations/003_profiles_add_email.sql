-- 支持邮箱登录：profiles 增加 email，phone 改为可空（邮箱登录用户可为空）
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ALTER COLUMN phone DROP NOT NULL;

COMMENT ON COLUMN public.profiles.email IS '用户邮箱，邮箱登录时必填';
