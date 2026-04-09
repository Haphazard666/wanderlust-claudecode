import { useState } from 'react';
import type { Trip } from '../types';
import { generateTripCoverImage } from '../services/geminiService';

interface Props {
  trip: Trip;
  onSave: (url: string) => void;
  onClose: () => void;
}

export default function ImageSelectionModal({ trip, onSave, onClose }: Props) {
  const defaultPrompt = `Cinematic travel photo of ${trip.name} in ${trip.destination}, golden hour, ultra-wide lens, photorealistic`;

  const [urlInput, setUrlInput] = useState(trip.coverImageUrl ?? '');
  const [aiPrompt, setAiPrompt] = useState(defaultPrompt);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  // 'url' | 'ai' — which side is currently selected
  const [selected, setSelected] = useState<'url' | 'ai'>(
    trip.coverImageUrl ? 'url' : 'ai'
  );

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError(null);
    try {
      const dataUrl = await generateTripCoverImage(aiPrompt);
      setGeneratedImage(dataUrl);
      setSelected('ai');
    } catch {
      setGenerateError('Image generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  function handleSave() {
    if (selected === 'url') {
      onSave(urlInput);
    } else if (selected === 'ai' && generatedImage) {
      onSave(generatedImage);
    }
  }

  const canSave =
    (selected === 'url' && urlInput.trim() !== '') ||
    (selected === 'ai' && generatedImage !== null);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-white rounded-[2rem] max-w-2xl w-full p-8 shadow-2xl"
        style={{ animation: 'zoom-in-95 0.15s ease-out' }}
      >
        {/* Header */}
        <h2 className="text-2xl font-black tracking-tight text-slate-900 mb-6">
          Trip Cover Image
        </h2>

        {/* Two-column grid */}
        <div className="grid grid-cols-2 gap-8">
          {/* ── Left: URL ── */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Use a URL
            </p>

            <label className="text-sm font-semibold text-slate-700">
              Enter Custom URL
            </label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setSelected('url');
              }}
              placeholder="https://example.com/image.jpg"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />

            {/* Preview */}
            {urlInput.trim() && (
              <img
                src={urlInput}
                alt="URL preview"
                className="h-32 w-full rounded-xl object-cover border border-slate-100"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            )}

            <button
              onClick={() => setSelected('url')}
              disabled={!urlInput.trim()}
              className="mt-auto w-full bg-slate-800 text-white text-sm font-semibold py-2 rounded-xl hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Use This Image
            </button>
            {selected === 'url' && urlInput.trim() && (
              <p className="text-xs text-center text-amber-600 font-semibold -mt-1">
                ✓ Selected
              </p>
            )}
          </div>

          {/* ── Right: AI ── */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Generate with AI ✨
            </p>

            <label className="text-sm font-semibold text-slate-700">
              Describe the image
            </label>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
            />

            <button
              onClick={handleGenerate}
              disabled={generating || !aiPrompt.trim()}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <span className="w-4 h-4 border-4 border-amber-500/20 border-t-white rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                'Generate'
              )}
            </button>

            {generateError && (
              <p className="text-xs text-red-500">{generateError}</p>
            )}

            {/* Generated preview */}
            {generatedImage && (
              <>
                <img
                  src={generatedImage}
                  alt="AI generated preview"
                  className="h-32 w-full rounded-xl object-cover border border-slate-100"
                />
                <button
                  onClick={() => setSelected('ai')}
                  className="w-full bg-slate-800 text-white text-sm font-semibold py-2 rounded-xl hover:bg-slate-700 transition-colors"
                >
                  Use Generated Image
                </button>
                {selected === 'ai' && (
                  <p className="text-xs text-center text-amber-600 font-semibold -mt-1">
                    ✓ Selected
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
