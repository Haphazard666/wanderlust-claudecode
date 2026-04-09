import { useState, useRef } from 'react';
import { doc, setDoc, deleteField } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import type { User } from '../types';

interface ProfileViewProps {
  user: User;
  onUpdateUser: (user: User) => void;
  onLogout: () => void;
}

const AGE_GROUPS = ['18-24', '25-34', '35-44', '45-54', '55+'];

const TRAVEL_STYLES = [
  'Budget Explorer',
  'Culture Seeker',
  'Luxury Traveler',
  'Adventure Seeker',
  'Digital Nomad',
];

const ALL_INTERESTS = [
  'Foodies', 'Street Markets', 'Museums', 'Nature', 'Nightlife',
  'Shopping', 'History', 'Beach', 'Hiking', 'Architecture',
  'Photography', 'Food Markets', 'Flea Markets', 'Leisure',
];

export default function ProfileView({ user, onUpdateUser, onLogout }: ProfileViewProps) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [ageGroup, setAgeGroup] = useState(user.ageGroup ?? '');
  const [travelStyle, setTravelStyle] = useState(user.travelStyle ?? '');
  const [interests, setInterests] = useState<string[]>(user.interests ?? []);
  const [bio, setBio] = useState(user.bio ?? '');
  const [avatar, setAvatar] = useState(user.avatar ?? '');
  const [avatarHovered, setAvatarHovered] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleInterest(interest: string) {
    setInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const storageRef = ref(storage, `users/${user.id}/avatar`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setAvatar(url);
    } catch (err) {
      console.error('Avatar upload failed:', err);
      setError('Failed to upload avatar. Please try again.');
    } finally {
      setUploading(false);
      // reset so same file can be re-selected
      e.target.value = '';
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    const updatedUser: User = {
      ...user,
      firstName,
      lastName,
      ...(avatar ? { avatar } : {}),
      ...(ageGroup ? { ageGroup } : {}),
      ...(travelStyle ? { travelStyle } : {}),
      interests,
      ...(bio ? { bio } : {}),
    };
    const firestoreData = {
      ...updatedUser,
      avatar: avatar || deleteField(),
      ageGroup: ageGroup || deleteField(),
      travelStyle: travelStyle || deleteField(),
      bio: bio || deleteField(),
    };
    try {
      await setDoc(doc(db, 'users', user.id), firestoreData);
      onUpdateUser(updatedUser);
    } catch (err) {
      console.error('Failed to save profile:', err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const initials = (firstName.charAt(0) || user.email.charAt(0)).toUpperCase();

  return (
    <div className="min-h-screen bg-[#fdfdfc] py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Account</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-800">Your Profile</h1>
        </div>

        {/* Avatar + Name + Email */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div
              className="relative w-20 h-20 shrink-0 rounded-full cursor-pointer"
              onMouseEnter={() => setAvatarHovered(true)}
              onMouseLeave={() => setAvatarHovered(false)}
              onClick={() => fileInputRef.current?.click()}
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-amber-500 flex items-center justify-center text-white text-2xl font-black select-none">
                  {initials}
                </div>
              )}

              {/* Hover overlay */}
              {(avatarHovered || uploading) && (
                <div className="absolute inset-0 rounded-full bg-slate-900/50 flex items-center justify-center">
                  {uploading ? (
                    <div className="w-6 h-6 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                  ) : (
                    <span className="text-lg">✏️</span>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Name + Email */}
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={user.email}
                  readOnly
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-sm cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Travel Identity */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Travel Identity</p>
            <h2 className="text-xl font-black tracking-tight text-slate-800">Who You Are</h2>
          </div>

          {/* Age Group */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2.5">
              Age Group
            </label>
            <div className="flex flex-wrap gap-2">
              {AGE_GROUPS.map(ag => (
                <button
                  key={ag}
                  onClick={() => setAgeGroup(ag === ageGroup ? '' : ag)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                    ageGroup === ag
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {ag}
                </button>
              ))}
            </div>
          </div>

          {/* Travel Style */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2.5">
              Travel Style
            </label>
            <div className="flex flex-wrap gap-2">
              {TRAVEL_STYLES.map(style => (
                <button
                  key={style}
                  onClick={() => setTravelStyle(style === travelStyle ? '' : style)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                    travelStyle === style
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Interests */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2.5">
              Interests
            </label>
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

          {/* Bio */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2.5">
              Bio
            </label>
            <textarea
              rows={4}
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell us about your travel story..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition resize-y"
            />
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border-2 border-red-200 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-red-400">Danger Zone</p>
          <p className="text-sm text-slate-500">
            Sign out of your account on this device.
          </p>
          <button
            onClick={onLogout}
            className="px-6 py-2.5 rounded-xl bg-white border-2 border-red-500 text-red-500 text-sm font-bold hover:bg-red-50 transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-500 font-medium px-1">{error}</p>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving || uploading}
          className="w-full py-4 rounded-[2rem] bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black tracking-tight text-base transition-colors shadow-md"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </span>
          ) : (
            'Save Profile'
          )}
        </button>

      </div>
    </div>
  );
}
