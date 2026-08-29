import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProviderFilters, Specialty } from '../../types/provider';
import { SpecialtyLabels } from '../../types/provider';
import {
    SpecialtyIcon, IconBorder, IconUS, IconMX,
    IconStar, IconChevronDown,
} from '../icons/Icons';

interface FilterBarProps {
    filters: ProviderFilters;
    updateFilter: <K extends keyof ProviderFilters>(key: K, value: ProviderFilters[K]) => void;
    resetFilters: () => void;
    count: number;
}

const ALL_SPECIALTIES = Object.keys(SpecialtyLabels) as Specialty[];

/**
 * Showing all fifteen tags at once buried the results under a wall of chips.
 * These six cover the bulk of border-clinic demand; the rest stay one tap away.
 */
const PRIMARY_SPECIALTIES: Specialty[] = [
    'dentist', 'general', 'obgyn', 'optometry', 'plastic_surgery', 'urgent_care',
];
const SECONDARY_SPECIALTIES = ALL_SPECIALTIES.filter((s) => !PRIMARY_SPECIALTIES.includes(s));

const RATINGS = [0, 3, 4, 4.5];

export function FilterBar({ filters, updateFilter, resetFilters, count }: FilterBarProps) {
    const { t } = useTranslation();
    const [showAllTags, setShowAllTags] = useState(false);

    const hasActive = Boolean(filters.specialty) || Boolean(filters.country) || filters.minRating > 0;

    const RATING_LABELS: Record<number, string> = {
        0: t('filters.ratingAny'),
        3: t('filters.rating3'),
        4: t('filters.rating4'),
        4.5: t('filters.rating45'),
    };

    // A hidden tag that is currently active must stay visible, or the user
    // sees an active filter they cannot switch off.
    const selectedIsHidden =
        Boolean(filters.specialty) && SECONDARY_SPECIALTIES.includes(filters.specialty as Specialty);

    const visibleTags: Specialty[] = showAllTags
        ? ALL_SPECIALTIES
        : selectedIsHidden
            ? [...PRIMARY_SPECIALTIES, filters.specialty as Specialty]
            : PRIMARY_SPECIALTIES;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Results count + reset */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>
                    <strong style={{ color: 'var(--white)', fontWeight: 800, fontSize: '0.95rem' }}>{count}</strong>
                    {' '}{t('filters.providersFoundSuffix', { count })}
                </span>
                {hasActive && (
                    <button
                        onClick={resetFilters}
                        style={{ fontSize: '0.85rem', color: 'var(--gold)', background: 'none', fontWeight: 700 }}
                    >
                        {t('filters.clearFilters')}
                    </button>
                )}
            </div>

            {/* Which side of the border */}
            <div
                role="group"
                aria-label={t('filters.countryGroup')}
                style={{
                    display: 'flex',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-pill)',
                    padding: '3px',
                    gap: '3px',
                }}
            >
                <SegItem
                    icon={<IconBorder size={16} />}
                    label={t('filters.bothSides')}
                    active={filters.country === ''}
                    onClick={() => updateFilter('country', '')}
                />
                <SegItem
                    icon={<IconUS size={16} />}
                    label={t('filters.elPaso')}
                    active={filters.country === 'US'}
                    onClick={() => updateFilter('country', 'US')}
                />
                <SegItem
                    icon={<IconMX size={16} />}
                    label={t('filters.juarez')}
                    active={filters.country === 'MX'}
                    onClick={() => updateFilter('country', 'MX')}
                />
            </div>

            {/* Specialty tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                <Chip
                    label={t('filters.allSpecialties')}
                    active={!filters.specialty}
                    onClick={() => updateFilter('specialty', '')}
                />
                {visibleTags.map((key) => (
                    <Chip
                        key={key}
                        icon={<SpecialtyIcon specialty={key} size={14} weight={1.8} />}
                        label={t(`specialties.${key}`)}
                        active={filters.specialty === key}
                        onClick={() => updateFilter('specialty', filters.specialty === key ? '' : key)}
                    />
                ))}
                <button
                    onClick={() => setShowAllTags((v) => !v)}
                    aria-expanded={showAllTags}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                        padding: '0.35rem 0.7rem',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: '0.8rem', fontWeight: 700,
                        background: 'none',
                        color: 'var(--gold)',
                        border: '1px dashed var(--border-strong)',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {showAllTags
                        ? t('filters.fewerTags')
                        : t('filters.moreTags', { count: SECONDARY_SPECIALTIES.length })}
                    <span
                        style={{
                            display: 'flex',
                            transform: showAllTags ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.22s var(--ease-out)',
                        }}
                    >
                        <IconChevronDown size={13} weight={2.2} />
                    </span>
                </button>
            </div>

            {/* Minimum rating */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                        fontSize: '0.8rem', color: 'var(--gray-400)', fontWeight: 600,
                        whiteSpace: 'nowrap',
                    }}
                >
                    <IconStar size={14} filled style={{ color: 'var(--gold)' }} />
                    {t('filters.ratingLabel')}
                </span>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    {RATINGS.map((r) => (
                        <Chip
                            key={r}
                            label={RATING_LABELS[r]}
                            active={filters.minRating === r}
                            onClick={() => updateFilter('minRating', r)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function SegItem({ icon, label, active, onClick }: {
    icon: React.ReactNode; label: string; active: boolean; onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            aria-pressed={active}
            style={{
                flex: 1,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
                padding: '0.42rem 0.5rem',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.8rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                background: active ? 'var(--navy-800)' : 'transparent',
                color: active ? 'var(--white)' : 'var(--gray-400)',
                border: active ? '1px solid var(--border-strong)' : '1px solid transparent',
            }}
        >
            {icon}
            {label}
        </button>
    );
}

function Chip({ icon, label, active, onClick }: {
    icon?: React.ReactNode; label: string; active: boolean; onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            aria-pressed={active}
            className="press"
            style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.32rem',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.8rem',
                fontWeight: 600,
                background: active ? 'var(--brand)' : 'var(--navy-800)',
                color: active ? 'var(--on-brand)' : 'var(--gray-300)',
                border: `1px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                whiteSpace: 'nowrap',
            }}
        >
            {icon}
            {label}
        </button>
    );
}
