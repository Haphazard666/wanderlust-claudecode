import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Trip, User, ItineraryItem } from '../types';
import ItineraryTabComponent from './ItineraryTab';
import ExpensesTabComponent from './ExpensesTab';

interface TripDetailProps {
  trip: Trip;
  user: User;
  onBack: () => void;
  onUpdateTrip: (trip: Trip) => void;
  onShare: () => void;
  onExport: () => void;
}

type Tab = 'itinerary' | 'map' | 'expenses' | 'documents';

const paceColors: Record<string, string> = {
  relaxed: 'bg-sky-500/20 text-sky-100',
  moderate: 'bg-amber-500/20 text-amber-100',
  packed: 'bg-rose-500/20 text-rose-100',
  immersive: 'bg-teal-500/20 text-teal-100',
  spontaneous: 'bg-fuchsia-500/20 text-fuchsia-100',
};

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', {
    ...opts,
    year: 'numeric',
  })}`;
}

function getCoverImage(trip: Trip): string {
  if (trip.coverImageUrl) return trip.coverImageUrl;
  const seed = trip.destination.replace(/\s+/g, '-').toLowerCase();
  return `https://picsum.photos/seed/${seed}/1600/600`;
}

// --- Tab stub components ---

function MapTab({ trip }: { trip: Trip }) {
  return (
    <div className="py-10 text-center text-slate-400 text-sm font-bold uppercase tracking-widest">
      Map — {trip.destination}
    </div>
  );
}


function DocumentsTab({ trip }: { trip: Trip }) {
  return (
    <div className="py-10 text-center text-slate-400 text-sm font-bold uppercase tracking-widest">
      Documents — {trip.documents.length} file{trip.documents.length !== 1 ? 's' : ''}
    </div>
  );
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'itinerary', label: 'Itinerary' },
  { id: 'map', label: 'Map' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'documents', label: 'Documents' },
];

export default function TripDetail({
  trip,
  user: _user,
  onBack,
  onUpdateTrip,
  onShare,
  onExport,
}: TripDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>('itinerary');
  const [fadeKey, setFadeKey] = useState(0);

  function switchTab(tab: Tab) {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setFadeKey((k) => k + 1);
  }

  const coverImage = getCoverImage(trip);
  const paceBadgeClass = paceColors[trip.pace] ?? 'bg-white/20 text-white';

  return (
    <motion.div
      className="min-h-screen bg-[#fdfdfc] flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Hero */}
      <div className="relative h-[40vh] w-full overflow-hidden flex-shrink-0">
        <img
          src={coverImage}
          alt={trip.destination}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />

        {/* Bottom-left: back + trip info */}
        <div className="absolute bottom-0 left-0 p-6 flex flex-col gap-2">
          <button
            onClick={onBack}
            className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/30 bg-white/10 backdrop-blur-sm text-white text-sm font-semibold hover:bg-white/20 transition-colors"
          >
            <span>←</span>
            <span>Your Expeditions</span>
          </button>

          <h1 className="text-5xl font-black text-white leading-tight drop-shadow-lg">
            {trip.name}
          </h1>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-white/90 font-semibold text-base drop-shadow">
              {trip.destination}
            </span>
            {trip.startDate && trip.endDate && (
              <>
                <span className="text-white/40">·</span>
                <span className="text-white/80 text-sm font-medium">
                  {formatDateRange(trip.startDate, trip.endDate)}
                </span>
              </>
            )}
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-widest ${paceBadgeClass}`}
            >
              {trip.pace}
            </span>
          </div>
        </div>

        {/* Bottom-right: Share + Export */}
        <div className="absolute bottom-0 right-0 p-6 flex items-end gap-3">
          <button
            onClick={onShare}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm text-white border border-white/20 text-sm font-semibold hover:bg-white/20 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </button>
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-slate-900 text-sm font-bold shadow-lg hover:bg-slate-50 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 flex gap-0 overflow-x-auto hide-scrollbar">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`px-5 py-4 text-sm transition-colors relative
                  ${isActive
                    ? 'text-amber-500 font-bold'
                    : 'text-slate-400 hover:text-slate-600 font-medium'
                  }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-6">
        {/* Custom Instructions banner */}
        {trip.customInstructions && (
          <div className="mb-6 flex items-start gap-3 px-5 py-4 rounded-2xl bg-amber-50 border border-amber-200">
            <span className="text-lg leading-none mt-0.5">🪄</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-1">
                Global AI Constraints
              </p>
              <p className="text-sm italic text-slate-600 leading-relaxed">
                {trip.customInstructions}
              </p>
            </div>
          </div>
        )}

        {/* Tab content with fade-in */}
        <div
          key={fadeKey}
          className="animate-[fadeIn_0.2s_ease-in-out]"
          style={{ animation: 'fadeIn 0.2s ease-in-out' }}
        >
          {activeTab === 'itinerary' && (
            <ItineraryTabComponent
              trip={trip}
              onUpdateTrip={onUpdateTrip}
              onEditItem={(_item: ItineraryItem, _dayNumber: number) => {
                // TODO: wire to item edit modal
              }}
            />
          )}
          {activeTab === 'map' && <MapTab trip={trip} />}
          {activeTab === 'expenses' && <ExpensesTabComponent trip={trip} onUpdateTrip={onUpdateTrip} />}
          {activeTab === 'documents' && <DocumentsTab trip={trip} />}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </motion.div>
  );
}
