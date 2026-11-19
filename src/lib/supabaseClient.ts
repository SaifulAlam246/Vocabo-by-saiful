import { createClient, SupabaseClient } from '@supabase/supabase-js';

function cleanEnvValue(raw: unknown, expectedKeyName?: string): string {
  if (typeof raw !== 'string') return '';
  let val = raw.trim().replace(/^["']|["']$/g, '').trim();
  if (expectedKeyName && val.startsWith(`${expectedKeyName}=`)) {
    val = val
      .slice(expectedKeyName.length + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
      .trim();
  }
  return val;
}

function isValidSupabaseHttpUrl(value: string): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      Boolean(parsed.hostname) &&
      !value.includes('YOUR_SUPABASE') &&
      !value.includes('MY_SUPABASE')
    );
  } catch {
    return false;
  }
}

const supabaseUrl = cleanEnvValue(import.meta.env.VITE_SUPABASE_URL, 'VITE_SUPABASE_URL');
const supabaseAnonKey = cleanEnvValue(
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  'VITE_SUPABASE_ANON_KEY'
);

let client: SupabaseClient | null = null;
let configError: string | null = null;

if (supabaseUrl && supabaseAnonKey) {
  if (!isValidSupabaseHttpUrl(supabaseUrl)) {
    configError =
      'VITE_SUPABASE_URL is set, but it is not a valid http(s) URL (for example: https://your-project-ref.supabase.co).';
  } else {
    try {
      client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err) {
      client = null;
      configError =
        err instanceof Error
          ? `Unable to initialize Supabase client: ${err.message}`
          : 'Unable to initialize Supabase client.';
    }
  }
} else if (supabaseUrl && !supabaseAnonKey) {
  configError = 'VITE_SUPABASE_URL is set, but VITE_SUPABASE_ANON_KEY is missing.';
} else if (!supabaseUrl && supabaseAnonKey) {
  configError = 'VITE_SUPABASE_ANON_KEY is set, but VITE_SUPABASE_URL is missing.';
}

export const supabase: SupabaseClient | null = client;
export const isSupabaseConfigured = Boolean(client);
export const supabaseConfigError: string | null = configError;

