import { MapPin, Sun, Moon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

export function Navbar() {
    const { pathname } = useLocation();
    const [theme, setTheme] = useState<string>(
        () => localStorage.getItem('theme') || 'dark'
    );

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

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
                <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'linear-gradient(135deg, #C9A84C, #e0c075)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <MapPin size={16} color="#0B1F3A" strokeWidth={2.5} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
                    med<span style={{ color: 'var(--gold)' }}>ora</span>
                </span>
            </Link>

            {/* Nav Links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <NavLink to="/" label="Find Providers" active={pathname === '/'} />
                    <NavLink to="/sales" label="For Providers" active={pathname === '/sales'} />
                </div>
                
                <button
                    onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                    title="Toggle Theme"
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
