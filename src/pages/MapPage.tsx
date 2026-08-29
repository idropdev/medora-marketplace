import { useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTranslation } from 'react-i18next';
import { useProviders } from '../hooks/useProviders';
import { SearchBar } from '../components/search/SearchBar';
import { FilterBar } from '../components/search/FilterBar';
import { ProviderCard } from '../components/provider/ProviderCard';
import { ProviderDrawer } from '../components/provider/ProviderDrawer';
import { MapView } from '../components/map/MapView';
import { LogoMark } from '../components/brand/Logo';
import { IconMapPin, IconList, IconSearch } from '../components/icons/Icons';
import { trackProviderClick } from '../utils/analytics';

const NAV_HEIGHT = 68;
const ROW_HEIGHT = 128;

export function MapPage() {
    const { t } = useTranslation();
    const {
        providers, allProviders, filters, updateFilter, resetFilters,
        selectedProvider, setSelectedProvider, loading,
    } = useProviders();
    const [mobileView, setMobileView] = useState<'map' | 'list'>('list');
    const sidebarRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: providers.length,
        getScrollElement: () => sidebarRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 6,
    });

    const handleSelect = (p: typeof providers[0]) => {
        trackProviderClick(p);
        setSelectedProvider(selectedProvider?.id === p.id ? null : p);
    };

    return (
        <div style={{ display: 'flex', height: '100dvh', paddingTop: NAV_HEIGHT, overflow: 'hidden' }}>
            {/* ── Left sidebar ── */}
            <aside
                ref={sidebarRef}
                className={`map-sidebar ${mobileView === 'map' ? 'hidden-on-mobile' : ''}`}
            >
                <div
                    style={{
                        padding: '1.15rem 1.15rem 1rem',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.9rem',
                        position: 'sticky',
                        top: 0,
                        background: 'var(--navy)',
                        zIndex: 10,
                    }}
                >
                    <SearchBar value={filters.search} onChange={(v) => updateFilter('search', v)} />
                    <FilterBar
                        filters={filters}
                        updateFilter={updateFilter}
                        resetFilters={resetFilters}
                        count={providers.length}
                    />
                </div>

                <div style={{ padding: '0.9rem' }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="skeleton"
                                    style={{
                                        width: '100%',
                                        height: `${ROW_HEIGHT - 12}px`,
                                        borderRadius: 'var(--radius)',
                                        border: '1px solid var(--border)',
                                    }}
                                />
                            ))}
                        </div>
                    ) : providers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--gray-400)' }}>
                            <div
                                style={{
                                    width: 64, height: 64, margin: '0 auto 1.25rem',
                                    borderRadius: '50%',
                                    background: 'var(--surface)',
                                    border: '1px solid var(--border)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--gray-600)',
                                }}
                            >
                                <IconSearch size={28} />
                            </div>
                            <p style={{ marginBottom: '0.6rem', fontSize: '1rem', color: 'var(--white)', fontWeight: 600 }}>
                                {t('map.noResults')}
                            </p>
                            <button
                                onClick={resetFilters}
                                style={{
                                    color: 'var(--gold)', background: 'none',
                                    fontSize: '0.9rem', marginBottom: '2rem', fontWeight: 700,
                                }}
                            >
                                {t('filters.clearFilters')}
                            </button>
                            <div style={{ paddingTop: '1.75rem', borderTop: '1px solid var(--border)' }}>
                                <p style={{ marginBottom: '0.9rem', fontSize: '0.9rem' }}>{t('map.suggestClinic')}</p>
                                <a
                                    href="mailto:hello@medsociety.one?subject=Suggest%20a%20Clinic"
                                    className="press"
                                    style={{
                                        display: 'inline-flex',
                                        padding: '0.65rem 1.25rem',
                                        borderRadius: 'var(--radius-pill)',
                                        background: 'var(--surface)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--white)',
                                        fontWeight: 700,
                                        fontSize: '0.9rem',
                                    }}
                                >
                                    {t('map.suggestBtn')}
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                const p = providers[virtualRow.index];
                                return (
                                    <div
                                        key={p.id}
                                        style={{
                                            position: 'absolute', top: 0, left: 0, width: '100%',
                                            height: `${virtualRow.size}px`,
                                            transform: `translateY(${virtualRow.start}px)`,
                                            paddingBottom: '0.6rem',
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
            <main
                className={`map-main ${mobileView === 'list' ? 'hidden-on-mobile' : ''}`}
                style={{ flex: 1, position: 'relative' }}
            >
                {loading && (
                    <div
                        style={{
                            position: 'absolute', inset: 0,
                            background: 'var(--navy)', zIndex: 20,
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: '1.25rem',
                        }}
                    >
                        <LogoMark size={56} idle />
                        <p
                            style={{
                                color: 'var(--gray-400)', fontWeight: 700,
                                letterSpacing: '0.14em', textTransform: 'uppercase',
                                fontSize: '0.75rem',
                            }}
                        >
                            {t('map.loading')}
                        </p>
                    </div>
                )}
                <MapView
                    providers={providers}
                    allProviders={allProviders}
                    selectedProvider={selectedProvider}
                    onProviderSelect={handleSelect}
                />
            </main>

            <ProviderDrawer provider={selectedProvider} onClose={() => setSelectedProvider(null)} />

            {/* Mobile map/list toggle */}
            <button
                className="mobile-only press"
                onClick={() => setMobileView((v) => (v === 'map' ? 'list' : 'map'))}
                style={{
                    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
                    zIndex: 100, padding: '0.85rem 1.6rem', borderRadius: 'var(--radius-pill)',
                    background: 'var(--brand)', color: 'var(--on-brand)',
                    fontWeight: 700, fontSize: '0.95rem',
                    boxShadow: 'var(--shadow)',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}
            >
                {mobileView === 'map' ? (
                    <><IconList size={18} /> {t('map.viewList')}</>
                ) : (
                    <><IconMapPin size={18} /> {t('map.viewMap')}</>
                )}
            </button>
        </div>
    );
}
