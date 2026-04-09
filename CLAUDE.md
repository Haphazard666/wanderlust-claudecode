# Wanderlust – Smart Travel Planner

## Stack
React 18 + TypeScript + Vite + Tailwind CSS + Firebase + Gemini AI (@google/generative-ai)

## Windows environment
- Shell: PowerShell (not CMD, not bash)
- Commands: never chain with &&, use separate lines
- File paths use backslashes: src\components\, src\services\
- Line endings: LF (configure .gitattributes if needed)

## Design System (apply everywhere, no exceptions)
- Background: #fdfdfc
- Primary accent: amber-500 (#f59e0b)
- Border radius: rounded-[2rem] on cards, rounded-[2.5rem] on modals
- Headings: font-black tracking-tight
- Labels: text-xs font-bold uppercase tracking-widest text-slate-400
- Spinner: border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin
- Modals: fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm + white card zoom-in-95

## Coding Rules
- TypeScript strict mode — no `any` types ever
- All shared types live in src/types.ts, exported individually
- All Gemini AI calls go through src/services/geminiService.ts
- Firebase config lives in src/firebase.ts
- No window.alert() or window.confirm() — use CustomDialog component
- All Firestore writes wrapped in try/catch with handleFirestoreError()
- Itinerary, expenses, documents stored in Firestore as JSON.stringify()

## Key Files
- src/types.ts — all TypeScript interfaces
- src/firebase.ts — Firebase init
- src/services/geminiService.ts — all AI functions
- src/App.tsx — root state, auth, routing, Firestore listeners
- src/components\ — one file per component

## Environment Variables
Access via import.meta.env.VITE_* (Vite convention, not process.env)