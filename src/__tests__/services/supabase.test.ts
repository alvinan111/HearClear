/**
 * supabase.ts 配置安全测试
 */

describe('supabase configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses the configured Expo env vars to create the client', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://hearclear.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    const mockClient = { auth: {}, from: jest.fn() };
    const createClient = jest.fn(() => mockClient);

    jest.doMock('@supabase/supabase-js', () => ({
      createClient,
    }));

    const {
      supabase,
      isSupabaseConfigured,
      getSupabaseConfigurationError,
    } = require('@services/supabase') as typeof import('@services/supabase');

    expect(createClient).toHaveBeenCalledWith(
      'https://hearclear.supabase.co',
      'test-anon-key',
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        }),
      })
    );
    expect(supabase).toBe(mockClient);
    expect(isSupabaseConfigured).toBe(true);
    expect(getSupabaseConfigurationError()).toBeNull();
  });

  it('throws a helpful error instead of falling back to a hard-coded Supabase project', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    const createClient = jest.fn();
    jest.doMock('@supabase/supabase-js', () => ({
      createClient,
    }));

    const {
      supabase,
      isSupabaseConfigured,
      getSupabaseConfigurationError,
    } = require('@services/supabase') as typeof import('@services/supabase');

    expect(isSupabaseConfigured).toBe(false);
    expect(getSupabaseConfigurationError()).toContain('EXPO_PUBLIC_SUPABASE_URL');
    expect(getSupabaseConfigurationError()).toContain('EXPO_PUBLIC_SUPABASE_ANON_KEY');
    expect(createClient).not.toHaveBeenCalled();
    expect(() => supabase.from('profiles')).toThrow(
      /Supabase is not configured/
    );
  });
});
