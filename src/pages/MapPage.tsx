import { useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useProviders } from '../hooks/useProviders';
import { MapPin, List } from 'lucide-react';
import { SearchBar } from '../components/search/SearchBar';
import { FilterBar } from '../components/search/FilterBar';
import { ProviderCard } from '../components/provider/ProviderCard';
import { ProviderDrawer } from '../components/provider/ProviderDrawer';
import { MapView } from '../components/map/MapView';
import { trackProviderClick } from '../utils/analytics';

export function MapPage() {
    const { providers, filters, updateFilter, resetFilters, selectedProvider, setSelectedProvider, loading } = useProviders();
    const [mobileView, setMobileView] = useState<'map' | 'list'>('map');
    const sidebarRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: providers.length,
        getScrollElement: () => sidebarRef.current,
        estimateSize: () => 105, // Height of card (~95px) + gap
        overscan: 5,
    });

    const handleSelect = (p: typeof providers[0]) => {
        trackProviderClick(p);
        setSelectedProvider(selectedProvider?.id === p.id ? null : p);
    };

    return (
        <div style={{ display: 'flex', height: '100vh', paddingTop: 60, overflow: 'hidden' }}>
            {/* ── Left sidebar ── */}
            <aside ref={sidebarRef} className={`map-sidebar ${mobileView === 'map' ? 'hidden-on-mobile' : ''}`}>
                {/* Search + Filters */}
                <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'sticky', top: 0, background: 'var(--navy)', zIndex: 10 }}>
                    <SearchBar value={filters.search} onChange={(v) => updateFilter('search', v)} />
                    <FilterBar filters={filters} updateFilter={updateFilter} resetFilters={resetFilters} count={providers.length} />
                </div>

                {/* Provider list */}
                <div style={{ padding: '0.75rem' }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} style={{
                                    width: '100%', height: '100px',
                                    background: 'var(--surface)',
                                    borderRadius: 'var(--radius)',
                                    animation: 'pulse-gold 2s infinite ease-in-out',
                                    opacity: Math.max(0.2, 1 - (i * 0.15)),
                                }} />
                            ))}
                        </div>
                    ) : providers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--gray-400)', fontSize: '0.875rem' }}>
                            <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔍</p>
                            <p style={{ marginBottom: '0.5rem' }}>No providers match your filters.</p>
                            <button onClick={resetFilters} style={{ color: 'var(--gold)', background: 'none', fontSize: '0.875rem', marginBottom: '1.5rem', fontWeight: 600 }}>
                                Clear filters
                            </button>
                            <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                                <p style={{ marginBottom: '0.75rem' }}>Know a clinic that should be here?</p>
                                <a href="mailto:hello@medora.com?subject=Suggest%20a%20Clinic" style={{
                                    display: 'inline-flex', padding: '0.5rem 1rem', borderRadius: 'var(--radius-pill)',
                                    background: 'var(--surface)', border: '1px solid var(--border)',
                                    color: 'var(--white)', fontWeight: 600, fontSize: '0.85rem'
                                }}>
                                    Suggest a Clinic
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div
                            style={{
                                height: `${rowVirtualizer.getTotalSize()}px`,
                                width: '100%',
                                position: 'relative',
                            }}
                        >
                            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                const p = providers[virtualRow.index];
                                return (
                                    <div
                                        key={virtualRow.index}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: `${virtualRow.size}px`,
                                            transform: `translateY(${virtualRow.start}px)`,
                                            paddingBottom: '0.5rem', // Replaces the gap
                                        }}
                                    >
                                        <ProviderCard
                                            provider={p}
                                            selected={selectedProvider?.id === p.id}
                                            onClick={handleSelect}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </aside>

            {/* ── Map ── */}
            <main className={`map-main ${mobileView === 'list' ? 'hidden-on-mobile' : ''}`} style={{ flex: 1, position: 'relative' }}>
                {loading && (
                    <div style={{
                        position: 'absolute', inset: 0,
                        backgroundColor: 'var(--navy)',
                        zIndex: 20,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        gap: '1.5rem'
                    }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: 18,
                            background: 'linear-gradient(135deg, #C9A84C, #e0c075)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            animation: 'pulse-gold 2s infinite',
                            boxShadow: '0 8px 32px rgba(201,168,76,0.25)',
                        }}>
                            <MapPin size={34} color="#0B1F3A" strokeWidth={2.5} />
                        </div>
                        <p style={{ color: 'var(--gold)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.85rem', animation: 'fadeIn 1s ease' }}>
                            Loading medical data...
                        </p>
                    </div>
                )}
                <MapView
                    providers={providers}
                    selectedProvider={selectedProvider}
                    onProviderSelect={handleSelect}
                />
            </main>

            {/* ── Detail drawer ── */}
            <ProviderDrawer
                provider={selectedProvider}
                onClose={() => setSelectedProvider(null)}
            />

            {/* Mobile View Toggle FAB */}
            <button
                className="mobile-only"
                onClick={() => setMobileView(v => v === 'map' ? 'list' : 'map')}
                style={{
                    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
                    zIndex: 100, padding: '0.875rem 1.5rem', borderRadius: 'var(--radius-pill)',
                    background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                    color: 'var(--navy)', fontWeight: 700, fontSize: '0.95rem',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)', border: 'none', alignItems: 'center', gap: '0.5rem'
                }}
            >
                {mobileView === 'map' ? (
                    <><List size={18} /> View List</>
                ) : (
                    <><MapPin size={18} /> View Map</>
                )}
            </button>
        </div>
    );
}
