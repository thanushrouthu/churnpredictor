import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  'https://jjydnxwjwmafyrcxlypi.supabase.co';

const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqeWRueHdqd21hZnlyY3hseXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NzIwMjYsImV4cCI6MjEwNDM0ODAyNn0.wUgjtQJ9LOGkNuKPr2A1_YN82EfFs5ptVJRPeIs__HQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
