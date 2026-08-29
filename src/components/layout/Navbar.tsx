import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Logo } from '../brand/Logo';
import { IconSun, IconMoon, IconLanguage } from '../icons/Icons';

/**
 * Light is the product default. A previously stored preference still wins,
 * so anyone who deliberately chose dark keeps it across visits.
 */
function initialTheme(): string {
    return localStorage.getItem('theme') || 'light';
}

export function Navbar() {
    const { pathname } = useLocation();
    const { t, i18n } = useTranslation();
    const [theme, setTheme] = useState<string>(initialTheme);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const isSpanish = i18n.language.startsWith('es');

    const toggleLanguage = () => {
        i18n.changeLanguage(isSpanish ? 'en' : 'es');
    };

    return (
        <nav
            className="ms-nav"
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0,
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 1.5rem',
                height: '68px',
                background: 'var(--nav-bg)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '1px solid var(--nav-border)',
            }}
        >
            <Link to="/" aria-label="MedSociety home" style={{ display: 'flex', alignItems: 'center' }}>
                <Logo size={34} idle />
            </Link>

            <div className="ms-nav-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div className="ms-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <NavLink to="/" label={t('nav.findProviders')} active={pathname === '/'} />
                    <NavLink to="/sales" label={t('nav.forProviders')} active={pathname === '/sales'} />
                </div>

                {/*
                  The toggle displays the language currently being shown, not the
                  one you would switch to. The tooltip states the destination.
                */}
                <button
                    className="press"
                    onClick={toggleLanguage}
                    title={isSpanish ? t('nav.switchToEnglish') : t('nav.switchToSpanish')}
                    aria-label={isSpanish ? t('nav.switchToEnglish') : t('nav.switchToSpanish')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--white)',
                        padding: '0.35rem 0.75rem',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--gold)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                    <IconLanguage size={15} />
                    {isSpanish ? 'ES' : 'EN'}
                </button>

                <button
                    className="press"
                    onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                    title={t('nav.toggleTheme')}
                    aria-label={t('nav.toggleTheme')}
                    style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--white)',
                        width: 38, height: 38,
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--gold)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                    {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
                </button>
            </div>
        </nav>
    );
}

function NavLink({ to, label, active }: { to: string; label: string; active: boolean }) {
    return (
        <Link
            to={to}
            className="press ms-nav-link"
            style={{
                padding: '0.45rem 0.95rem',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.9rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                color: active ? 'var(--on-brand)' : 'var(--gray-300)',
                background: active ? 'var(--brand)' : 'transparent',
                border: `1px solid ${active ? 'var(--brand)' : 'transparent'}`,
            }}
            onMouseEnter={(e) => {
                if (!active) {
                    const el = e.currentTarget as HTMLElement;
                    el.style.color = 'var(--white)';
                    el.style.background = 'var(--surface)';
                }
            }}
            onMouseLeave={(e) => {
                if (!active) {
                    const el = e.currentTarget as HTMLElement;
                    el.style.color = 'var(--gray-300)';
                    el.style.background = 'transparent';
                }
            }}
        >
            {label}
        </Link>
    );
}
