import { Star, MapPin, ChevronRight, Zap } from 'lucide-react';
import type { Provider } from '../../types/provider';
import { SpecialtyLabels } from '../../types/provider';
import { trackProviderClick } from '../../utils/analytics';

interface ProviderCardProps {
    provider: Provider;
    selected: boolean;
    onClick: (p: Provider) => void;
}

export function ProviderCard({ provider, selected, onClick }: ProviderCardProps) {
    const handleClick = () => {
        trackProviderClick(provider);
        onClick(provider);
    };

    return (
        <button
            onClick={handleClick}
            style={{
                width: '100%',
                textAlign: 'left',
                padding: '0.875rem 1rem',
                borderRadius: 'var(--radius)',
                background: selected ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${selected ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: 'var(--white)',
                transition: 'var(--transition)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                animation: 'fadeIn 0.25s ease both',
            }}
            onMouseEnter={(e) => {
                if (!selected) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)';
                }
            }}
            onMouseLeave={(e) => {
                if (!selected) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }
            }}
        >
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                        {provider.promoted && (
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                                padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-pill)',
                                background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                                color: 'var(--navy)', fontSize: '0.65rem', fontWeight: 700,
                            }}>
                                <Zap size={9} /> PROMOTED
                            </span>
                        )}
                        <span style={{
                            padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)',
                            background: provider.country === 'MX' ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)',
                            color: provider.country === 'MX' ? '#4ade80' : '#93c5fd',
                            fontSize: '0.65rem', fontWeight: 600,
                        }}>
                            {provider.country === 'MX' ? '🇲🇽 Juárez' : '🇺🇸 El Paso'}
                        </span>
                    </div>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {provider.name}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '0.15rem' }}>
                        {provider.specialty.map((s) => SpecialtyLabels[s]).join(' · ')}
                    </p>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--gray-400)', flexShrink: 0, marginTop: 2 }} />
            </div>

            {/* Rating + location */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <RatingBadge rating={provider.rating} count={provider.reviewCount} />
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--gray-400)', overflow: 'hidden' }}>
                    <MapPin size={12} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{provider.city}</span>
                </span>
            </div>
        </button>
    );
}

export function RatingBadge({ rating, count }: { rating: number; count: number }) {
    return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem' }}>
            <Star size={12} style={{ color: 'var(--gold)', fill: 'var(--gold)' }} />
            <strong style={{ color: 'var(--white)' }}>{rating.toFixed(1)}</strong>
            <span style={{ color: 'var(--gray-400)' }}>({count})</span>
        </span>
    );
}
