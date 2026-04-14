import { MapPin, Sun, Moon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function Navbar() {
    const { pathname } = useLocation();
    const { t, i18n } = useTranslation();
    const [theme, setTheme] = useState<string>(
        () => localStorage.getItem('theme') || 'dark'
    );

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language.startsWith('es') ? 'en' : 'es');
    };

    const isSpanish = i18n.language.startsWith('es');

    return (
        <nav style={{
            position: 'fixed',
            top: 0, left: 0, right: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.5rem',
            height: '60px',
            background: 'var(--nav-bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--nav-border)',
        }}>
            {/* Logo */}
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <img
                    src="/logo.png"
                    alt="Medora"
                    style={{ width: 32, height: 32, objectFit: 'contain' }}
                />
                <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
                    med<span style={{ color: 'var(--gold)' }}>ora</span>
                </span>
            </Link>

            {/* Nav Links + Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <NavLink to="/" label={t('nav.findProviders')} active={pathname === '/'} />
                    <NavLink to="/sales" label={t('nav.forProviders')} active={pathname === '/sales'} />
                </div>

                {/* Language toggle */}
                <button
                    onClick={toggleLanguage}
                    title={isSpanish ? 'Switch to English' : 'Cambiar a Español'}
                    style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--white)',
                        padding: '0.25rem 0.6rem',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        letterSpacing: '0.03em',
                        transition: 'var(--transition)',
                        whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--white)'; }}
                >
                    {isSpanish ? '🇺🇸 EN' : '🇲🇽 ES'}
                </button>

                {/* Theme toggle */}
                <button
                    onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                    title={t('nav.toggleTheme')}
                    style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--gold)',
                        width: 36, height: 36,
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                    }}
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>
        </nav>
    );
}

function NavLink({ to, label, active }: { to: string; label: string; active: boolean }) {
    return (
        <Link
            to={to}
            style={{
                padding: '0.4rem 0.9rem',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.875rem',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                color: active ? 'var(--navy)' : 'var(--gray-400)',
                background: active ? 'var(--gold)' : 'transparent',
                transition: 'var(--transition)',
            }}
            onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--white)'; }}
            onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--gray-400)'; }}
        >
            {label}
        </Link>
    );
}
