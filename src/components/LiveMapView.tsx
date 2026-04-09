import { useState, useRef, useEffect, useCallback } from 'react';
import type { Trip, ItineraryDay } from '../types';
import { searchMapPOIs, optimizeDayOrder } from '../services/geminiService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const L = (window as any).L;

const DAY_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

function dayColor(dayIndex: number): string {
  return DAY_COLORS[dayIndex % DAY_COLORS.length];
}

const DAY_COLOR_NAMES = ['amber', 'emerald', 'blue', 'red', 'violet', 'pink', 'cyan'];

const DAY_PILL_CLASSES: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-700 ring-amber-400',
  emerald: 'bg-emerald-100 text-emerald-700 ring-emerald-400',
  blue: 'bg-blue-100 text-blue-700 ring-blue-400',
  red: 'bg-red-100 text-red-700 ring-red-400',
  violet: 'bg-violet-100 text-violet-700 ring-violet-400',
  pink: 'bg-pink-100 text-pink-700 ring-pink-400',
  cyan: 'bg-cyan-100 text-cyan-700 ring-cyan-400',
};

interface LiveMapViewProps {
  trip: Trip;
  onUpdateTrip: (trip: Trip) => void;
}

interface SearchResult {
  title: string;
  lat: number;
  lng: number;
  description: string;
}

export default function LiveMapView({ trip, onUpdateTrip }: LiveMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ReturnType<typeof L.map> | null>(null);
  const markersLayerRef = useRef<ReturnType<typeof L.layerGroup> | null>(null);
  const searchLayerRef = useRef<ReturnType<typeof L.layerGroup> | null>(null);
  const routeLayerRef = useRef<ReturnType<typeof L.layerGroup> | null>(null);

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<{
    optimizedDay: ItineraryDay;
    rationale: string;
  } | null>(null);

  // ─── Init map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
    }).setView([0, 0], 2);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    const searchLayer = L.layerGroup().addTo(map);
    const routeLayer = L.layerGroup().addTo(map);

    mapRef.current = map;
    markersLayerRef.current = markersLayer;
    searchLayerRef.current = searchLayer;
    routeLayerRef.current = routeLayer;

    // ResizeObserver
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ─── Render markers + routes ───────────────────────────────────────────────
  const renderMarkers = useCallback(() => {
    if (!mapRef.current || !markersLayerRef.current || !routeLayerRef.current) return;
    markersLayerRef.current.clearLayers();
    routeLayerRef.current.clearLayers();

    const days = selectedDay !== null
      ? trip.itinerary.filter((d) => d.day === selectedDay)
      : trip.itinerary;

    const allCoords: [number, number][] = [];

    days.forEach((day) => {
      const colorIdx = (day.day - 1) % DAY_COLORS.length;
      const color = dayColor(colorIdx);
      const dayCoords: [number, number][] = [];

      day.items.forEach((item, itemIdx) => {
        if (!item.coordinates || (item.coordinates.lat === 0 && item.coordinates.lng === 0)) return;

        const pos: [number, number] = [item.coordinates.lat, item.coordinates.lng];
        allCoords.push(pos);
        dayCoords.push(pos);

        const icon = L.divIcon({
          className: '',
          html: `<div style="background:${color};color:#fff;font-weight:700;font-size:12px;width:36px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,.25);border:2px solid #fff;">${day.day}.${itemIdx + 1}</div>`,
          iconSize: [36, 28],
          iconAnchor: [18, 14],
        });

        const marker = L.marker(pos, { icon });
        marker.bindPopup(
          `<div style="font-family:system-ui;min-width:160px;">
            <strong style="font-size:14px;">${item.title}</strong>
            <div style="color:#64748b;font-size:12px;margin-top:4px;">${item.time} &middot; ${item.location}</div>
          </div>`
        );
        markersLayerRef.current!.addLayer(marker);
      });

      // Draw route for this day
      if (dayCoords.length >= 2) {
        fetchRoute(dayCoords, color);
      }
    });

    if (allCoords.length > 0) {
      mapRef.current.fitBounds(L.latLngBounds(allCoords), { padding: [40, 40] });
    }
  }, [trip.itinerary, selectedDay]);

  useEffect(() => {
    renderMarkers();
  }, [renderMarkers]);

  // ─── OSRM routing ─────────────────────────────────────────────────────────
  async function fetchRoute(coords: [number, number][], color: string) {
    if (!routeLayerRef.current) return;

    const coordStr = coords.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.code === 'Ok' && data.routes?.[0]?.geometry) {
        const geojson = L.geoJSON(data.routes[0].geometry, {
          style: { color, weight: 4, opacity: 0.7 },
        });
        routeLayerRef.current!.addLayer(geojson);
      } else {
        drawFallbackLine(coords, color);
      }
    } catch {
      drawFallbackLine(coords, color);
    }
  }

  function drawFallbackLine(coords: [number, number][], color: string) {
    if (!routeLayerRef.current) return;
    const polyline = L.polyline(coords, {
      color,
      weight: 3,
      opacity: 0.5,
      dashArray: '8, 8',
    });
    routeLayerRef.current.addLayer(polyline);
  }

  // ─── Search ────────────────────────────────────────────────────────────────
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim() || searching) return;

    setSearching(true);
    setSearchResults([]);
    searchLayerRef.current?.clearLayers();

    try {
      const result = await searchMapPOIs(trip.destination, searchQuery.trim());
      const locs = result.locations || [];
      setSearchResults(locs);

      locs.forEach((loc) => {
        if (!searchLayerRef.current) return;
        const icon = L.divIcon({
          className: '',
          html: `<div style="background:#14b8a6;color:#fff;font-weight:700;font-size:11px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.25);border:2px solid #fff;">★</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([loc.lat, loc.lng], { icon });
        marker.bindPopup(
          `<div style="font-family:system-ui;min-width:160px;">
            <strong style="font-size:14px;">${loc.title}</strong>
            <div style="color:#64748b;font-size:12px;margin-top:4px;">${loc.description}</div>
          </div>`
        );
        searchLayerRef.current.addLayer(marker);
      });

      if (locs.length > 0 && mapRef.current) {
        const bounds = L.latLngBounds(locs.map((l: SearchResult) => [l.lat, l.lng]));
        mapRef.current.fitBounds(bounds, { padding: [40, 40] });
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  }

  // ─── Optimize route ────────────────────────────────────────────────────────
  async function handleOptimize() {
    const dayNum = selectedDay ?? trip.itinerary[0]?.day;
    const day = trip.itinerary.find((d) => d.day === dayNum);
    if (!day || optimizing) return;

    setOptimizing(true);
    setOptimizeResult(null);

    try {
      const result = await optimizeDayOrder(day, trip.destination);
      setOptimizeResult(result);
    } catch (err) {
      console.error('Optimize failed:', err);
    } finally {
      setOptimizing(false);
    }
  }

  function applyOptimizedRoute() {
    if (!optimizeResult) return;
    const updated = trip.itinerary.map((d) =>
      d.day === optimizeResult.optimizedDay.day ? optimizeResult.optimizedDay : d
    );
    onUpdateTrip({ ...trip, itinerary: updated });
    setOptimizeResult(null);
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Day pills */}
        <button
          onClick={() => setSelectedDay(null)}
          className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-full transition-all ${
            selectedDay === null
              ? 'bg-slate-800 text-white ring-2 ring-slate-600'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          All Days
        </button>
        {trip.itinerary.map((day) => {
          const colorName = DAY_COLOR_NAMES[(day.day - 1) % DAY_COLOR_NAMES.length];
          const pillClass = DAY_PILL_CLASSES[colorName];
          const isActive = selectedDay === day.day;
          return (
            <button
              key={day.day}
              onClick={() => setSelectedDay(day.day)}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-full transition-all ${pillClass} ${
                isActive ? 'ring-2' : 'opacity-70 hover:opacity-100'
              }`}
            >
              Day {day.day}
            </button>
          );
        })}

        <div className="flex-1" />

        {/* Optimize button */}
        <button
          onClick={handleOptimize}
          disabled={optimizing || trip.itinerary.length === 0}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50 transition-all"
        >
          {optimizing ? (
            <div className="w-3.5 h-3.5 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          ) : (
            <span>⚡</span>
          )}
          Optimize Route
        </button>

        {/* Download stub */}
        <button className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all">
          📥 Download Offline
        </button>
      </div>

      {/* Optimize rationale card */}
      {optimizeResult && (
        <div className="rounded-[2rem] bg-amber-50 border border-amber-200 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-2">
            Optimization Rationale
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">{optimizeResult.rationale}</p>
          <button
            onClick={applyOptimizedRoute}
            className="mt-3 px-5 py-2 text-xs font-bold uppercase tracking-widest rounded-full bg-amber-500 text-white hover:bg-amber-600 transition-all"
          >
            Apply to Itinerary
          </button>
        </div>
      )}

      {/* Search bar */}
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search places, attractions..."
          className="w-full pl-10 pr-4 py-3 rounded-full border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
        />
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        {searching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          </div>
        )}
      </form>

      {/* Map container */}
      <div
        ref={containerRef}
        className="w-full h-[500px] rounded-[2rem] overflow-hidden border border-slate-200 shadow-sm"
      />

      {/* Search result cards */}
      {searchResults.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {searchResults.map((result, i) => (
            <div
              key={`${result.title}-${i}`}
              className="rounded-[2rem] bg-white border border-slate-200 p-4 hover:shadow-md transition-shadow"
            >
              <h4 className="font-black tracking-tight text-sm text-slate-800">{result.title}</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                {result.description}
              </p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${result.lat},${result.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-xs font-bold uppercase tracking-widest text-teal-600 hover:text-teal-700"
              >
                View on Maps &rarr;
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
