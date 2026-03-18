import { useProviders } from '../hooks/useProviders';
import { SearchBar } from '../components/search/SearchBar';
import { FilterBar } from '../components/search/FilterBar';
import { ProviderCard } from '../components/provider/ProviderCard';
import { ProviderDrawer } from '../components/provider/ProviderDrawer';
import { MapView } from '../components/map/MapView';
import { trackProviderClick } from '../utils/analytics';

export function MapPage() {
    const { providers, filters, updateFilter, resetFilters, selectedProvider, setSelectedProvider } = useProviders();

    const handleSelect = (p: typeof providers[0]) => {
        trackProviderClick(p);
        setSelectedProvider(selectedProvider?.id === p.id ? null : p);
    };

    return (
        <div style={{ display: 'flex', height: '100vh', paddingTop: 60, overflow: 'hidden' }}>
            {/* ── Left sidebar ── */}
            <aside style={{
                width: 340,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid rgba(255,255,255,0.08)',
                background: 'var(--navy)',
                overflowY: 'auto',
            }}>
                {/* Search + Filters */}
                <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'sticky', top: 0, background: 'var(--navy)', zIndex: 10 }}>
                    <SearchBar value={filters.search} onChange={(v) => updateFilter('search', v)} />
                    <FilterBar filters={filters} updateFilter={updateFilter} resetFilters={resetFilters} count={providers.length} />
                </div>

                {/* Provider list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem' }}>
                    {providers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)', fontSize: '0.875rem' }}>
                            <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔍</p>
                            <p>No providers match your filters.</p>
                            <button onClick={resetFilters} style={{ marginTop: '0.5rem', color: 'var(--gold)', background: 'none', fontSize: '0.875rem' }}>
                                Clear filters
                            </button>
                        </div>
                    ) : (
                        providers.map((p) => (
                            <ProviderCard
                                key={p.id}
                                provider={p}
                                selected={selectedProvider?.id === p.id}
                                onClick={handleSelect}
                            />
                        ))
                    )}
                </div>
            </aside>

            {/* ── Map ── */}
            <main style={{ flex: 1, position: 'relative' }}>
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
        </div>
    );
}
