import { useEffect, useRef, useCallback, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import type { Provider } from '../../types/provider';

const BORDER_CENTER = { lat: 31.738, lng: -106.455 };
const DEFAULT_ZOOM = 12;

/**
 * The Google Maps JavaScript API key is intentionally public — it MUST be
 * sent to the browser for the Maps SDK to authenticate itself.
 * Protect it by adding HTTP referrer restrictions in Google Cloud Console:
 *   → APIs & Services → Credentials → [your key] → Application restrictions
 *   → Set to "HTTP referrers" and add your domain(s).
 */
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

if (API_KEY) {
    setOptions({ key: API_KEY, v: 'weekly' });
}


interface MapViewProps {
    providers: Provider[];
    selectedProvider: Provider | null;
    onProviderSelect: (p: Provider) => void;
}

export function MapView({ providers, selectedProvider, onProviderSelect }: MapViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
    const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
    
    // User location tracking
    const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
    const userMarkerRef = useRef<google.maps.Marker | null>(null);

    // ── Marker icon builder ────────────────────────────────────────────────
    const makeIcon = useCallback((provider: Provider, isSelected: boolean): google.maps.Symbol => ({
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: isSelected
            ? '#C9A84C'
            : provider.promoted
                ? '#e0c075'
                : provider.country === 'MX'
                    ? '#22c55e'
                    : '#60a5fa',
        fillOpacity: 1,
        strokeColor: isSelected ? '#ffffff' : 'rgba(255,255,255,0.7)',
        strokeWeight: isSelected ? 3 : provider.promoted ? 2 : 1.5,
        scale: isSelected ? 14 : provider.promoted ? 12 : 10,
    }), []);

    // ── Init map ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (!API_KEY || !containerRef.current || mapInstance) return;

        let isMounted = true;
        (async () => {
            try {
                const { Map } = await importLibrary('maps');
                await importLibrary('marker'); // ensure marker library is loaded
                await importLibrary('places'); // ensure places library is loaded for reviews
                
                const initialTheme = document.documentElement.getAttribute('data-theme') || 'dark';
                
                const map = new Map(containerRef.current!, {
                    center: BORDER_CENTER,
                    zoom: DEFAULT_ZOOM,
                    zoomControl: true,
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                    styles: initialTheme === 'light' ? lightMapStyles : darkMapStyles,
                });
                
                if (isMounted) {
                    setMapInstance(map);
                }
            } catch (err) {
                console.error('[MapView] Maps init error:', err);
            }
        })();
        return () => { isMounted = false; };
    }, [mapInstance]);

    // ── Theme Listener ─────────────────────────────────────────────────────
    useEffect(() => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'data-theme') {
                    const newTheme = document.documentElement.getAttribute('data-theme');
                    if (mapInstance) {
                        mapInstance.setOptions({
                            styles: newTheme === 'light' ? lightMapStyles : darkMapStyles
                        });
                    }
                }
            });
        });

        observer.observe(document.documentElement, { attributes: true });
        return () => observer.disconnect();
    }, [mapInstance]);

    // ── Sync markers ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!mapInstance) return;

        const existingIds = new Set(markersRef.current.keys());
        const newIds = new Set(providers.map((p) => p.id));

        // Remove stale
        for (const id of existingIds) {
            if (!newIds.has(id)) {
                markersRef.current.get(id)?.setMap(null);
                markersRef.current.delete(id);
            }
        }

        // Add / update
        for (const p of providers) {
            const isSelected = selectedProvider?.id === p.id;
            const icon = makeIcon(p, isSelected);

            if (markersRef.current.has(p.id)) {
                markersRef.current.get(p.id)!.setIcon(icon);
            } else {
                const marker = new google.maps.Marker({
                    map: mapInstance,
                    position: { lat: p.lat, lng: p.lng },
                    title: p.name,
                    icon,
                });
                marker.addListener('click', () => onProviderSelect(p));
                markersRef.current.set(p.id, marker);
            }
        }
    }, [providers, selectedProvider, makeIcon, onProviderSelect, mapInstance]);

    // ── Pan to selected ────────────────────────────────────────────────────
    useEffect(() => {
        if (mapInstance && selectedProvider) {
            mapInstance.panTo({ lat: selectedProvider.lat, lng: selectedProvider.lng });
            mapInstance.setZoom(15);
        }
    }, [selectedProvider, mapInstance]);

    // ── Get User Geolocation ────────────────────────────────────────────────
    const locateUser = useCallback(() => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                setUserLoc(pos);
                
                if (mapInstance) {
                    mapInstance.panTo(pos);
                    mapInstance.setZoom(14);
                }
            },
            () => {
                console.warn('[MapView] Error: The Geolocation service failed.');
            }
        );
    }, []);

    // ── Sync User Marker ───────────────────────────────────────────────────
    useEffect(() => {
        if (!mapInstance || !userLoc) return;

        if (!userMarkerRef.current) {
            userMarkerRef.current = new google.maps.Marker({
                map: mapInstance,
                position: userLoc,
                title: 'You are here',
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: '#3b82f6', // bright blue
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                    scale: 8,
                },
                zIndex: 999, // ensures user shows above clinics
            });
        } else {
            userMarkerRef.current.setPosition(userLoc);
        }
    }, [userLoc]);

    // ── No API key — show visual placeholder ──────────────────────────────
    if (!API_KEY) {
        return (
            <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0a1929', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.12 }} viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
                    <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#4a7ba7" strokeWidth="0.5" /></pattern></defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                    <line x1="0" y1="300" x2="800" y2="300" stroke="#C9A84C" strokeWidth="2" strokeDasharray="8 4" />
                    <line x1="400" y1="0" x2="400" y2="600" stroke="#C9A84C" strokeWidth="2" strokeDasharray="8 4" />
                </svg>
                {providers.slice(0, 8).map((p, i) => (
                    <button
                        key={p.id}
                        onClick={() => onProviderSelect(p)}
                        title={p.name}
                        style={{
                            position: 'absolute',
                            left: `${15 + (i % 4) * 22}%`, top: i < 4 ? '30%' : '60%',
                            width: p.promoted ? 44 : 36, height: p.promoted ? 44 : 36,
                            borderRadius: '50%',
                            background: selectedProvider?.id === p.id ? '#C9A84C' : p.promoted ? 'linear-gradient(135deg,#C9A84C,#e0c075)' : 'rgba(11,31,58,0.9)',
                            border: `2px solid ${p.promoted || selectedProvider?.id === p.id ? '#C9A84C' : 'rgba(201,168,76,0.4)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: p.promoted ? 16 : 13,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            transform: selectedProvider?.id === p.id ? 'scale(1.25)' : 'scale(1)',
                            transition: 'transform 0.15s ease',
                            cursor: 'pointer', zIndex: p.promoted ? 2 : 1,
                        }}
                    >
                        {specialtyEmoji(p.specialty[0])}
                    </button>
                ))}
                <div style={{ background: 'rgba(11,31,58,0.9)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 12, padding: '1rem 1.5rem', textAlign: 'center', maxWidth: 320, backdropFilter: 'blur(8px)', zIndex: 10 }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>🗺️</div>
                    <p style={{ fontSize: '0.8rem', color: '#C9A84C', fontWeight: 600 }}>Map Preview Mode</p>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>
                        Add <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0 4px', borderRadius: 4, fontSize: '0.7rem' }}>VITE_GOOGLE_MAPS_API_KEY</code> to <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0 4px', borderRadius: 4, fontSize: '0.7rem' }}>.env.local</code> to enable the live map.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
            
            {/* Find me button */}
            <button
                onClick={locateUser}
                title="Find My Location"
                style={{
                    position: 'absolute',
                    bottom: '24px',
                    left: '24px',
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 10,
                    transition: 'var(--transition)'
                }}
            >
                <LocationIcon />
            </button>
        </div>
    );
}

function LocationIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
        </svg>
    );
}

function specialtyEmoji(s: string): string {
    const map: Record<string, string> = {
        dentist: '🦷', orthodontist: '😁', plastic_surgery: '💉',
        aesthetician: '✨', obgyn: '👶', physical_therapy: '🏃',
        massage: '💆', optometry: '👁', general: '🏥', pediatrics: '🧒', cardiology: '❤️',
    };
    return map[s] ?? '🏥';
}

const darkMapStyles: google.maps.MapTypeStyle[] = [
    { elementType: 'geometry', stylers: [{ color: '#0B1F3A' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0B1F3A' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#9ba8ba' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#143256' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0B1F3A' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1a3d68' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#071320' }] },
    { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#C9A84C' }, { weight: 1.5 }] },
];

const lightMapStyles: google.maps.MapTypeStyle[] = [
    { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
    { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
    { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
    { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#C9A84C' }, { weight: 1.5 }] },
];
