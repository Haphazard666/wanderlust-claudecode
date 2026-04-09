import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createTripChat, generateSpeech } from '../services/geminiService';
import type { Trip, ItineraryDay } from '../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
}

interface ChatBotProps {
  trip: Trip;
  onUpdateTrip: (trip: Trip) => void;
}

const QUICK_CHIPS = [
  'Swap Day 1 and Day 2',
  'Add a coffee shop to Day 1 morning',
  'Find a nice dinner for Day 3',
  'Make Day 2 more relaxed',
  'Any photo spots nearby?',
];

function playPcmBase64(base64: string) {
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

  const samples = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) float32[i] = samples[i] / 32768;

  const ctx = new AudioContext();
  const buffer = ctx.createBuffer(1, float32.length, 24000);
  buffer.copyToChannel(float32, 0);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
}

export default function ChatBot({ trip, onUpdateTrip }: ChatBotProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [toolActive, setToolActive] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);

  const sendMessageRef = useRef<ReturnType<typeof createTripChat> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const handleItineraryUpdate = useCallback(
    (dayNumber: number, updatedDay: ItineraryDay) => {
      setToolActive(true);
      const newItinerary = [...trip.itinerary];
      newItinerary[dayNumber - 1] = updatedDay;
      onUpdateTrip({ ...trip, itinerary: newItinerary });
      setTimeout(() => setToolActive(false), 1500);
    },
    [trip, onUpdateTrip]
  );

  useEffect(() => {
    if (open && !initialized.current) {
      initialized.current = true;
      sendMessageRef.current = createTripChat(trip, handleItineraryUpdate);
    }
  }, [open, trip, handleItineraryUpdate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || !sendMessageRef.current) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        text: text.trim(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setThinking(true);

      let botText = '';
      const botId = crypto.randomUUID();

      try {
        const fullText = await sendMessageRef.current(text.trim(), (chunk) => {
          botText += chunk;
          setMessages((prev) => {
            const existing = prev.find((m) => m.id === botId);
            if (existing) {
              return prev.map((m) => (m.id === botId ? { ...m, text: botText } : m));
            }
            return [...prev, { id: botId, role: 'bot' as const, text: botText }];
          });
          setThinking(false);
        });

        if (voiceOn && fullText) {
          try {
            const audioBase64 = await generateSpeech(fullText);
            playPcmBase64(audioBase64);
          } catch {
            // voice generation failed silently
          }
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: botId, role: 'bot', text: 'Sorry, something went wrong. Please try again.' },
        ]);
        setThinking(false);
      }
    },
    [voiceOn]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <>
      {/* Toggle button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-6 right-6 z-[200] w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-xl transition-colors ${
          open ? 'bg-slate-900' : 'bg-amber-500'
        }`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {open ? (
          <span className="text-white text-2xl font-bold">×</span>
        ) : (
          <span className="relative text-2xl">
            💬
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-teal-400 animate-pulse" />
          </span>
        )}
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            style={{ transformOrigin: 'bottom right' }}
            className="fixed bottom-24 right-6 z-[200] w-[400px] h-[600px] rounded-[3rem] bg-white border border-slate-100 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-slate-900 rounded-t-[3rem] p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-amber-500 text-xl">✨</span>
                <div>
                  <div className="font-black text-white tracking-tight">Wanderlust AI</div>
                  <div className="text-white/50 text-xs">Live Concierge</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setVoiceOn((v) => !v)}
                  className="text-white/60 hover:text-white text-lg transition-colors"
                  title={voiceOn ? 'Mute voice' : 'Enable voice'}
                >
                  {voiceOn ? '🔊' : '🔇'}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="text-white/60 hover:text-white text-lg font-bold transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 bg-slate-50/30 hide-scrollbar space-y-3">
              {messages.length === 0 && !thinking && (
                <div className="text-center text-slate-400 text-sm mt-8">
                  Ask me anything about your trip to {trip.destination}!
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 text-sm whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-amber-500 text-white rounded-[1.5rem] rounded-tr-none'
                        : 'bg-white text-slate-700 border border-slate-100 rounded-[1.5rem] rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {thinking && (
                <div className="flex justify-start">
                  <div className="flex gap-1.5 px-4 py-3 bg-white border border-slate-100 rounded-[1.5rem] rounded-tl-none">
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse [animation-delay:300ms]" />
                  </div>
                </div>
              )}

              {toolActive && (
                <div className="flex justify-start">
                  <div className="px-4 py-2 bg-amber-50 text-amber-700 text-sm font-medium rounded-[1.5rem] border border-amber-200">
                    ⚡ Modifying your adventure...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick chips */}
            <div className="flex gap-2 px-4 py-2 overflow-x-auto hide-scrollbar shrink-0 bg-white border-t border-slate-50">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => send(chip)}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-full hover:bg-amber-100 hover:text-amber-700 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input bar */}
            <div className="bg-white border-t p-4 rounded-b-[3rem] flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your trip..."
                className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || thinking}
                className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold disabled:opacity-40 transition-opacity hover:bg-slate-800"
              >
                ➔
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
