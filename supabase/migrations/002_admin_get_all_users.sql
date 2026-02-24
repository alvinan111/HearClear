-- 管理员获取全部用户（含未登录/无手机号）：auth.users LEFT JOIN profiles
-- 仅管理员可调用
CREATE OR REPLACE FUNCTION public.admin_get_all_users(p_search text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  email text,
  phone text,
  nickname text,
  paywall_enabled boolean,
  is_banned boolean,
  created_at timestamptz,
  total_usage_minutes integer,
  has_profile boolean,
  sub_type text,
  sub_status text,
  sub_expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    COALESCE(p.phone, '')::text,
    p.nickname,
    COALESCE(p.paywall_enabled, true),
    COALESCE(p.is_banned, false),
    u.created_at,
    COALESCE(p.total_usage_minutes, 0),
    (p.id IS NOT NULL),
    s.type,
    s.status,
    s.expires_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN LATERAL (
    SELECT type, status, expires_at
    FROM public.subscriptions
    WHERE user_id = u.id AND status = 'active'
    ORDER BY started_at DESC
    LIMIT 1
  ) s ON true
  WHERE (
    p_search IS NULL OR p_search = ''
    OR COALESCE(p.phone, '') ILIKE '%' || p_search || '%'
    OR COALESCE(u.email, '')::text ILIKE '%' || p_search || '%'
    OR COALESCE(p.nickname, '') ILIKE '%' || p_search || '%'
    OR u.id::text ILIKE '%' || p_search || '%'
  )
  ORDER BY u.created_at DESC
  LIMIT 200;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_all_users(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_all_users(text) TO service_role;
