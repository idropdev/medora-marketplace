import { useState, useMemo, useEffect } from 'react';
import type { Provider, ProviderFilters } from '../types/provider';
import { supabase } from '../lib/supabase';

const defaultFilters: ProviderFilters = {
    search: '',
    specialty: '',
    country: '',
    minRating: 0,
};

export function useProviders() {
    const [allProviders, setAllProviders] = useState<Provider[]>([]);
    const [filters, setFilters] = useState<ProviderFilters>(defaultFilters);
    const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function fetchProviders() {
            if (!supabase) {
                console.warn('Supabase client not initialized');
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase.from('providers').select('*');
                
                if (error) {
                    console.error('Error fetching providers:', error);
                    return;
                }

                if (mounted && data) {
                    setAllProviders(data as Provider[]);
                }
            } catch (err) {
                console.error('Failed to fetch providers:', err);
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
