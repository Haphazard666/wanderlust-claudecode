import { motion } from 'framer-motion';
import type { Trip, User } from '../types';

interface DashboardProps {
  user: User;
  trips: Trip[];
  onNewTrip: () => void;
  onSelectTrip: (trip: Trip) => void;
  onDeleteTrip: (id: string) => void;
  onChangeImage: (trip: Trip) => void;
}

const budgetColors: Record<string, string> = {
  economy: 'bg-emerald-100 text-emerald-700',
  standard: 'bg-blue-100 text-blue-700',
  luxury: 'bg-purple-100 text-purple-700',
};

const paceColors: Record<string, string> = {
  relaxed: 'bg-sky-100 text-sky-700',
  moderate: 'bg-amber-100 text-amber-700',
  packed: 'bg-rose-100 text-rose-700',
  immersive: 'bg-teal-100 text-teal-700',
  spontaneous: 'bg-fuchsia-100 text-fuchsia-700',
};

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}

interface TripCardProps {
  trip: Trip;
  onSelect: () => void;
  onDelete: () => void;
  onChangeImage: () => void;
}

function TripCard({ trip, onSelect, onDelete, onChangeImage }: TripCardProps) {
  const imageUrl = trip.coverImageUrl ||
    `https://picsum.photos/seed/${encodeURIComponent(trip.destination)}/800/400`;

  return (
    <div
      className="group relative rounded-[2rem] overflow-hidden shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all duration-200 cursor-pointer bg-white"
      onClick={onSelect}
    >
      {/* Delete button */}
      <button
        className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-black shadow-md"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        aria-label="Delete trip"
      >
        ×
      </button>

      {/* Hero image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={imageUrl}
          alt={trip.destination}
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex flex-col justify-end p-4">
          <h3 className="font-black text-white text-lg leading-tight">{trip.name}</h3>
          <p className="text-slate-300 text-sm">{trip.destination}</p>
          <p className="text-slate-400 text-xs mt-0.5">{formatDateRange(trip.startDate, trip.endDate)}</p>
        </div>
      </div>

      {/* Chips + footer */}
      <div className="p-4">
        <div className="flex gap-2 flex-wrap mb-3">
          <span className={`rounded-full text-xs font-bold px-3 py-1 ${budgetColors[trip.budget] ?? 'bg-slate-100 text-slate-600'}`}>
            {trip.budget.charAt(0).toUpperCase() + trip.budget.slice(1)}
          </span>
          <span className={`rounded-full text-xs font-bold px-3 py-1 ${paceColors[trip.pace] ?? 'bg-slate-100 text-slate-600'}`}>
            {trip.pace.charAt(0).toUpperCase() + trip.pace.slice(1)}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>👥 {trip.collaborators.length + 1}</span>
          <button
            className="hover:text-amber-500 transition-colors text-base"
            onClick={(e) => { e.stopPropagation(); onChangeImage(); }}
            aria-label="Change cover image"
          >
            📷
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ user, trips, onNewTrip, onSelectTrip, onDeleteTrip, onChangeImage }: DashboardProps) {
  return (
    <motion.div
      className="min-h-screen bg-[#fdfdfc] p-6 md:p-10"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Your Expeditions</h1>
          <p className="text-slate-400 mt-1">Ready to add a new chapter, {user.firstName}?</p>
        </div>
        <button
          onClick={onNewTrip}
          className="self-start sm:self-auto bg-amber-500 hover:bg-amber-400 text-white font-black px-6 py-3 rounded-[1.5rem] shadow-xl shadow-amber-100 transition-all active:scale-95 whitespace-nowrap"
        >
          + Start New AI Plan
        </button>
      </div>

      {/* Empty state */}
      {trips.length === 0 ? (
        <div className="flex items-center justify-center py-10">
          <div className="border-2 border-dashed border-slate-200 rounded-[3rem] p-16 text-center max-w-md w-full">
            <div className="text-6xl mb-4">🏜️</div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">The world is waiting</h2>
            <p className="text-slate-400 mb-8">You haven't planned any trips yet. Let AI build your perfect itinerary.</p>
            <button
              onClick={onNewTrip}
              className="bg-amber-500 hover:bg-amber-400 text-white font-black px-8 py-3 rounded-[1.5rem] shadow-xl shadow-amber-100 transition-all active:scale-95"
            >
              Create My First Trip
            </button>
          </div>
        </div>
      ) : (
        /* Trip grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onSelect={() => onSelectTrip(trip)}
              onDelete={() => onDeleteTrip(trip.id)}
              onChangeImage={() => onChangeImage(trip)}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
