import { useRef, useEffect } from 'react';
import type { Trip } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const L = (window as any).L;

const DAY_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

function dayColor(dayIndex: number): string {
  return DAY_COLORS[dayIndex % DAY_COLORS.length];
}

interface ItineraryMapProps {
  trip: Trip;
}

export default function ItineraryMap({ trip }: ItineraryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ReturnType<typeof L.map> | null>(null);

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

    const allCoords: [number, number][] = [];

    trip.itinerary.forEach((day, dayIdx) => {
      const color = dayColor(dayIdx);
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
        marker.addTo(map);
      });

      if (dayCoords.length >= 2) {
        L.polyline(dayCoords, { color, weight: 3, opacity: 0.6 }).addTo(map);
      }
    });

    if (allCoords.length > 0) {
      map.fitBounds(L.latLngBounds(allCoords), { padding: [40, 40] });
    }

    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(containerRef.current);

    mapRef.current = map;

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [trip.itinerary]);

  const daysWithCoords = trip.itinerary.filter((day) =>
    day.items.some((item) => item.coordinates && !(item.coordinates.lat === 0 && item.coordinates.lng === 0))
  );

  if (daysWithCoords.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 mb-4">
      <div
        ref={containerRef}
        className="w-full h-[400px] rounded-[2rem] overflow-hidden border border-slate-200 shadow-sm"
      />
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1">
        {daysWithCoords.map((day, idx) => (
          <div key={day.day} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: dayColor(idx) }}
            />
            <span className="text-sm text-slate-500">
              Day {day.day} – {day.date}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
