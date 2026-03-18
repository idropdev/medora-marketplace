import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ChevronRight, Zap, CheckCircle } from 'lucide-react';
import { mockProviders } from '../data/providers';

const totalProviders = mockProviders.length;
const avgRating = (mockProviders.reduce((s, p) => s + p.rating, 0) / totalProviders).toFixed(1);
const totalClicks = mockProviders.reduce((s, p) => s + p.clicks, 0);

export function SalesPage() {
    const [mousePos, setMousePos] = useState({ x: 50, y: 0 });

    const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setMousePos({ x, y });
    };

    return (
        <div style={{ paddingTop: 60 }}>
            {/* ── Hero ── */}
            <section
                onMouseMove={handleMouseMove}
                style={{
                    minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '4rem 1.5rem',
                    position: 'relative', overflow: 'hidden',
                    background: `radial-gradient(circle 800px at ${mousePos.x}% ${mousePos.y}%, rgba(201,168,76,0.15) 0%, rgba(201,168,76,0.05) 40%, transparent 80%)`,
                }}
            >
                {/* Background grid */}
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04, pointerEvents: 'none' }} viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
                    <defs><pattern id="sg" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#C9A84C" strokeWidth="0.5" /></pattern></defs>
                    <rect width="100%" height="100%" fill="url(#sg)" />
                </svg>

                <div style={{ textAlign: 'center', maxWidth: 720, position: 'relative', zIndex: 1 }}>

                    <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1rem', letterSpacing: '-0.03em' }}>
                        Put your practice<br />
                        <span style={{ background: 'linear-gradient(135deg, #C9A84C, #e0c075)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>on the map</span>
                    </h1>
                    <p style={{ fontSize: '1.15rem', color: 'var(--gray-400)', marginBottom: '2.5rem', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 2.5rem' }}>
                        Medora is the first healthcare directory built specifically for the El Paso–Juárez border. Get discovered by thousands of US patients actively looking for care in Juárez.
                    </p>

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <a href="mailto:hello@medora.com" style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.875rem 1.75rem', borderRadius: 'var(--radius-pill)',
                            background: 'linear-gradient(135deg, #C9A84C, #e0c075)',
                            color: 'var(--navy)', fontWeight: 700, fontSize: '0.95rem',
                        }}>
                            Get Listed Free <ChevronRight size={18} />
                        </a>
                        <Link to="/" style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.875rem 1.75rem', borderRadius: 'var(--radius-pill)',
                            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                            color: 'var(--white)', fontWeight: 600, fontSize: '0.95rem',
                        }}>
                            <MapPin size={16} /> View the Map
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Stats ── */}
            <section style={{ background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '3rem 1.5rem' }}>
                <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '2rem', textAlign: 'center' }}>
                    <StatTile icon="🏥" value={`${totalProviders}+`} label="Providers Listed" />
                    <StatTile icon="👁" value={totalClicks.toLocaleString()} label="Profile Views" />
                    <StatTile icon="⭐" value={avgRating} label="Avg Rating" />
                    <StatTile icon="🌎" value="2 Cities" label="El Paso + Juárez" />
                </div>
            </section>

            {/* ── How It Works ── */}
            <section style={{ padding: '5rem 1.5rem' }}>
                <div style={{ maxWidth: 900, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                        <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: '0.75rem' }}>How it works</h2>
                        <p style={{ color: 'var(--gray-400)', maxWidth: 480, margin: '0 auto' }}>Three steps to start receiving new patients from across the border.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                        <StepCard step="1" icon="📋" title="Create your profile" body="Add your name, specialties, location, and contact info. It takes under 5 minutes and is completely free." />
                        <StepCard step="2" icon="🗺️" title="Appear on the map" body="Your clinic shows up to US patients searching for care in Juárez — no SEO knowledge required." />
                        <StepCard step="3" icon="📈" title="Track your leads" body="See how many people view your profile each month. Use that data to understand your reach." />
                    </div>
                </div>
            </section>

            {/* ── Pricing ── */}
            <section style={{ padding: '5rem 1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ maxWidth: 800, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                        <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: '0.75rem' }}>Simple pricing</h2>
                        <p style={{ color: 'var(--gray-400)' }}>Start for free. Upgrade when you see results.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        <PricingCard
                            tier="Free Listing"
                            price="$0"
                            period="forever"
                            color="rgba(255,255,255,0.06)"
                            border="rgba(255,255,255,0.1)"
                            features={[
                                'Appear on the Medora map',
                                'Name, specialty & contact info',
                                'Monthly profile view count',
                                'EN + ES visibility',
                            ]}
                            cta="Get listed"
                            ctaHref="mailto:hello@medora.com"
                            ctaStyle="outline"
                        />
                        <PricingCard
                            tier="Promoted Listing"
                            price="$49"
                            period="/ month"
                            color="rgba(201,168,76,0.08)"
                            border="rgba(201,168,76,0.35)"
                            badge="Most Popular"
                            features={[
                                'Everything in Free',
                                'Gold promoted pin on map',
                                'Priority in search results',
                                'Detailed analytics dashboard',
                                'Featured in weekly digest',
                            ]}
                            cta="Start free trial"
                            ctaHref="mailto:hello@medora.com"
                            ctaStyle="gold"
                        />
                    </div>
                </div>
            </section>

            {/* ── Target Specialties ── */}
            <section style={{ padding: '5rem 1.5rem' }}>
                <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: '0.75rem' }}>Who we serve</h2>
                    <p style={{ color: 'var(--gray-400)', marginBottom: '2.5rem', maxWidth: 500, margin: '0 auto 2.5rem' }}>Any healthcare or wellness provider near the border can list on Medora.</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                        {[['🦷', 'Dentistry'], ['😁', 'Orthodontics'], ['💉', 'Plastic Surgery'], ['✨', 'Aesthetics'], ['👶', 'OB/GYN'], ['🏃', 'Physical Therapy'], ['💆', 'Massage'], ['👁', 'Optometry'], ['❤️', 'Cardiology'], ['🏥', 'General Practice']].map(([emoji, label]) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.1rem', borderRadius: 'var(--radius-pill)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.875rem' }}>
                                <span>{emoji}</span> {label}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA Banner ── */}
            <section style={{ padding: '5rem 1.5rem', background: 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))' }}>
                <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: '1rem' }}>Ready to get discovered?</h2>
                    <p style={{ color: 'var(--gray-400)', marginBottom: '2rem' }}>Medical tourism you can trust — starting with your practice.</p>
                    <a href="mailto:hello@medora.com" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        padding: '1rem 2rem', borderRadius: 'var(--radius-pill)',
                        background: 'linear-gradient(135deg, #C9A84C, #e0c075)',
                        color: 'var(--navy)', fontWeight: 700, fontSize: '1rem',
                    }}>
                        Contact the Medora team <ChevronRight size={18} />
                    </a>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '1.5rem', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.8rem' }}>
                © {new Date().getFullYear()} Medora · Medical tourism you can trust · El Paso–Juárez
            </footer>
        </div>
    );
}

function StatTile({ icon, value, label }: { icon: string; value: string; label: string }) {
    return (
        <div>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--gold)' }}>{value}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--gray-400)', marginTop: '0.25rem' }}>{label}</div>
        </div>
    );
}

function StepCard({ step, icon, title, body }: { step: string; icon: string; title: string; body: string }) {
    return (
        <div style={{ padding: '1.75rem', borderRadius: 'var(--radius)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>{step}</div>
                <span style={{ fontSize: '1.5rem' }}>{icon}</span>
            </div>
            <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{title}</h3>
            <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem', lineHeight: 1.6 }}>{body}</p>
        </div>
    );
}

function PricingCard({ tier, price, period, color, border, badge, features, cta, ctaHref, ctaStyle }: {
    tier: string; price: string; period: string; color: string; border: string;
    badge?: string; features: string[]; cta: string; ctaHref: string; ctaStyle: 'gold' | 'outline';
}) {
    return (
        <div style={{ padding: '2rem', borderRadius: 'var(--radius)', background: color, border: `1px solid ${border}`, display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative' }}>
            {badge && (
                <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', padding: '0.25rem 0.875rem', borderRadius: 'var(--radius-pill)', background: 'linear-gradient(135deg,#C9A84C,#e0c075)', color: 'var(--navy)', fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    <Zap size={10} style={{ display: 'inline', marginRight: 4 }} />{badge}
                </div>
            )}
            <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{tier}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: 800, color: ctaStyle === 'gold' ? 'var(--gold)' : 'var(--white)' }}>{price}</span>
                    <span style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>{period}</span>
                </div>
            </div>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', listStyle: 'none', flex: 1 }}>
                {features.map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--gray-400)' }}>
                        <CheckCircle size={15} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 1 }} />
                        {f}
                    </li>
                ))}
            </ul>
            <a href={ctaHref} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0.75rem', borderRadius: 'var(--radius)',
                background: ctaStyle === 'gold' ? 'linear-gradient(135deg,#C9A84C,#e0c075)' : 'rgba(255,255,255,0.08)',
                border: ctaStyle === 'outline' ? '1px solid rgba(255,255,255,0.15)' : 'none',
                color: ctaStyle === 'gold' ? 'var(--navy)' : 'var(--white)',
                fontWeight: 700, fontSize: '0.9rem',
            }}>
                {cta}
            </a>
        </div>
    );
}
