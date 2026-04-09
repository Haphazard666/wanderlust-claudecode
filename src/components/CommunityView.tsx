import { motion } from 'framer-motion';

interface CommunityViewProps {
  onNavigate: (view: string) => void;
}

export default function CommunityView({ onNavigate }: CommunityViewProps) {
  return (
    <motion.div
      className="min-h-screen bg-[#fdfdfc] flex flex-col items-center justify-center text-center px-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-7xl mb-6 select-none">👥</div>
      <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-3">
        Community Hub
      </h1>
      <p className="text-slate-400 mb-10 max-w-sm text-base">
        Coming soon — explore trips from the community
      </p>
      <button
        onClick={() => onNavigate('dashboard')}
        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors active:scale-95"
      >
        ← Back Home
      </button>
    </motion.div>
  );
}
