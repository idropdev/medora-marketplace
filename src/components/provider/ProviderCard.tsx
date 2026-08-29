import { useTranslation } from 'react-i18next';
import type { Provider } from '../../types/provider';
import { trackProviderClick } from '../../utils/analytics';
import {
    IconStar, IconMapPin, IconChevronRight,
    IconPromoted, SpecialtyIcon, CountryIcon,
} from '../icons/Icons';

interface ProviderCardProps {
    provider: Provider;
    selected: boolean;
    onClick: (p: Provider) => void;
}

export function ProviderCard({ provider, selected, onClick }: ProviderCardProps) {
    const { t } = useTranslation();

    const handleClick = () => {
        trackProviderClick(provider);
        onClick(provider);
    };

    const accent = provider.country === 'MX' ? 'var(--mx)' : 'var(--us)';
    const accentSoft = provider.country === 'MX' ? 'var(--mx-soft)' : 'var(--us-soft)';
    const sideLabel = provider.country === 'MX' ? t('drawer.ciudadJuarez') : t('drawer.elPaso');

    return (
        <button
            onClick={handleClick}
            aria-pressed={selected}
            style={{
                width: '100%',
                height: '100%',
                textAlign: 'left',
                padding: '0.95rem 1rem',
                borderRadius: 'var(--radius)',
                background: selected ? 'var(--gold-dim)' : 'var(--navy-800)',
                border: `1px solid ${selected ? 'var(--gold)' : 'var(--border)'}`,
                color: 'var(--white)',
                transition: 'background var(--transition), border-color var(--transition), box-shadow var(--transition)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
                animation: 'fadeIn 0.25s var(--ease-out) both',
            }}
            onMouseEnter={(e) => {
                if (selected) return;
                e.currentTarget.style.borderColor = 'var(--border-strong)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
            onMouseLeave={(e) => {
                if (selected) return;
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem' }}>
                <div
                    style={{
                        width: 42, height: 42, borderRadius: 11, flexShrink: 0,
                        background: provider.promoted ? 'var(--gold-dim)' : accentSoft,
                        color: provider.promoted ? 'var(--gold)' : accent,
                        border: `1px solid ${provider.promoted ? 'var(--gold)' : accent}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    <SpecialtyIcon specialty={provider.specialty[0]} size={22} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                        {provider.promoted && (
                            <span
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                    padding: '0.12rem 0.5rem', borderRadius: 'var(--radius-pill)',
                                    background: 'var(--brand)', color: 'var(--on-brand)',
                                    fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.07em',
                                }}
                            >
                                <IconPromoted size={10} weight={2} /> {t('drawer.promoted')}
                            </span>
                        )}
                        <span
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                padding: '0.12rem 0.5rem', borderRadius: 'var(--radius-pill)',
                                background: accentSoft, color: accent,
                                fontSize: '0.68rem', fontWeight: 700,
                            }}
                        >
                            <CountryIcon country={provider.country} size={11} weight={2} /> {sideLabel}
                        </span>
                    </div>

                    <p
                        style={{
                            fontWeight: 700, fontSize: '1rem', lineHeight: 1.3,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                    >
                        {provider.name}
                    </p>
                    <p
                        style={{
                            fontSize: '0.82rem', color: 'var(--gray-400)', marginTop: '0.18rem',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                    >
                        {provider.specialty.map((s) => t(`specialties.${s}`, { defaultValue: s })).join(' · ')}
                    </p>
                </div>

                <span style={{ color: 'var(--gray-500)', flexShrink: 0, marginTop: 4, display: 'flex' }}>
                    <IconChevronRight size={17} />
                </span>
            </div>

            {/* Rating + location */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                <RatingBadge rating={provider.rating} count={provider.reviewCount} />
                <span
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                        fontSize: '0.82rem', color: 'var(--gray-400)', overflow: 'hidden', minWidth: 0,
                    }}
                >
                    <IconMapPin size={14} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {provider.city}
                    </span>
                </span>
            </div>
        </button>
    );
}

export function RatingBadge({ rating, count }: { rating: number; count: number }) {
    return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.28rem', fontSize: '0.82rem' }}>
            <IconStar size={14} filled style={{ color: 'var(--gold)' }} />
            <strong style={{ color: 'var(--white)', fontWeight: 800 }}>{rating.toFixed(1)}</strong>
            <span style={{ color: 'var(--gray-400)' }}>({count.toLocaleString()})</span>
        </span>
    );
}
