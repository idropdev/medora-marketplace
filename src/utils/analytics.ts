import type { Provider } from '../types/provider';

/**
 * Track a click on a provider profile.
 * Stub for MVP — will POST to Supabase when keys are configured.
 */
export async function trackProviderClick(provider: Provider): Promise<void> {
    // Log in dev
    if (import.meta.env.DEV) {
        console.log(`[analytics] click: ${provider.id} — ${provider.name}`);
    }

    // TODO: swap with Supabase increment when live
    // await supabase.rpc('increment_clicks', { provider_id: provider.id });
}
