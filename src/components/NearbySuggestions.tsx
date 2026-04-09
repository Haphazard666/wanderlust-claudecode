import { useState } from 'react';
import { getLocalRecommendations } from '../services/geminiService';
import type { Trip, ItineraryItem } from '../types';

interface LocationResult {
  title: string;
  lat: number;
  lng: number;
  description: string;
}

interface NearbySuggestionsProps {
  trip: Trip;
  onAddItem: (dayNumber: number, item: ItineraryItem) => void;
}

const CATEGORIES = [
  { label: 'Restaurants', emoji: '🍽️' },
  { label: 'Cafés', emoji: '☕' },
  { label: 'Museums', emoji: '🏛️' },
  { label: 'Parks', emoji: '🌿' },
  { label: 'Shopping', emoji: '🛍️' },
  { label: 'Photo Spots', emoji: '📸' },
  { label: 'Nightlife', emoji: '🎶' },
];

const CATEGORY_TO_ITEM_CATEGORY: Record<string, ItineraryItem['category']> = {
  Restaurants: 'dining',
  Cafés: 'dining',
  Museums: 'activity',
  Parks: 'leisure',
  Shopping: 'market',
  'Photo Spots': 'activity',
  Nightlife: 'leisure',
};

export default function NearbySuggestions({ trip, onAddItem }: NearbySuggestionsProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [openDayPicker, setOpenDayPicker] = useState<string | null>(null);

  async function handleCategoryClick(category: string) {
    if (activeCategory === category) return;
    setActiveCategory(category);
    setResults([]);
    setLoading(true);
    try {
      const data = await getLocalRecommendations(trip.destination, category);
      setResults(data.locations ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleAddItem(dayNumber: number, loc: LocationResult, category: string) {
    const item: ItineraryItem = {
      id: `nearby-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time: '12:00',
      title: loc.title,
      description: loc.description,
      location: loc.title,
      coordinates: { lat: loc.lat, lng: loc.lng },
      category: CATEGORY_TO_ITEM_CATEGORY[category] ?? 'activity',
      isAiGenerated: true,
    };
    onAddItem(dayNumber, item);
    setOpenDayPicker(null);
  }

  return (
    <div className="mb-6">
      {/* Category strip */}
      <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map(({ label, emoji }) => (
          <button
            key={label}
            onClick={() => handleCategoryClick(label)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all border
              ${activeCategory === label
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-amber-400 hover:text-amber-600'
              }`}
          >
            <span>{emoji}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-3 mt-4 px-1">
          <div className="w-5 h-5 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin flex-shrink-0" />
          <span className="text-sm text-slate-400">Finding the best {activeCategory?.toLowerCase()} in {trip.destination}…</span>
        </div>
      )}

      {/* Results row */}
      {!loading && results.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pt-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {results.map((loc) => {
            const cardKey = `${loc.title}-${loc.lat}-${loc.lng}`;
            const isPickerOpen = openDayPicker === cardKey;

            return (
              <div
                key={cardKey}
                className="w-56 flex-shrink-0 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 flex flex-col gap-2"
              >
                <p className="font-black text-sm text-slate-800 leading-tight line-clamp-2">{loc.title}</p>
                <p className="text-xs text-slate-500 leading-snug line-clamp-3 flex-1">{loc.description}</p>

                <a
                  href={`https://maps.google.com/?q=${loc.lat},${loc.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-amber-500 hover:text-amber-600 transition-colors"
                >
                  📍 View on Map
                </a>

                {/* Add to Trip / day picker */}
                <div className="relative">
                  <button
                    onClick={() => setOpenDayPicker(isPickerOpen ? null : cardKey)}
                    className="w-full text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-full py-1.5 transition-colors"
                  >
                    + Add to Trip
                  </button>

                  {isPickerOpen && (
                    <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden z-10">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 px-3 pt-2 pb-1">Pick a day</p>
                      {trip.itinerary.length === 0 ? (
                        <p className="text-xs text-slate-400 px-3 pb-2">No days in itinerary yet.</p>
                      ) : (
                        <div className="max-h-40 overflow-y-auto">
                          {trip.itinerary.map((day) => (
                            <button
                              key={day.day}
                              onClick={() => handleAddItem(day.day, loc, activeCategory!)}
                              className="w-full text-left text-xs px-3 py-2 hover:bg-amber-50 text-slate-700 font-medium transition-colors"
                            >
                              Day {day.day}
                              {day.date ? ` · ${day.date}` : ''}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
