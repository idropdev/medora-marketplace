import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SearchBarProps {
    value: string;
    onChange: (v: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
    const { t } = useTranslation();

    return (
        <div style={{ position: 'relative' }}>
            <Search
                size={16}
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }}
            />
            <input
                type="text"
                placeholder={t('search.placeholder')}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{
                    width: '100%',
                    padding: '0.65rem 2.25rem 0.65rem 2.25rem',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-pill)',
                    color: 'var(--white)',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'var(--transition)',
                }}
                onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--gold)';
                    e.currentTarget.style.background = 'var(--surface-hover)';
                }}
                onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--surface)';
                }}
            />
            {value && (
                <button
                    onClick={() => onChange('')}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', color: 'var(--gray-400)', display: 'flex', alignItems: 'center' }}
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}
