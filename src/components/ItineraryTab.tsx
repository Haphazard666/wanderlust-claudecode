import { useState } from 'react';
import type { Trip, ItineraryItem, ItineraryDay } from '../types';
import { modifyItineraryDay } from '../services/geminiService';
import NearbySuggestions from './NearbySuggestions';
import ItineraryMap from './ItineraryMap';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<ItineraryItem['category'], string> = {
  dining: '🍽️',
  accommodation: '🏨',
  market: '🧺',
  leisure: '🧘',
  transport: '🚕',
  activity: '🗺️',
};

function formatDayDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase();
}

function generateId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ItineraryTabProps {
  trip: Trip;
  onUpdateTrip: (trip: Trip) => void;
  onEditItem: (item: ItineraryItem, dayNumber: number) => void;
}

// ─── Item Card ────────────────────────────────────────────────────────────────

interface ItemCardProps {
  item: ItineraryItem;
  dayNumber: number;
  onEdit: () => void;
  onDelete: () => void;
}

function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
  const emoji = CATEGORY_EMOJI[item.category] ?? '🗺️';

  return (
    <div className="group relative bg-slate-50 rounded-[2rem] p-6 flex gap-6 hover:bg-white hover:shadow-xl hover:scale-[1.01] transition-all">
      {/* Edit / Delete */}
      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-white shadow text-base hover:bg-amber-50 transition-colors"
          aria-label="Edit item"
        >
          ✏️
        </button>
        <button
          onClick={onDelete}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-white shadow text-base hover:bg-red-50 transition-colors"
          aria-label="Delete item"
        >
          🗑️
        </button>
      </div>

      {/* Left col */}
      <div className="flex flex-col items-center gap-3 flex-shrink-0">
        <span className="text-xs font-black text-amber-600 whitespace-nowrap">{item.time}</span>
        <div className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow text-xl">
          {emoji}
        </div>
      </div>

      {/* Right col */}
      <div className="flex-1 min-w-0 pr-10">
        <div className="flex items-start gap-2 flex-wrap mb-1">
          <h4 className="text-xl font-black text-slate-900 leading-tight">{item.title}</h4>
          {item.isAiGenerated && (
            <span className="flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              AI Pick
            </span>
          )}
        </div>
        <p className="text-sm text-slate-400 mb-2">📍 {item.location}</p>
        <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
        {item.costEstimate !== undefined && item.costEstimate > 0 && (
          <p className="text-xs font-bold text-slate-400 mt-2">
            ~${item.costEstimate.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Day Section ──────────────────────────────────────────────────────────────

interface DaySectionProps {
  day: ItineraryDay;
  trip: Trip;
  onUpdateDay: (updatedDay: ItineraryDay) => void;
  onEditItem: (item: ItineraryItem) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (dayNumber: number) => void;
}

function DaySection({
  day,
  trip,
  onUpdateDay,
  onEditItem,
  onDeleteItem,
  onAddItem,
}: DaySectionProps) {
  const [magicInput, setMagicInput] = useState('');
  const [isReshaping, setIsReshaping] = useState(false);

  async function handleMagicEdit() {
    const instruction = magicInput.trim();
    if (!instruction || isReshaping) return;
    setIsReshaping(true);
    try {
      const updatedDay = await modifyItineraryDay(
        day,
        instruction,
        trip.destination,
        trip.customInstructions
      );
      onUpdateDay(updatedDay);
      setMagicInput('');
    } finally {
      setIsReshaping(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleMagicEdit();
  }

  return (
    <div className="relative flex gap-0">
      {/* Timeline */}
      <div className="flex flex-col items-center flex-shrink-0 w-12">
        {/* Day badge */}
        <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white text-sm font-black shadow-lg z-10 flex-shrink-0">
          {day.day}
        </div>
        {/* Vertical line */}
        <div className="flex-1 w-0.5 bg-slate-100 mt-2" />
      </div>

      {/* Content */}
      <div className="flex-1 pl-6 pb-12 min-w-0">
        {/* Day header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
          {/* Left: Day title + date */}
          <div className="flex-1">
            <h3 className="text-3xl font-black text-slate-900 leading-none">Day {day.day}</h3>
            <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">
              {formatDayDate(day.date)}
            </p>
          </div>

          {/* Right: Magic edit + add item */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-0 bg-slate-100 rounded-xl overflow-hidden pr-1">
              <input
                type="text"
                value={magicInput}
                onChange={(e) => setMagicInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask AI to change this day..."
                disabled={isReshaping}
                className="bg-transparent text-sm px-4 py-2 outline-none w-52 placeholder:text-slate-400 disabled:opacity-50"
              />
              <button
                onClick={handleMagicEdit}
                disabled={isReshaping || !magicInput.trim()}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-500 text-white font-bold text-base disabled:opacity-40 hover:bg-amber-600 transition-colors flex-shrink-0"
                aria-label="Send AI edit"
              >
                ✨
              </button>
            </div>

            <button
              onClick={() => onAddItem(day.day)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors"
            >
              <span>+</span>
              <span>Add Item</span>
            </button>
          </div>
        </div>

        {/* Items grid with optional overlay */}
        <div className="relative">
          {isReshaping && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-[2rem] bg-white/70 backdrop-blur-sm">
              <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
              <p className="text-sm font-black text-slate-700 tracking-tight">
                Reshaping Day {day.day}...
              </p>
            </div>
          )}
          <div className={`grid grid-cols-1 xl:grid-cols-2 gap-6 transition-all ${isReshaping ? 'blur-sm pointer-events-none' : ''}`}>
            {day.items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                dayNumber={day.day}
                onEdit={() => onEditItem(item)}
                onDelete={() => onDeleteItem(item.id)}
              />
            ))}
            {day.items.length === 0 && (
              <div className="col-span-2 py-10 text-center text-slate-400 text-sm font-bold uppercase tracking-widest">
                No activities yet — add one or ask AI
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ItineraryTab({ trip, onUpdateTrip, onEditItem }: ItineraryTabProps) {
  function updateDay(updatedDay: ItineraryDay) {
    const itinerary = trip.itinerary.map((d) =>
      d.day === updatedDay.day ? updatedDay : d
    );
    onUpdateTrip({ ...trip, itinerary });
  }

  function deleteItem(dayNumber: number, itemId: string) {
    const itinerary = trip.itinerary.map((d) => {
      if (d.day !== dayNumber) return d;
      return { ...d, items: d.items.filter((i) => i.id !== itemId) };
    });
    onUpdateTrip({ ...trip, itinerary });
  }

  function addNearbyItem(dayNumber: number, item: ItineraryItem) {
    const itinerary = trip.itinerary.map((d) => {
      if (d.day !== dayNumber) return d;
      return { ...d, items: [...d.items, item] };
    });
    onUpdateTrip({ ...trip, itinerary });
  }

  function handleAddItem(dayNumber: number) {
    const blankItem: ItineraryItem = {
      id: generateId(),
      time: '09:00',
      title: '',
      description: '',
      location: '',
      coordinates: { lat: 0, lng: 0 },
      category: 'activity',
      costEstimate: 0,
      isAiGenerated: false,
    };
    onEditItem(blankItem, dayNumber);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <NearbySuggestions trip={trip} onAddItem={addNearbyItem} />
      <ItineraryMap trip={trip} />

      {/* Days */}
      <div className="mt-8">
        {trip.itinerary.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm font-bold uppercase tracking-widest">
            No itinerary yet
          </div>
        ) : (
          trip.itinerary.map((day) => (
            <DaySection
              key={day.day}
              day={day}
              trip={trip}
              onUpdateDay={updateDay}
              onEditItem={(item) => onEditItem(item, day.day)}
              onDeleteItem={(itemId) => deleteItem(day.day, itemId)}
              onAddItem={handleAddItem}
            />
          ))
        )}
      </div>
    </div>
  );
}
