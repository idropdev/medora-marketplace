import { useState, useMemo, useEffect } from 'react';
import type { Provider, ProviderFilters } from '../types/provider';
import { supabase } from '../lib/supabase';
import { mockProviders } from '../data/providers';

const defaultFilters: ProviderFilters = {
    search: '',
    specialty: '',
    country: '',
    minRating: 0,
};

/**
 * PostgreSQL stores unquoted column names as all-lowercase.
 * Supabase therefore returns e.g. `googleplaceid` instead of `googlePlaceId`.
 * This function normalises any row coming from the DB back to the camelCase
 * fields our Provider interface expects.
 */
function normalizeProvider(row: any): Provider {
    return {
        ...row,
        // camelCase fields the seed script wrote as camelCase keys
        // (Postgres lowercases them on the way in, so we need to restore them)
        googlePlaceId: row.googlePlaceId ?? row.googleplaceid ?? undefined,
        reviewCount:   row.reviewCount   ?? row.reviewcount   ?? 0,
        imageUrl:      row.imageUrl      ?? row.imageurl      ?? undefined,
    };
}

export function useProviders() {
    const [allProviders, setAllProviders] = useState<Provider[]>([]);
    const [filters, setFilters] = useState<ProviderFilters>(defaultFilters);
    const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function fetchProviders() {
            if (!supabase) {
                console.warn('[Supabase] client not initialized. Falling back to mock providers.');
                if (mounted) setAllProviders(mockProviders);
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase.from('providers').select('*');
                
                if (error) {
                    console.error('[Supabase] Error fetching providers:', error);
                    if (mounted) setAllProviders(mockProviders);
                    return;
                }

                if (mounted && data) {
                    if (data.length > 0) {
                        const normalized = data.map(normalizeProvider);
                        // Debug: log the first provider to verify googlePlaceId is present
                        if (import.meta.env.DEV) {
                            const sample = normalized[0] as any;
                            console.log('[Providers] sample googlePlaceId:', sample?.googlePlaceId);
                        }
                        setAllProviders(normalized);
                    } else {
                        console.warn('[Supabase] No providers found in DB, using mock data.');
                        setAllProviders(mockProviders);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch providers:', err);
                if (mounted) setAllProviders(mockProviders);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        fetchProviders();

        return () => {
            mounted = false;
        };
    }, []);

    const filtered = useMemo(() => {
        return allProviders
            .filter((p) => {
                const q = filters.search.toLowerCase();
                if (q && !p.name.toLowerCase().includes(q) && !p.specialty.some((s) => s.toLowerCase().includes(q))) {
                    return false;
                }
                if (filters.specialty && !p.specialty.includes(filters.specialty)) return false;
                if (filters.country && p.country !== filters.country) return false;
                if (p.rating < filters.minRating) return false;
                return true;
            })
            .sort((a, b) => {
                // Promoted always first, then by rating
                if (a.promoted !== b.promoted) return a.promoted ? -1 : 1;
                return (b.rating || 0) - (a.rating || 0);
            });
    }, [allProviders, filters]);

    const updateFilter = <K extends keyof ProviderFilters>(key: K, value: ProviderFilters[K]) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const resetFilters = () => setFilters(defaultFilters);

    return {
        providers: filtered,
        allProviders,
        filters,
        updateFilter,
        resetFilters,
        selectedProvider,
        setSelectedProvider,
        loading
    };
}
