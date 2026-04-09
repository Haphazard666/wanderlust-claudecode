import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut, getRedirectResult } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  onSnapshot,
  or,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { AnimatePresence } from 'framer-motion';
import { auth, db } from '@/firebase';
import type { User, Trip, TripConfig, ItineraryDay, Expense, TripDocument } from '@/types';
import { generateTripItinerary } from '@/services/geminiService';
import AuthView from '@/components/AuthView';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import TripDetail from '@/components/TripDetail';
import DiscoverView from '@/components/DiscoverView';
import CommunityView from '@/components/CommunityView';
import ProfileView from '@/components/ProfileView';
import CreateTripModal from '@/components/CreateTripModal';
import ShareModal from '@/components/ShareModal';
import ExportTripModal from '@/components/ExportTripModal';
import ImageSelectionModal from '@/components/ImageSelectionModal';
import ChatBot from '@/components/ChatBot';
import CustomDialog from '@/components/CustomDialog';

// ---------------------------------------------------------------------------
// Error handler — wrap every Firestore write in try/catch calling this
// ---------------------------------------------------------------------------
function handleFirestoreError(error: unknown, operation: string, path: string): never {
  const err = error as Error;
  console.error(`Firestore ${operation} failed at ${path}:`, err.message);
  throw new Error(`Failed to ${operation} at ${path}: ${err.message}`);
}

// ---------------------------------------------------------------------------
// Serialization helpers
// ---------------------------------------------------------------------------
interface RawTripDoc {
  id?: string;
  creatorId: string;
  creatorAvatar?: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: Trip['budget'];
  pace: Trip['pace'];
  interests: string[];
  itinerary: string | ItineraryDay[];
  expenses: string | Expense[];
  documents: string | TripDocument[];
  collaborators: string[];
  customInstructions?: string;
  coverImageUrl?: string;
  travelers?: number;
  travelerType?: string;
  summary?: string;
}

function deserializeTrip(id: string, data: RawTripDoc): Trip {
  return {
    ...data,
    id,
    itinerary: typeof data.itinerary === 'string'
      ? (JSON.parse(data.itinerary) as ItineraryDay[])
      : (data.itinerary ?? []),
    expenses: typeof data.expenses === 'string'
      ? (JSON.parse(data.expenses) as Expense[])
      : (data.expenses ?? []),
    documents: typeof data.documents === 'string'
      ? (JSON.parse(data.documents) as TripDocument[])
      : (data.documents ?? []),
  };
}

function serializeTrip(trip: Omit<Trip, 'id'>): Record<string, unknown> {
  return {
    ...trip,
    itinerary: JSON.stringify(trip.itinerary),
    expenses: JSON.stringify(trip.expenses),
    documents: JSON.stringify(trip.documents),
  };
}

// ---------------------------------------------------------------------------
// Dialog state
// ---------------------------------------------------------------------------
interface DialogState {
  isOpen: boolean;
  type: 'alert' | 'confirm';
  title: string;
  message: string;
  onConfirm?: () => void;
}

const DEFAULT_DIALOG: DialogState = {
  isOpen: false,
  type: 'alert',
  title: '',
  message: '',
};

type AppView = 'dashboard' | 'discover' | 'community' | 'settings';

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
function App() {
  const [user, setUser] = useState<User | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(DEFAULT_DIALOG);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Modal visibility
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [shareTrip, setShareTrip] = useState<Trip | null>(null);
  const [exportTrip, setExportTrip] = useState<Trip | null>(null);
  const [imageTrip, setImageTrip] = useState<Trip | null>(null);

  const showAlert = useCallback((title: string, message: string) => {
    setDialog({ isOpen: true, type: 'alert', title, message });
  }, []);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setDialog({ isOpen: true, type: 'confirm', title, message, onConfirm });
  }, []);

  const closeDialog = useCallback(() => {
    setDialog(DEFAULT_DIALOG);
  }, []);

  // -------------------------------------------------------------------------
  // Handle redirect result from Google SSO popup-blocked fallback
  // -------------------------------------------------------------------------
  useEffect(() => {
    getRedirectResult(auth).catch((err) => {
      console.error('[Google redirect result error]', err);
    });
  }, []);

  // -------------------------------------------------------------------------
  // Auth listener — create user doc on first sign-in
  // -------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userPath = `users/${firebaseUser.uid}`;
        const userRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          let userData: User;
          if (userSnap.exists()) {
            userData = userSnap.data() as User;
          } else {
            const nameParts = (firebaseUser.displayName ?? '').split(' ');
            const firstName = nameParts[0] ?? '';
            const lastName = nameParts.slice(1).join(' ');
            userData = {
              id: firebaseUser.uid,
              email: firebaseUser.email ?? '',
              firstName,
              lastName,
              ...(firebaseUser.photoURL ? { avatar: firebaseUser.photoURL } : {}),
              interests: [],
            };
            try {
              await setDoc(userRef, userData);
            } catch (err) {
              handleFirestoreError(err, 'write', userPath);
            }
          }
          setUser(userData);
        } catch (error) {
          console.error('Failed to load user document:', error);
        }
        setAuthLoading(false);
      } else {
        setUser(null);
        setTrips([]);
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // -------------------------------------------------------------------------
  // Real-time trip listener
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!user) return;

    const tripsRef = collection(db, 'trips');
    const q = query(
      tripsRef,
      or(
        where('creatorId', '==', user.id),
        where('collaborators', 'array-contains', user.email),
      ),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: Trip[] = snapshot.docs.map((d) =>
          deserializeTrip(d.id, d.data() as RawTripDoc),
        );
        setTrips(loaded);
        // Keep selectedTrip in sync with Firestore updates
        setSelectedTrip((prev) => {
          if (!prev) return null;
          return loaded.find((t) => t.id === prev.id) ?? null;
        });
      },
      (error) => {
        console.error('Trip listener error:', error.message);
      },
    );

    return () => unsubscribe();
  }, [user]);

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  function handleNavigate(view: string) {
    setSelectedTrip(null);
    setActiveView(view as AppView);
  }

  async function handleLogout() {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }

  // -------------------------------------------------------------------------
  // Trip CRUD
  // -------------------------------------------------------------------------
  async function handleGenerate(config: TripConfig) {
    if (!user) return;
    setIsGenerating(true);
    try {
      const result = await generateTripItinerary({
        destination: config.destination,
        budget: config.budget,
        pace: config.pace,
        interests: config.interests,
        dates: {
          mode: config.dateMode,
          startDate: config.startDate,
          endDate: config.endDate,
          flexibleMonth: config.flexibleMonth,
          flexibleDays: config.flexibleDays,
        },
        customInstructions: config.specialRequests || undefined,
        travelers: config.travelers,
        travelerType: config.travelerType,
      });

      const newTrip: Omit<Trip, 'id'> = {
        creatorId: user.id,
        ...(user.avatar ? { creatorAvatar: user.avatar } : {}),
        name: config.name.trim() || config.destination,
        destination: config.destination,
        startDate: result.startDate,
        endDate: result.endDate,
        budget: config.budget,
        pace: config.pace,
        interests: config.interests,
        itinerary: result.itinerary,
        expenses: [],
        documents: [],
        collaborators: [],
        ...(config.coverImageUrl ? { coverImageUrl: config.coverImageUrl } : {}),
        travelers: config.travelers,
        travelerType: config.travelerType,
        summary: result.summary,
        ...(config.specialRequests ? { customInstructions: config.specialRequests } : {}),
      };

      const docRef = await addDoc(collection(db, 'trips'), serializeTrip(newTrip));
      const createdTrip: Trip = { ...newTrip, id: docRef.id };
      setShowCreateModal(false);
      setSelectedTrip(createdTrip);
    } catch (err) {
      console.error('Trip generation failed:', err);
      showAlert('Generation Failed', 'Could not generate your trip. Please check your connection and try again.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleUpdateTrip(updated: Trip) {
    setSelectedTrip(updated);
    try {
      await updateDoc(doc(db, 'trips', updated.id), serializeTrip(updated));
    } catch (err) {
      console.error('Failed to update trip:', err);
    }
  }

  function handleDeleteTrip(id: string) {
    showConfirm('Delete Trip', 'Are you sure you want to delete this trip? This cannot be undone.', async () => {
      try {
        await deleteDoc(doc(db, 'trips', id));
      } catch (err) {
        console.error('Failed to delete trip:', err);
        showAlert('Delete Failed', 'Could not delete the trip. Please try again.');
      }
    });
  }

  async function handleSaveImage(url: string) {
    if (!imageTrip) return;
    try {
      await updateDoc(doc(db, 'trips', imageTrip.id), { coverImageUrl: url });
      if (selectedTrip?.id === imageTrip.id) {
        setSelectedTrip({ ...selectedTrip, coverImageUrl: url });
      }
    } catch (err) {
      console.error('Failed to save cover image:', err);
      showAlert('Save Failed', 'Could not update the cover image. Please try again.');
    }
    setImageTrip(null);
  }

  // -------------------------------------------------------------------------
  // Loading / auth guards
  // -------------------------------------------------------------------------
  if (authLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#fdfdfc]">
        <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400">
          Initializing Wanderlust AI...
        </p>
      </div>
    );
  }

  if (!user) {
    return <AuthView onLogin={setUser} />;
  }

  // Suppress unused-variable warnings for helpers only used in effects
  void uploadProgress;
  void setUploadProgress;

  return (
    <div className="min-h-screen bg-[#fdfdfc] flex">
      {/* Global upload progress bar */}
      {uploadProgress !== null && (
        <div className="fixed top-0 left-0 right-0 z-[200] h-1 bg-amber-500/20">
          <div
            className="h-1 rounded-full bg-amber-500 transition-all duration-200"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      <Sidebar
        user={user}
        activeView={selectedTrip ? 'dashboard' : activeView}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />

      <main className="flex-1 md:ml-64 pb-20 md:pb-0 min-h-screen">
        <AnimatePresence mode="wait">
          {selectedTrip ? (
            <TripDetail
              key={selectedTrip.id}
              trip={selectedTrip}
              user={user}
              onBack={() => setSelectedTrip(null)}
              onUpdateTrip={handleUpdateTrip}
              onShare={() => setShareTrip(selectedTrip)}
              onExport={() => setExportTrip(selectedTrip)}
            />
          ) : activeView === 'dashboard' ? (
            <Dashboard
              key="dashboard"
              user={user}
              trips={trips}
              onNewTrip={() => setShowCreateModal(true)}
              onSelectTrip={setSelectedTrip}
              onDeleteTrip={handleDeleteTrip}
              onChangeImage={setImageTrip}
            />
          ) : activeView === 'discover' ? (
            <DiscoverView key="discover" onNavigate={handleNavigate} />
          ) : activeView === 'community' ? (
            <CommunityView key="community" onNavigate={handleNavigate} />
          ) : activeView === 'settings' ? (
            <ProfileView
              key="settings"
              user={user}
              onUpdateUser={setUser}
              onLogout={handleLogout}
            />
          ) : null}
        </AnimatePresence>
      </main>

      {/* ChatBot — only visible when viewing a trip */}
      {selectedTrip && (
        <ChatBot trip={selectedTrip} onUpdateTrip={handleUpdateTrip} />
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateTripModal
          onClose={() => setShowCreateModal(false)}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
      )}

      {shareTrip && (
        <ShareModal
          trip={shareTrip}
          user={user}
          onUpdateTrip={(updated) => {
            setShareTrip(updated);
            handleUpdateTrip(updated);
          }}
          onClose={() => setShareTrip(null)}
        />
      )}

      {exportTrip && (
        <ExportTripModal
          trip={exportTrip}
          onClose={() => setExportTrip(null)}
        />
      )}

      {imageTrip && (
        <ImageSelectionModal
          trip={imageTrip}
          onSave={handleSaveImage}
          onClose={() => setImageTrip(null)}
        />
      )}

      <CustomDialog
        isOpen={dialog.isOpen}
        type={dialog.type}
        title={dialog.title}
        message={dialog.message}
        onConfirm={dialog.onConfirm}
        onClose={closeDialog}
      />
    </div>
  );
}

export default App;
