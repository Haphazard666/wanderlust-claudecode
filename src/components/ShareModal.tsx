import { useState } from 'react';
import { motion } from 'framer-motion';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Trip, User } from '../types';

interface ShareModalProps {
  trip: Trip;
  user: User;
  onUpdateTrip: (trip: Trip) => void;
  onClose: () => void;
}

export default function ShareModal({ trip, user, onUpdateTrip, onClose }: ShareModalProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const collaborators: string[] = trip.collaborators ?? [];

  async function handleInvite() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    if (collaborators.map(c => c.toLowerCase()).includes(trimmed)) {
      setError('Already added');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const updated: Trip = {
        ...trip,
        collaborators: [...collaborators, trimmed],
      };
      await updateDoc(doc(db, 'trips', trip.id), {
        collaborators: updated.collaborators,
      });
      onUpdateTrip(updated);
      setEmail('');
    } catch (e) {
      setError('Failed to send invite. Please try again.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(collab: string) {
    const updated: Trip = {
      ...trip,
      collaborators: collaborators.filter(c => c !== collab),
    };
    try {
      await updateDoc(doc(db, 'trips', trip.id), {
        collaborators: updated.collaborators,
      });
      onUpdateTrip(updated);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="bg-white rounded-[2rem] p-8 shadow-2xl w-full max-w-md mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Share Trip</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Invite Section */}
        <div className="mb-6">
          <p className="text-lg font-black tracking-tight text-slate-800 mb-3">
            Invite a Travel Companion
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleInvite(); }}
              placeholder="friend@example.com"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
            <button
              onClick={handleInvite}
              disabled={loading || !email.trim()}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors whitespace-nowrap"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Send Invite'
              )}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-xs font-semibold text-red-500">{error}</p>
          )}
        </div>

        {/* Collaborators List */}
        {collaborators.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
              Collaborators
            </p>
            <div className="max-h-[200px] overflow-y-auto hide-scrollbar">
              <div className="space-y-2">
                {collaborators.map(collab => {
                  const isCreator = collab.toLowerCase() === trip.creatorId.toLowerCase()
                    || (user.id === trip.creatorId && collab.toLowerCase() === user.email.toLowerCase());
                  const firstLetter = collab.charAt(0).toUpperCase();

                  return (
                    <div key={collab} className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-amber-700 font-bold text-sm">{firstLetter}</span>
                      </div>

                      {/* Email */}
                      <span className="flex-1 text-sm text-slate-700 truncate min-w-0">
                        {collab}
                      </span>

                      {/* Badge or Remove */}
                      {isCreator ? (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold flex-shrink-0">
                          Creator
                        </span>
                      ) : (
                        <button
                          onClick={() => handleRemove(collab)}
                          className="text-xs font-semibold text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
