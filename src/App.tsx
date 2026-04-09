import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import type { User, Trip, TripConfig } from '@/types';
import AuthView from '@/components/AuthView';
import CreateTripModal from '@/components/CreateTripModal';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [showModal, setShowModal] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  async function handleGenerate(config: TripConfig) {
    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 6000));
    console.log('TripConfig:', config);
    setIsGenerating(false);
    setShowModal(false);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
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
            await setDoc(userRef, userData);
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
    return <AuthView onLogin={handleLogin} />;
  }

  // trips will be consumed by the main app shell once it's built
  void trips;

  return (
    <div className="min-h-screen bg-[#fdfdfc] flex items-center justify-center">
      <button
        onClick={() => setShowModal(true)}
        className="px-6 py-3 bg-amber-500 text-white font-black rounded-2xl"
      >
        Open Modal
      </button>
      {showModal && (
        <CreateTripModal
          onClose={() => setShowModal(false)}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
      )}
    </div>
  );
}

export default App;
