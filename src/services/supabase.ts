import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_CONFIG } from '@config/app';

const missingSupabaseEnv = [
  !SUPABASE_CONFIG.URL && 'EXPO_PUBLIC_SUPABASE_URL',
  !SUPABASE_CONFIG.ANON_KEY && 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
].filter(Boolean) as string[];

export const isSupabaseConfigured = missingSupabaseEnv.length === 0;

export function getSupabaseConfigurationError(): string | null {
  if (isSupabaseConfigured) return null;
  return `Supabase is not configured. Missing env vars: ${missingSupabaseEnv.join(', ')}`;
}

function createUnconfiguredClient(): SupabaseClient {
  const message = getSupabaseConfigurationError() ?? 'Supabase is not configured.';

  return new Proxy(
    {},
    {
      get() {
        throw new Error(message);
      },
    }
  ) as SupabaseClient;
}

export const supabase = isSupabaseConfigured
  ? createClient(
      SUPABASE_CONFIG.URL,
      SUPABASE_CONFIG.ANON_KEY,
      {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      }
    )
  : createUnconfiguredClient();
