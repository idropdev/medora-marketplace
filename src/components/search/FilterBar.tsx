import type { ProviderFilters, Specialty } from '../../types/provider';
import { SpecialtyLabels } from '../../types/provider';

interface FilterBarProps {
    filters: ProviderFilters;
    updateFilter: <K extends keyof ProviderFilters>(key: K, value: ProviderFilters[K]) => void;
    resetFilters: () => void;
    count: number;
}

const SPECIALTIES = Object.entries(SpecialtyLabels) as [Specialty, string][];
const RATINGS = [0, 3, 4, 4.5];
const RATING_LABELS: Record<number, string> = { 0: 'Any', 3: '3+', 4: '4+', 4.5: '4.5+' };

export function FilterBar({ filters, updateFilter, resetFilters, count }: FilterBarProps) {
    const hasActive = filters.specialty || filters.country || filters.minRating > 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Results count + reset */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                    <strong style={{ color: 'var(--white)' }}>{count}</strong> providers found
                </span>
                {hasActive && (
                    <button onClick={resetFilters} style={{ fontSize: '0.75rem', color: 'var(--gold)', background: 'none' }}>
                        Clear filters
                    </button>
                )}
            </div>

            {/* Specialty chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                <Chip
                    label="All"
                    active={!filters.specialty}
                    onClick={() => updateFilter('specialty', '')}
                />
                {SPECIALTIES.map(([key, label]) => (
                    <Chip
                        key={key}
                        label={label}
                        active={filters.specialty === key}
                        onClick={() => updateFilter('specialty', filters.specialty === key ? '' : key)}
                    />
                ))}
            </div>

            {/* Country + Rating row */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <select
                    value={filters.country}
                    onChange={(e) => updateFilter('country', e.target.value as ProviderFilters['country'])}
                    style={selectStyle}
                >
                    <option value="">🌎 Both sides</option>
                    <option value="US">🇺🇸 El Paso (US)</option>
                    <option value="MX">🇲🇽 Juárez (MX)</option>
                </select>

                <select
                    value={filters.minRating}
                    onChange={(e) => updateFilter('minRating', Number(e.target.value))}
                    style={selectStyle}
                >
                    {RATINGS.map((r) => (
                        <option key={r} value={r}>⭐ {RATING_LABELS[r]}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '0.25rem 0.65rem',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.75rem',
                fontWeight: 500,
                background: active ? 'var(--gold)' : 'var(--surface)',
                color: active ? 'var(--navy)' : 'var(--gray-400)',
                border: active ? '1px solid var(--gold)' : '1px solid var(--border)',
                transition: 'var(--transition)',
                whiteSpace: 'nowrap',
            }}
        >
            {label}
        </button>
    );
}

const selectStyle: React.CSSProperties = {
    padding: '0.4rem 0.75rem',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--white)',
    fontSize: '0.8rem',
    outline: 'none',
    cursor: 'pointer',
    flex: 1,
    minWidth: 120,
};
