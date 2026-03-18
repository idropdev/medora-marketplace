import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabase =
    supabaseUrl && supabaseAnonKey
        ? createClient(supabaseUrl, supabaseAnonKey)
        : null;

// Dev-only connection test — remove before shipping
if (import.meta.env.DEV && supabase) {
    supabase
        .from('providers')
        .select('count', { count: 'exact', head: true })
        .then(({ count, error }) => {
            if (error) {
                console.error('[Supabase] ❌ Connection failed:', error.message);
            } else {
                console.log(`[Supabase] ✅ Connected — providers table has ${count ?? 0} rows`);
            }
        });
} else if (import.meta.env.DEV && !supabase) {
    console.warn('[Supabase] ⚠️  No env vars set — running without database');
}
