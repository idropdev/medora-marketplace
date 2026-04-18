import { useRef, useState } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { GoogleReview } from '../../hooks/useGoogleReviews';

interface ReviewCarouselProps {
    reviews: GoogleReview[];
    loading: boolean;
}

export function ReviewCarousel({ reviews, loading }: ReviewCarouselProps) {
    const { t } = useTranslation();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const updateScrollButtons = () => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 4);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    };

    const scroll = (direction: 'left' | 'right') => {
        const el = scrollRef.current;
        if (!el) return;
        const amount = el.clientWidth * 0.8;
        el.scrollBy({
            left: direction === 'left' ? -amount : amount,
            behavior: 'smooth',
        });
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h3 style={{
                    fontSize: '0.85rem', fontWeight: 600,
                    color: 'var(--gray-300)', letterSpacing: '0.02em',
                }}>
                    ⭐ Top Reviews
                </h3>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {[1, 2].map((i) => (
                        <div
                            key={i}
                            style={{
                                minWidth: 240, height: 120,
                                borderRadius: 'var(--radius)',
                                background: 'rgba(255,255,255,0.04)',
                                animation: 'pulse 1.5s ease-in-out infinite',
                            }}
                        />
                    ))}
                </div>
            </div>
        );
    }

    if (reviews.length === 0) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Section header */}
            <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <h3 style={{
                    fontSize: '0.85rem', fontWeight: 600,
                    color: 'var(--gray-300)', letterSpacing: '0.02em',
                    margin: 0,
                }}>
                    {t('drawer.topReviews')}
                </h3>

                {/* Scroll arrows */}
                {reviews.length > 1 && (
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <ScrollButton
                            direction="left"
                            disabled={!canScrollLeft}
                            onClick={() => scroll('left')}
                        />
                        <ScrollButton
                            direction="right"
                            disabled={!canScrollRight}
                            onClick={() => scroll('right')}
                        />
                    </div>
                )}
            </div>

            {/* Scrollable track */}
            <div
                ref={scrollRef}
                onScroll={updateScrollButtons}
                style={{
                    display: 'flex',
                    gap: '0.75rem',
                    overflowX: 'auto',
                    scrollSnapType: 'x mandatory',
                    WebkitOverflowScrolling: 'touch',
                    paddingBottom: '0.25rem',
                    /* hide scrollbar */
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                }}
                className="review-scroll-track"
            >
                {reviews.map((review, idx) => (
                    <ReviewCard key={idx} review={review} />
                ))}
            </div>
        </div>
    );
}

/* ── Individual review card ───────────────────────────────────────────── */
function ReviewCard({ review }: { review: GoogleReview }) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);
    const isLong = review.text.length > 120;

    return (
        <div
            style={{
                minWidth: 260,
                maxWidth: 280,
                flexShrink: 0,
                scrollSnapAlign: 'start',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 'var(--radius)',
                padding: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                cursor: 'default',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)';
                e.currentTarget.style.boxShadow = '0 2px 12px rgba(201,168,76,0.08)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            {/* Author row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {review.profile_photo_url ? (
                    <img
                        src={review.profile_photo_url}
                        alt={review.author_name}
                        referrerPolicy="no-referrer"
                        style={{
                            width: 28, height: 28, borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1px solid rgba(255,255,255,0.1)',
                        }}
                    />
                ) : (
                    <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: 700, color: 'var(--navy)',
                    }}>
                        {review.author_name.charAt(0).toUpperCase()}
                    </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontSize: '0.78rem', fontWeight: 600,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {review.author_name}
                    </div>
                    <div style={{
                        fontSize: '0.65rem', color: 'var(--gray-500)',
                    }}>
                        {review.relative_time_description}
                    </div>
                </div>
            </div>

            {/* Stars */}
            <div style={{ display: 'flex', gap: '2px' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                        key={i}
                        size={12}
                        style={{
                            color: i < review.rating ? 'var(--gold)' : 'var(--gray-700)',
                            fill: i < review.rating ? 'var(--gold)' : 'none',
                        }}
                    />
                ))}
            </div>

            {/* Review text */}
            <p style={{
                fontSize: '0.76rem',
                lineHeight: 1.5,
                color: 'var(--gray-400)',
                margin: 0,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: expanded ? 999 : 3,
                WebkitBoxOrient: 'vertical',
            }}>
                {review.text || 'No written review.'}
            </p>

            {isLong && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    style={{
                        background: 'none', border: 'none', padding: 0,
                        fontSize: '0.7rem', color: 'var(--gold-light)',
                        cursor: 'pointer', alignSelf: 'flex-start',
                        fontWeight: 600,
                    }}
                >
                    {expanded ? t('drawer.showLess') : t('drawer.readMore')}
                </button>
            )}
        </div>
    );
}

/* ── Scroll arrow button ──────────────────────────────────────────────── */
function ScrollButton({
    direction,
    disabled,
    onClick,
}: {
    direction: 'left' | 'right';
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                width: 24, height: 24,
                borderRadius: '50%',
                background: disabled
                    ? 'rgba(255,255,255,0.03)'
                    : 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: disabled ? 'default' : 'pointer',
                opacity: disabled ? 0.3 : 1,
                transition: 'all 0.15s ease',
                color: 'var(--gray-400)',
                padding: 0,
            }}
        >
            {direction === 'left' ? (
                <ChevronLeft size={14} />
            ) : (
                <ChevronRight size={14} />
            )}
        </button>
    );
}
