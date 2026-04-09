import { useState } from 'react';
import { motion } from 'framer-motion';
import type { ItineraryDay, ItineraryItem, Trip } from '../types';

interface ItemEditorModalProps {
  item?: ItineraryItem;
  dayNumber: number;
  trip: Trip;
  onSave: (itinerary: ItineraryDay[]) => void;
  onClose: () => void;
}

const CATEGORIES: ItineraryItem['category'][] = [
  'activity',
  'accommodation',
  'transport',
  'dining',
  'market',
  'leisure',
];

function parseTimeToMinutes(time: string): number {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();
  if (meridiem === 'AM') {
    if (hours === 12) hours = 0;
  } else {
    if (hours !== 12) hours += 12;
  }
  return hours * 60 + minutes;
}

function sortItems(items: ItineraryItem[]): ItineraryItem[] {
  return [...items].sort(
    (a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time)
  );
}

export default function ItemEditorModal({
  item,
  dayNumber,
  trip,
  onSave,
  onClose,
}: ItemEditorModalProps) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [time, setTime] = useState(item?.time ?? '');
  const [category, setCategory] = useState<ItineraryItem['category']>(
    item?.category ?? 'activity'
  );
  const [location, setLocation] = useState(item?.location ?? '');
  const [lat, setLat] = useState<string>(
    item?.coordinates?.lat !== undefined ? String(item.coordinates.lat) : ''
  );
  const [lng, setLng] = useState<string>(
    item?.coordinates?.lng !== undefined ? String(item.coordinates.lng) : ''
  );
  const [description, setDescription] = useState(item?.description ?? '');
  const [costEstimate, setCostEstimate] = useState<string>(
    item?.costEstimate !== undefined ? String(item.costEstimate) : ''
  );
  const [selectedDay, setSelectedDay] = useState<number>(dayNumber);

  const isEditing = Boolean(item);

  function handleSave() {
    if (!title.trim()) return;

    const updatedItem: ItineraryItem = {
      id: item?.id ?? crypto.randomUUID(),
      title: title.trim(),
      time: time.trim() || '12:00 PM',
      category,
      location: location.trim(),
      coordinates: {
        lat: lat !== '' ? parseFloat(lat) : 0,
        lng: lng !== '' ? parseFloat(lng) : 0,
      },
      description: description.trim(),
      ...(costEstimate !== '' ? { costEstimate: parseFloat(costEstimate) } : {}),
      isAiGenerated: item?.isAiGenerated ?? false,
    };

    let itinerary: ItineraryDay[] = trip.itinerary.map(d => ({ ...d, items: [...d.items] }));

    if (isEditing && item) {
      const originalDayIndex = itinerary.findIndex(d => d.items.some(i => i.id === item.id));

      if (originalDayIndex !== -1) {
        // Remove from original day
        itinerary[originalDayIndex] = {
          ...itinerary[originalDayIndex],
          items: itinerary[originalDayIndex].items.filter(i => i.id !== item.id),
        };
      }
    }

    const targetDayIndex = itinerary.findIndex(d => d.day === selectedDay);

    if (targetDayIndex !== -1) {
      itinerary[targetDayIndex] = {
        ...itinerary[targetDayIndex],
        items: sortItems([...itinerary[targetDayIndex].items, updatedItem]),
      };
    }

    onSave(itinerary);
    onClose();
  }

  const inputClass =
    'w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition';

  const labelClass = 'text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1.5';

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div>
            <p className={labelClass}>{isEditing ? 'Edit Item' : 'New Item'}</p>
            <h2 className="text-2xl font-black tracking-tight text-slate-800">
              {isEditing ? 'Edit Activity' : 'Add Activity'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable fields */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">

          {/* Title */}
          <div>
            <label className={labelClass}>Title <span className="text-rose-400">*</span></label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Visit Senso-ji Temple..."
              className={inputClass}
            />
          </div>

          {/* Time + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Time</label>
              <input
                type="text"
                value={time}
                onChange={e => setTime(e.target.value)}
                placeholder="09:00 AM"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as ItineraryItem['category'])}
                className={inputClass}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className={labelClass}>Location</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="2 Chome-3-1 Asakusa, Taito..."
              className={inputClass}
            />
          </div>

          {/* Coordinates */}
          <div>
            <label className={labelClass}>Coordinates</label>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                value={lat}
                onChange={e => setLat(e.target.value)}
                placeholder="Latitude (35.7147)"
                step="any"
                className={inputClass}
              />
              <input
                type="number"
                value={lng}
                onChange={e => setLng(e.target.value)}
                placeholder="Longitude (139.7966)"
                step="any"
                className={inputClass}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add notes or details about this activity..."
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Cost Estimate + Day selector */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Cost Estimate <span className="normal-case font-normal text-slate-400">(optional)</span></label>
              <input
                type="number"
                value={costEstimate}
                onChange={e => setCostEstimate(e.target.value)}
                placeholder="0.00"
                min={0}
                step="any"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Day</label>
              <select
                value={selectedDay}
                onChange={e => setSelectedDay(Number(e.target.value))}
                className={inputClass}
              >
                {trip.itinerary.map(d => (
                  <option key={d.day} value={d.day}>
                    Day {d.day} – {d.date}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 mt-6 shrink-0 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm tracking-tight transition-colors shadow-md"
          >
            {isEditing ? 'Save Changes' : 'Add Activity'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
