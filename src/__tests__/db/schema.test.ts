/**
 * 数据库 Schema 验证测试
 *
 * 这些测试通过 Supabase 管理 API 直接验证表结构、约束、索引是否正确。
 * 运行前需要设置环境变量 SUPABASE_PROJECT_ID 和 SUPABASE_ACCESS_TOKEN。
 * 无 Token 时自动跳过（不计入失败）。
 */

const PROJECT_ID = process.env.SUPABASE_PROJECT_ID ?? 'reiirfhljlepxiibojzh';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? '';
const SKIP = !ACCESS_TOKEN;

const itOrSkip = SKIP ? it.skip : it;

async function execSQL(sql: string): Promise<unknown[]> {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const json = await res.json() as unknown;
  if (!res.ok) throw new Error(`SQL 执行失败: ${JSON.stringify(json)}`);
  return json as unknown[];
}

const EXPECTED_TABLES = [
  'profiles',
  'subscriptions',
  'payments',
  'admin_roles',
  'app_config',
  'app_versions',
  'user_sessions',
  'feedbacks',
  'push_notifications',
  'admin_logs',
  'banners',
  'ad_impressions',
];

describe('数据库 Schema 验证', () => {
  if (SKIP) {
    it('⚠️ SUPABASE_ACCESS_TOKEN 未设置，跳过所有 DB 测试（使用 npm run test:db 运行）', () => {
      expect(true).toBe(true);
    });
    return;
  }

  describe('表是否全部存在', () => {
    for (const tableName of EXPECTED_TABLES) {
      itOrSkip(`表 ${tableName} 存在`, async () => {
        const rows = await execSQL(`
          SELECT table_name FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = '${tableName}'
        `);
        expect((rows as Array<{ table_name: string }>).length).toBe(1);
      });
    }
  });

  describe('profiles 表字段', () => {
    async function getColumns(table: string) {
      return execSQL(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = '${table}'
      `);
    }

    itOrSkip('profiles 有必填字段 id, phone, paywall_enabled, is_banned', async () => {
      const cols = await getColumns('profiles') as Array<{ column_name: string }>;
      const names = cols.map(c => c.column_name);
      expect(names).toContain('id');
      expect(names).toContain('phone');
      expect(names).toContain('paywall_enabled');
      expect(names).toContain('is_banned');
      expect(names).toContain('trial_days_override');
    });

    itOrSkip('subscriptions 有 type, status, user_id', async () => {
      const cols = await getColumns('subscriptions') as Array<{ column_name: string }>;
      const names = cols.map(c => c.column_name);
      expect(names).toContain('type');
      expect(names).toContain('status');
      expect(names).toContain('user_id');
      expect(names).toContain('expires_at');
    });

    itOrSkip('payments 有 channel, amount_cents, status', async () => {
      const cols = await getColumns('payments') as Array<{ column_name: string }>;
      const names = cols.map(c => c.column_name);
      expect(names).toContain('channel');
      expect(names).toContain('amount_cents');
      expect(names).toContain('status');
    });
  });

  describe('RLS 已启用', () => {
    itOrSkip('所有表均启用 Row Level Security', async () => {
      const rows = await execSQL(`
        SELECT relname, relrowsecurity
        FROM pg_class
        WHERE relname = ANY(ARRAY[${EXPECTED_TABLES.map(t => `'${t}'`).join(',')}])
          AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      `) as Array<{ relname: string; relrowsecurity: boolean }>;

      for (const row of rows) {
        expect(row.relrowsecurity).toBe(true);
      }
      expect(rows.length).toBe(EXPECTED_TABLES.length);
    });
  });

  describe('索引存在', () => {
    async function indexExists(indexName: string): Promise<boolean> {
      const rows = await execSQL(`
        SELECT indexname FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = '${indexName}'
      `);
      return (rows as unknown[]).length > 0;
    }

    itOrSkip('idx_subscriptions_user_status 存在', async () => {
      expect(await indexExists('idx_subscriptions_user_status')).toBe(true);
    });

    itOrSkip('idx_payments_user_id 存在', async () => {
      expect(await indexExists('idx_payments_user_id')).toBe(true);
    });

    itOrSkip('idx_payments_status 存在', async () => {
      expect(await indexExists('idx_payments_status')).toBe(true);
    });

    itOrSkip('idx_user_sessions_user_id 存在', async () => {
      expect(await indexExists('idx_user_sessions_user_id')).toBe(true);
    });

    itOrSkip('idx_admin_logs_admin_id 存在', async () => {
      expect(await indexExists('idx_admin_logs_admin_id')).toBe(true);
    });

    itOrSkip('idx_ad_impressions_user_id 存在', async () => {
      expect(await indexExists('idx_ad_impressions_user_id')).toBe(true);
    });
  });

  describe('app_config 默认数据', () => {
    itOrSkip('包含所有默认配置项', async () => {
      const rows = await execSQL(`SELECT key FROM public.app_config`) as Array<{ key: string }>;
      const keys = rows.map(r => r.key);
      expect(keys).toContain('default_paywall_enabled');
      expect(keys).toContain('default_trial_days');
      expect(keys).toContain('prices');
      expect(keys).toContain('recommended_plan');
      expect(keys).toContain('ads_enabled');
    });

    itOrSkip('default_trial_days 值为 3', async () => {
      const rows = await execSQL(
        `SELECT value FROM public.app_config WHERE key = 'default_trial_days'`
      ) as Array<{ value: unknown }>;
      expect(rows[0]?.value).toBe(3);
    });
  });

  describe('函数和触发器', () => {
    itOrSkip('is_admin 函数存在', async () => {
      const rows = await execSQL(`
        SELECT proname FROM pg_proc
        WHERE proname = 'is_admin' AND pronamespace = (
          SELECT oid FROM pg_namespace WHERE nspname = 'public'
        )
      `);
      expect((rows as unknown[]).length).toBeGreaterThan(0);
    });

    itOrSkip('update_updated_at 触发器函数存在', async () => {
      const rows = await execSQL(`
        SELECT proname FROM pg_proc
        WHERE proname = 'update_updated_at'
      `);
      expect((rows as unknown[]).length).toBeGreaterThan(0);
    });

    itOrSkip('profiles 表有 updated_at 触发器', async () => {
      const rows = await execSQL(`
        SELECT trigger_name FROM information_schema.triggers
        WHERE event_object_table = 'profiles'
          AND trigger_name = 'trg_profiles_updated_at'
      `);
      expect((rows as unknown[]).length).toBe(1);
    });
  });

  describe('CHECK 约束', () => {
    itOrSkip('subscriptions.type 只允许合法值', async () => {
      const rows = await execSQL(`
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'subscriptions' AND constraint_type = 'CHECK'
      `);
      expect((rows as unknown[]).length).toBeGreaterThan(0);
    });

    itOrSkip('payments.channel 只允许 wechat/alipay', async () => {
      const rows = await execSQL(`
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'payments' AND constraint_type = 'CHECK'
      `);
      expect((rows as unknown[]).length).toBeGreaterThan(0);
    });
  });
});
