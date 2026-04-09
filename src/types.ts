export type TravelPace = 'relaxed' | 'moderate' | 'packed' | 'immersive' | 'spontaneous';
export type BudgetLevel = 'economy' | 'standard' | 'luxury';

export interface Coordinates { lat: number; lng: number; }

export interface ItineraryItem {
  id: string;
  time: string;
  title: string;
  description: string;
  location: string;
  coordinates: Coordinates;
  category: 'activity' | 'accommodation' | 'transport' | 'dining' | 'market' | 'leisure';
  costEstimate?: number;
  isAiGenerated?: boolean;
}

export interface ItineraryDay {
  day: number;
  date: string;
  items: ItineraryItem[];
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  payerId: string;
}

export interface TripDocument {
  id: string;
  name: string;
  url: string;
  type: string;
}

export interface Trip {
  id: string;
  creatorId: string;
  creatorAvatar?: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: BudgetLevel;
  pace: TravelPace;
  interests: string[];
  itinerary: ItineraryDay[];
  expenses: Expense[];
  collaborators: string[];
  documents: TripDocument[];
  customInstructions?: string;
  coverImageUrl?: string;
  travelers?: number;
  travelerType?: string;
  summary?: string;
}

export interface TripConfig {
  name: string;
  destination: string;
  dateMode: 'specific' | 'flexible';
  startDate: string;
  endDate: string;
  flexibleMonth: number;
  flexibleDays: number;
  travelers: number;
  travelerType: string;
  coverImageUrl: string;
  pace: TravelPace;
  budget: BudgetLevel;
  interests: string[];
  specialRequests: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  ageGroup?: string;
  interests: string[];
  travelStyle?: string;
  bio?: string;
}
