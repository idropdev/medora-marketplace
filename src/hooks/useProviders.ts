import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Provider, ProviderFilters } from '../types/provider';
import { SpecialtyLabels } from '../types/provider';
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
        doctoraliaId:  row.doctoraliaId  ?? row.doctoraliaid  ?? undefined,
        reviewCount:   row.reviewCount   ?? row.reviewcount   ?? 0,
        imageUrl:      row.imageUrl      ?? row.imageurl      ?? undefined,
        bookingUrl:    row.bookingUrl    ?? row.bookingurl    ?? undefined,
        insurances:    row.insurances    ?? [],
    };
}

/** Case/accent-insensitive, so "juarez" finds "Juárez" and "pediatria" finds "Pediatría". */
function fold(s: string): string {
    let out = '';
    // Decompose, then drop the combining-diacritic block (U+0300–U+036F).
    for (const ch of s.toLowerCase().normalize('NFD')) {
        const code = ch.codePointAt(0)!;
        if (code >= 0x300 && code <= 0x36f) continue;
        out += ch;
    }
    return out;
}

export function useProviders() {
    const { t } = useTranslation();
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
                // Supabase caps a single select at 1000 rows. The directory is
                // larger than that, so page through or the map silently shows a
                // fraction of the providers.
                const PAGE_SIZE = 1000;
                const data: Record<string, unknown>[] = [];
                let error: { message: string } | null = null;

                for (let from = 0; ; from += PAGE_SIZE) {
                    const page = await supabase
                        .from('providers')
                        .select('*')
                        .range(from, from + PAGE_SIZE - 1);

                    if (page.error) {
                        error = page.error;
                        break;
                    }
                    data.push(...(page.data ?? []));
                    if (!page.data || page.data.length < PAGE_SIZE) break;
                }

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
        const q = fold(filters.search.trim());

        return allProviders
            .filter((p) => {
                if (q) {
                    // Search covers clinic identity (name, city, address) AND tags.
                    // Tags are matched in the active language, in Spanish/English
                    // fallbacks, and by raw key — so "dentist", "dentista" and
                    // "dentist" all find the same clinics regardless of UI language.
                    const haystack = [
                        p.name,
                        p.city,
                        p.address ?? '',
                        ...p.specialty,
                        ...p.specialty.map((s) => t(`specialties.${s}`, { defaultValue: s })),
                        ...p.specialty.map((s) => SpecialtyLabels[s] ?? s),
                    ];
                    if (!haystack.some((field) => fold(String(field)).includes(q))) return false;
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
    }, [allProviders, filters, t]);

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
