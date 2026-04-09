import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TripConfig, TravelPace, BudgetLevel } from '../types';

interface CreateTripModalProps {
  onClose: () => void;
  onGenerate: (config: TripConfig) => Promise<void>;
  isGenerating: boolean;
}

const LOADING_STEPS = [
  'Awakening Gemini reasoning engine...',
  'Consulting local cultural calendars...',
  'Scouting hidden gems...',
  'Calculating optimal paths...',
  'Calibrating to your pace and budget...',
  'Finalizing your itinerary...',
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const PACE_OPTIONS: { value: TravelPace; label: string; emoji: string }[] = [
  { value: 'relaxed', label: 'Relaxed', emoji: '🧘' },
  { value: 'moderate', label: 'Moderate', emoji: '🚶' },
  { value: 'packed', label: 'Packed', emoji: '⚡' },
  { value: 'immersive', label: 'Immersive', emoji: '🌍' },
  { value: 'spontaneous', label: 'Spontaneous', emoji: '🎲' },
];

const BUDGET_OPTIONS: { value: BudgetLevel; label: string }[] = [
  { value: 'economy', label: 'Economy' },
  { value: 'standard', label: 'Standard' },
  { value: 'luxury', label: 'Luxury' },
];

const ALL_INTERESTS = [
  'Foodies', 'Street Markets', 'Museums', 'Nature', 'Nightlife',
  'Shopping', 'History', 'Beach', 'Hiking', 'Architecture',
  'Photography', 'Food Markets', 'Flea Markets', 'Leisure',
];

const QUICK_ADD_CHIPS = [
  'Kid-friendly activities',
  'Strictly Vegan dining',
  'Avoid tourist traps',
  'Hidden photography spots',
  'No long walks',
  'Romantic atmosphere',
];

const GROUP_TYPES = ['Solo', 'Couple', 'Family', 'Friends', 'Business'];

export default function CreateTripModal({ onClose, onGenerate, isGenerating }: CreateTripModalProps) {
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [dateMode, setDateMode] = useState<'specific' | 'flexible'>('specific');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [flexibleMonth, setFlexibleMonth] = useState(0);
  const [flexibleDays, setFlexibleDays] = useState(7);
  const [travelers, setTravelers] = useState(2);
  const [travelerType, setTravelerType] = useState('Couple');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [pace, setPace] = useState<TravelPace>('moderate');
  const [budget, setBudget] = useState<BudgetLevel>('standard');
  const [interests, setInterests] = useState<string[]>([]);
  const [specialRequests, setSpecialRequests] = useState('');

  const [loadingStep, setLoadingStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isGenerating) {
      setProgress(0);
      setLoadingStep(0);

      progressRef.current = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            if (progressRef.current) clearInterval(progressRef.current);
            return 100;
          }
          return p + 100 / (25 * 10);
        });
      }, 100);

      stepRef.current = setInterval(() => {
        setLoadingStep(s => (s + 1) % LOADING_STEPS.length);
      }, 4000);
    } else {
      if (progressRef.current) clearInterval(progressRef.current);
      if (stepRef.current) clearInterval(stepRef.current);
    }
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
      if (stepRef.current) clearInterval(stepRef.current);
    };
  }, [isGenerating]);

  function toggleInterest(interest: string) {
    setInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  }

  function appendChip(chip: string) {
    setSpecialRequests(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return chip;
      if (trimmed.endsWith('.') || trimmed.endsWith(',')) return `${trimmed} ${chip}`;
      return `${trimmed}. ${chip}`;
    });
  }

  function handleSubmit() {
    onGenerate({
      name,
      destination,
      dateMode,
      startDate,
      endDate,
      flexibleMonth,
      flexibleDays,
      travelers,
      travelerType,
      coverImageUrl,
      pace,
      budget,
      interests,
      specialRequests,
    });
  }

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => { if (e.target === e.currentTarget && !isGenerating) onClose(); }}
    >
      <motion.div
        className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        {/* Loading overlay */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              className="absolute inset-0 z-10 bg-white rounded-[2.5rem] flex flex-col items-center justify-center gap-6 px-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Spinner */}
              <div className="relative flex items-center justify-center">
                <div className="w-20 h-20 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                <span className="absolute text-2xl select-none">✨</span>
              </div>

              <p className="text-2xl font-black tracking-tight text-slate-800">Crafting Your Legend</p>

              {/* Cycling step text */}
              <div className="h-7 overflow-hidden flex items-center">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={loadingStep}
                    className="text-slate-500 text-sm font-medium text-center"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    transition={{ duration: 0.35 }}
                  >
                    {LOADING_STEPS[loadingStep]}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-sm bg-amber-500/15 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: 'linear' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="px-8 pt-8 pb-4 flex items-center justify-between shrink-0">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">New Adventure</p>
            <h2 className="text-2xl font-black tracking-tight text-slate-800">Plan Your Trip</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors disabled:opacity-40"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto px-8 pb-4 space-y-6">

          {/* Trip Name + Destination */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1.5">Trip Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Summer Escape..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1.5">Destination <span className="text-rose-400">*</span></label>
              <input
                type="text"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                placeholder="Tokyo, Japan..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Date Preferences */}
          <div className="bg-slate-50 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Date Preferences</p>
              <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1">
                {(['specific', 'flexible'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setDateMode(mode)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all capitalize ${
                      dateMode === mode
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {mode === 'specific' ? 'Specific Dates' : 'Flexible'}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {dateMode === 'specific' ? (
                <motion.div
                  key="specific"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-2 gap-4"
                >
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1.5">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1.5">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="flexible"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-2 gap-4"
                >
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1.5">Target Month</label>
                    <select
                      value={flexibleMonth}
                      onChange={e => setFlexibleMonth(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
                    >
                      {MONTHS.map((m, i) => (
                        <option key={m} value={i}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1.5">Number of Days</label>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={flexibleDays}
                      onChange={e => setFlexibleDays(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Travelers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1.5">Travelers</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setTravelers(t => Math.max(1, t - 1))}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-lg transition-colors"
                >−</button>
                <span className="text-slate-800 font-black text-lg w-6 text-center">{travelers}</span>
                <button
                  onClick={() => setTravelers(t => Math.min(20, t + 1))}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-lg transition-colors"
                >+</button>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1.5">Group Type</label>
              <select
                value={travelerType}
                onChange={e => setTravelerType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
              >
                {GROUP_TYPES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
          </div>

          {/* Cover Image URL */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1.5">Cover Image URL <span className="normal-case font-normal text-slate-400">(optional)</span></label>
            <input
              type="text"
              value={coverImageUrl}
              onChange={e => setCoverImageUrl(e.target.value)}
              placeholder="Paste an Unsplash URL..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
            />
          </div>

          {/* Travel Style */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2.5">Travel Style</label>
            <div className="flex flex-wrap gap-2">
              {PACE_OPTIONS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPace(p.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                    pace === p.value
                      ? 'bg-amber-100 border-amber-400 text-amber-800'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {p.emoji} {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2.5">Budget</label>
            <div className="flex gap-3">
              {BUDGET_OPTIONS.map(b => (
                <button
                  key={b.value}
                  onClick={() => setBudget(b.value)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                    budget === b.value
                      ? 'bg-slate-800 text-white border-slate-800 shadow-lg'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interests */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2.5">Interests</label>
            <div className="flex flex-wrap gap-2">
              {ALL_INTERESTS.map(interest => (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    interests.includes(interest)
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {/* Special Requests */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2.5">Special Requests</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {QUICK_ADD_CHIPS.map(chip => (
                <button
                  key={chip}
                  onClick={() => appendChip(chip)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors"
                >
                  + {chip}
                </button>
              ))}
            </div>
            <textarea
              value={specialRequests}
              onChange={e => setSpecialRequests(e.target.value)}
              placeholder="Any other preferences or requirements..."
              className="w-full h-32 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition resize-y"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="px-6 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!destination.trim() || isGenerating}
            className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm tracking-tight transition-colors shadow-md"
          >
            Generate Adventure
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
