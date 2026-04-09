import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth } from '@/firebase';
import type { User } from '@/types';

interface AuthViewProps {
  onLogin: (user: User) => void;
}

function parseFirebaseError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed. Please try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export default function AuthView({ onLogin }: AuthViewProps) {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  function buildUser(
    uid: string,
    rawEmail: string | null,
    displayName: string | null,
    photoURL: string | null,
  ): User {
    const parts = (displayName ?? '').trim().split(' ');
    const firstName = parts[0] ?? '';
    const lastName = parts.slice(1).join(' ');
    return {
      id: uid,
      email: rawEmail ?? '',
      firstName,
      lastName,
      avatar: photoURL ?? undefined,
      interests: [],
    };
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cred =
        tab === 'signup'
          ? await createUserWithEmailAndPassword(auth, email, password)
          : await signInWithEmailAndPassword(auth, email, password);
      onLogin(buildUser(cred.user.uid, cred.user.email, cred.user.displayName, cred.user.photoURL));
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      setError(parseFirebaseError(code));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      onLogin(buildUser(cred.user.uid, cred.user.email, cred.user.displayName, cred.user.photoURL));
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      setError(parseFirebaseError(code));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900 overflow-hidden">
      {/* Decorative blobs */}
      <div
        className="pointer-events-none absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full opacity-30 blur-3xl"
        style={{
          background: 'radial-gradient(circle, #f59e0b, transparent 70%)',
          animation: 'blob1 14s ease-in-out infinite',
        }}
      />
      <div
        className="pointer-events-none absolute top-1/2 -right-40 w-[420px] h-[420px] rounded-full opacity-25 blur-3xl"
        style={{
          background: 'radial-gradient(circle, #7c3aed, transparent 70%)',
          animation: 'blob2 18s ease-in-out infinite',
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 left-1/4 w-[360px] h-[360px] rounded-full opacity-20 blur-3xl"
        style={{
          background: 'radial-gradient(circle, #f59e0b, transparent 70%)',
          animation: 'blob3 22s ease-in-out infinite',
        }}
      />
      <div
        className="pointer-events-none absolute top-10 right-1/3 w-[300px] h-[300px] rounded-full opacity-15 blur-3xl"
        style={{
          background: 'radial-gradient(circle, #8b5cf6, transparent 70%)',
          animation: 'blob4 16s ease-in-out infinite',
        }}
      />

      <style>{`
        @keyframes blob1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, 60px) scale(1.08); }
          66% { transform: translate(-30px, 30px) scale(0.94); }
        }
        @keyframes blob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-50px, -40px) scale(1.06); }
          66% { transform: translate(20px, 50px) scale(0.96); }
        }
        @keyframes blob3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(60px, -50px) scale(1.1); }
        }
        @keyframes blob4 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          40% { transform: translate(-40px, 60px) scale(1.05); }
          80% { transform: translate(30px, -30px) scale(0.95); }
        }
      `}</style>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-[2.5rem] p-10 shadow-2xl">
        {/* Logo */}
        <div className="flex flex-col items-center gap-1 mb-2">
          <span className="text-5xl">✈️</span>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Wanderlust</h1>
          <p className="text-sm text-slate-400 mt-1">Your AI-Powered Travel Concierge</p>
        </div>

        {/* Tab switcher */}
        <div className="flex mt-8 mb-6 border-b border-slate-100">
          {(['signin', 'signup'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 pb-3 text-sm font-black uppercase tracking-widest transition-colors ${
                tab === t
                  ? 'text-amber-500 border-b-2 border-amber-500 -mb-px'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {t === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition"
          />

          {error && (
            <p className="text-xs font-bold text-red-500 text-center -mb-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="mt-1 w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-white font-black rounded-2xl py-3.5 text-sm tracking-wide transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                {tab === 'signin' ? 'Signing in…' : 'Creating account…'}
              </>
            ) : (
              tab === 'signin' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            or continue with
          </span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={loading || googleLoading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-60 text-slate-700 font-black rounded-2xl py-3.5 text-sm tracking-wide transition-colors shadow-sm"
        >
          {googleLoading ? (
            <span className="w-4 h-4 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
          )}
          Continue with Google
        </button>
      </div>
    </div>
  );
}
