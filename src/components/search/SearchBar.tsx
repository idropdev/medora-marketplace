import { useTranslation } from 'react-i18next';
import { IconSearch, IconClose } from '../icons/Icons';

interface SearchBarProps {
    value: string;
    onChange: (v: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
    const { t } = useTranslation();

    return (
        <div style={{ position: 'relative' }}>
            <span
                style={{
                    position: 'absolute', left: '0.9rem', top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--gray-500)', pointerEvents: 'none',
                    display: 'flex',
                }}
            >
                <IconSearch size={18} />
            </span>
            <input
                type="search"
                placeholder={t('search.placeholder')}
                aria-label={t('search.placeholder')}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="tint"
                style={{
                    width: '100%',
                    padding: '0.8rem 2.6rem 0.8rem 2.75rem',
                    background: 'var(--navy-800)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-pill)',
                    color: 'var(--white)',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    outline: 'none',
                }}
                onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--gold)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px var(--gold-dim)';
                }}
                onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = 'none';
                }}
            />
            {value && (
                <button
                    onClick={() => onChange('')}
                    aria-label={t('search.clear')}
                    title={t('search.clear')}
                    style={{
                        position: 'absolute', right: '0.85rem', top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none', color: 'var(--gray-500)',
                        display: 'flex', alignItems: 'center', padding: 0,
                    }}
                >
                    <IconClose size={16} weight={2} />
                </button>
            )}
        </div>
    );
}
