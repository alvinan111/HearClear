import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_CONFIG } from '@config/app';

const FALLBACK_URL = 'https://reiirfhljlepxiibojzh.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlaWlyZmhsamxlcHhpaWJvanpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MjE4MDEsImV4cCI6MjA4NzI5NzgwMX0.-AhYX0zpVSBj-gf_v6gdOQMZChKltOQNHUDXc0biLPY';

export const supabase = createClient(
  SUPABASE_CONFIG.URL || FALLBACK_URL,
  SUPABASE_CONFIG.ANON_KEY || FALLBACK_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
