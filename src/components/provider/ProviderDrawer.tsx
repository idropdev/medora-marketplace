import { X, Star, MapPin, Phone, Globe, Languages, Zap, CheckCircle, ExternalLink } from 'lucide-react';
import type { Provider } from '../../types/provider';
import { SpecialtyLabels } from '../../types/provider';
import { trackProviderClick } from '../../utils/analytics';
import { useGoogleReviews } from '../../hooks/useGoogleReviews';
import { ReviewCarousel } from './ReviewCarousel';

interface ProviderDrawerProps {
    provider: Provider | null;
    onClose: () => void;
}

export function ProviderDrawer({ provider, onClose }: ProviderDrawerProps) {
    const { reviews, loading: reviewsLoading } = useGoogleReviews(provider?.googlePlaceId);

    if (!provider) return null;

    const handleWebsiteClick = () => {
        trackProviderClick(provider);
        window.open(provider.website, '_blank', 'noopener');
    };

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 200,
                    background: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(4px)',
                }}
            />

            {/* Drawer panel */}
            <div
                className="drawer-panel"
                style={{
                    position: 'fixed', top: 60, right: 0, bottom: 0,
                    width: '100%', maxWidth: 400,
                    zIndex: 201,
                    background: 'var(--navy-800)',
                    borderLeft: '1px solid rgba(255,255,255,0.1)',
                    overflowY: 'auto',
                    animation: 'slideInRight 0.25s ease both',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Header */}
                <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'sticky', top: 0, background: 'var(--navy-800)', zIndex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Badges */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
                                {provider.promoted && (
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                        padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-pill)',
                                        background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                                        color: 'var(--navy)', fontSize: '0.7rem', fontWeight: 700,
                                    }}>
                                        <Zap size={10} /> PROMOTED
                                    </span>
                                )}
                                {provider.verified && (
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                        padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-pill)',
                                        background: 'rgba(34,197,94,0.15)', color: '#4ade80',
                                        fontSize: '0.7rem', fontWeight: 600,
                                    }}>
                                        <CheckCircle size={10} /> Verified
                                    </span>
                                )}
                                <span style={{
                                    padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-pill)',
                                    background: provider.country === 'MX' ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)',
                                    color: provider.country === 'MX' ? '#4ade80' : '#93c5fd',
                                    fontSize: '0.7rem', fontWeight: 600,
                                }}>
                                    {provider.country === 'MX' ? '🇲🇽 Ciudad Juárez' : '🇺🇸 El Paso'}
                                </span>
                            </div>

                            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.3 }}>{provider.name}</h2>
                            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: '0.25rem' }}>
                                {provider.specialty.map((s) => SpecialtyLabels[s]).join(' · ')}
                            </p>
                        </div>
                        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: '0.4rem', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                    {/* Rating */}
                    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius)', padding: '1rem', display: 'flex', justifyContent: 'space-around' }}>
                        <StatBox icon={<Star size={18} style={{ color: 'var(--gold)', fill: 'var(--gold)' }} />} value={provider.rating.toFixed(1)} label="Rating" />
                        <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
                        <StatBox icon={<span style={{ fontSize: '1.1rem' }}>💬</span>} value={provider.reviewCount.toLocaleString()} label="Reviews" />
                        <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
                        <StatBox icon={<span style={{ fontSize: '1.1rem' }}>👁</span>} value={provider.clicks.toLocaleString()} label="Profile views" />
                    </div>

                    {/* Contact Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <DetailRow icon={<MapPin size={15} />} text={provider.address} />
                        {provider.phone && <DetailRow icon={<Phone size={15} />} text={provider.phone} href={`tel:${provider.phone}`} />}
                        <DetailRow
                            icon={<Languages size={15} />}
                            text={provider.languages.map((l) => l === 'en' ? '🇺🇸 English' : '🇲🇽 Spanish').join(' · ')}
                        />
                    </div>

                    {/* CTA Buttons */}
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {provider.website && (
                            <button
                                onClick={handleWebsiteClick}
                                style={{
                                    flex: 1,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem',
                                    padding: '0.8rem 1rem', borderRadius: 'var(--radius)',
                                    background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                                    color: 'var(--navy)', fontWeight: 700, fontSize: '0.85rem',
                                    transition: 'var(--transition)', border: 'none',
                                    whiteSpace: 'nowrap',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.1)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.filter = ''; }}
                            >
                                <Globe size={14} /> Visit Website <ExternalLink size={13} />
                            </button>
                        )}
                        {provider.phone && (
                            <a
                                href={`tel:${provider.phone}`}
                                style={{
                                    flex: provider.website ? '0 0 auto' : 1,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem',
                                    padding: '0.8rem 1rem', borderRadius: 'var(--radius)',
                                    background: provider.website
                                        ? 'rgba(255,255,255,0.07)'
                                        : 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                                    border: provider.website ? '1px solid rgba(255,255,255,0.12)' : 'none',
                                    color: provider.website ? 'var(--gray-300)' : 'var(--navy)',
                                    fontWeight: 700, fontSize: '0.85rem',
                                    whiteSpace: 'nowrap',
                                    textDecoration: 'none',
                                }}
                            >
                                <Phone size={14} /> Call Now
                            </a>
                        )}
                    </div>

                    {/* Reviews Carousel */}
                    <ReviewCarousel reviews={reviews} loading={reviewsLoading} />
                </div>
            </div>
        </>
    );
}

function StatBox({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
            {icon}
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{value}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>{label}</span>
        </div>
    );
}

function DetailRow({ icon, text, href }: { icon: React.ReactNode; text: string; href?: string }) {
    const content = (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.85rem', color: href ? 'var(--gold-light)' : 'var(--gray-400)' }}>
            <span style={{ flexShrink: 0, marginTop: 1, color: 'var(--gray-600)' }}>{icon}</span>
            <span>{text}</span>
        </div>
    );
    if (href) {
        return <a href={href} rel="noopener noreferrer">{content}</a>;
    }
    return content;
}
