import { useState } from 'react';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Trip } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const L = (window as any).L;

const DAY_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const CATEGORY_EMOJI: Record<string, string> = {
  activity: '🎯',
  accommodation: '🏨',
  transport: '🚂',
  dining: '🍽️',
  market: '🛍️',
  leisure: '🌿',
};

// A4 @ 96 dpi: 794 × 1123 px → 210 × 297 mm
const PAGE_W_PX = 794;
const PAGE_H_PX = Math.round(PAGE_W_PX * (297 / 210)); // ≈ 1123
const CAPTURE_SCALE = 2;
const PDF_W_MM = 210;

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function fmtCurrency(amount: number, currency: string): string {
  const curr = currency.toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(amount);
  } catch {
    return `${curr} ${amount.toFixed(2)}`;
  }
}

/** Typed helper: create DOM element with inline styles + attrs. */
function mkEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  styles: Record<string, string> = {},
  attrs: Record<string, string> = {},
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  Object.entries(styles).forEach(([k, v]) => {
    (e.style as unknown as Record<string, string>)[k] = v;
  });
  Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
  return e;
}

function offscreenWrapper(): HTMLDivElement {
  return mkEl('div', {
    position: 'absolute',
    left: '-9999px',
    top: '0',
    width: `${PAGE_W_PX}px`,
    background: '#fdfdfc',
    padding: '40px',
    boxSizing: 'border-box',
    fontFamily: 'system-ui,-apple-system,BlinkMacSystemFont,sans-serif',
  });
}

interface ExportTripModalProps {
  trip: Trip;
  onClose: () => void;
}

export default function ExportTripModal({ trip, onClose }: ExportTripModalProps) {
  const [options, setOptions] = useState({
    summary: true,
    itinerary: true,
    expenses: true,
    map: true,
  });
  const [exporting, setExporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  function toggleOption(key: keyof typeof options) {
    if (!exporting) setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  }

  // ── Section builders ─────────────────────────────────────────────────────────

  function buildSummarySection(): HTMLElement {
    const wrap = offscreenWrapper();

    // Wanderlust brand line
    const brand = mkEl('div', { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' });
    const icon = mkEl('span', { fontSize: '20px' });
    icon.textContent = '✈️';
    const name = mkEl('span', { fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' });
    name.textContent = 'Wanderlust';
    brand.append(icon, name);
    wrap.appendChild(brand);

    // Title
    const h1 = mkEl('h1', { fontSize: '34px', fontWeight: '900', color: '#1e293b', margin: '0 0 6px', lineHeight: '1.1' });
    h1.textContent = trip.name;
    wrap.appendChild(h1);

    const dest = mkEl('p', { fontSize: '18px', color: '#64748b', margin: '0 0 28px' });
    dest.textContent = `📍 ${trip.destination}`;
    wrap.appendChild(dest);

    const hr = mkEl('hr', { border: 'none', borderTop: '2px solid #f1f5f9', margin: '0 0 24px' });
    wrap.appendChild(hr);

    // Details grid
    const grid = mkEl('div', { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '24px' });
    const details: [string, string, string][] = [
      ['📅', 'DATES', `${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}`],
      ['👥', 'TRAVELERS', trip.travelers ? `${trip.travelers}${trip.travelerType ? ` · ${trip.travelerType}` : ''}` : '—'],
      ['⚡', 'PACE', trip.pace ? trip.pace.charAt(0).toUpperCase() + trip.pace.slice(1) : '—'],
      ['💰', 'BUDGET', trip.budget ? trip.budget.charAt(0).toUpperCase() + trip.budget.slice(1) : '—'],
    ];
    details.forEach(([emoji, label, value]) => {
      const card = mkEl('div', { background: '#f8fafc', borderRadius: '12px', padding: '14px 16px' });
      const lbl = mkEl('div', { fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: '4px' });
      lbl.textContent = `${emoji} ${label}`;
      const val = mkEl('div', { fontSize: '14px', fontWeight: '700', color: '#1e293b' });
      val.textContent = value;
      card.append(lbl, val);
      grid.appendChild(card);
    });
    wrap.appendChild(grid);

    // Interests
    if (trip.interests.length > 0) {
      const intLabel = mkEl('div', { fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: '10px' });
      intLabel.textContent = '🎨 INTERESTS';
      wrap.appendChild(intLabel);
      const tags = mkEl('div', { display: 'flex', flexWrap: 'wrap', gap: '8px' });
      trip.interests.forEach(interest => {
        const tag = mkEl('span', { background: '#fef3c7', color: '#92400e', borderRadius: '999px', padding: '4px 12px', fontSize: '12px', fontWeight: '600' });
        tag.textContent = interest;
        tags.appendChild(tag);
      });
      wrap.appendChild(tags);
    }

    return wrap;
  }

  function buildItinerarySection(): HTMLElement {
    const wrap = offscreenWrapper();

    const h2 = mkEl('h2', { fontSize: '26px', fontWeight: '900', color: '#1e293b', margin: '0 0 24px' });
    h2.textContent = '🗓️ Full Itinerary';
    wrap.appendChild(h2);

    trip.itinerary.forEach((day, dayIdx) => {
      const color = DAY_COLORS[dayIdx % DAY_COLORS.length];

      // Day header bar
      const dayBar = mkEl('div', { background: color, color: '#fff', borderRadius: '12px', padding: '10px 16px', marginBottom: '12px' });
      const dayTitle = mkEl('span', { fontSize: '14px', fontWeight: '900', letterSpacing: '0.02em' });
      dayTitle.textContent = `Day ${day.day}  ·  ${formatDate(day.date)}`;
      dayBar.appendChild(dayTitle);
      wrap.appendChild(dayBar);

      // Items
      day.items.forEach((item, idx) => {
        const isLast = idx === day.items.length - 1;
        const row = mkEl('div', {
          borderLeft: `3px solid ${color}`,
          paddingLeft: '14px',
          paddingBottom: isLast ? '20px' : '14px',
          marginLeft: '8px',
        });

        // Time · category
        const meta = mkEl('div', { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' });
        const timeEl = mkEl('span', { fontSize: '11px', fontWeight: '700', color: '#94a3b8' });
        timeEl.textContent = item.time;
        const catEl = mkEl('span', { fontSize: '11px', fontWeight: '600', color });
        catEl.textContent = `${CATEGORY_EMOJI[item.category] ?? '📌'} ${item.category}`;
        meta.append(timeEl, catEl);
        row.appendChild(meta);

        const title = mkEl('div', { fontSize: '15px', fontWeight: '800', color: '#1e293b', marginBottom: '3px' });
        title.textContent = item.title;
        row.appendChild(title);

        if (item.location) {
          const loc = mkEl('div', { fontSize: '12px', color: '#64748b', marginBottom: '4px' });
          loc.textContent = `📍 ${item.location}`;
          row.appendChild(loc);
        }

        if (item.description) {
          const desc = mkEl('div', { fontSize: '12px', color: '#475569', lineHeight: '1.55', marginBottom: '4px' });
          desc.textContent = item.description;
          row.appendChild(desc);
        }

        if (item.costEstimate != null && item.costEstimate > 0) {
          const cost = mkEl('div', { fontSize: '12px', fontWeight: '700', color: '#059669' });
          cost.textContent = `Est. $${item.costEstimate}`;
          row.appendChild(cost);
        }

        wrap.appendChild(row);
      });
    });

    return wrap;
  }

  function buildExpensesSection(): HTMLElement {
    const wrap = offscreenWrapper();

    const h2 = mkEl('h2', { fontSize: '26px', fontWeight: '900', color: '#1e293b', margin: '0 0 24px' });
    h2.textContent = '💳 Expense Report';
    wrap.appendChild(h2);

    if (trip.expenses.length === 0) {
      const empty = mkEl('p', { color: '#94a3b8', fontSize: '14px' });
      empty.textContent = 'No expenses recorded.';
      wrap.appendChild(empty);
      return wrap;
    }

    const table = mkEl('table', { width: '100%', borderCollapse: 'collapse', fontSize: '13px' });

    // thead
    const thead = document.createElement('thead');
    const hRow = document.createElement('tr');
    ['Date', 'Title', 'Category', 'Amount'].forEach((col, ci) => {
      const th = mkEl('th', {
        padding: '10px 12px',
        textAlign: ci === 3 ? 'right' : 'left',
        fontWeight: '700',
        textTransform: 'uppercase',
        fontSize: '10px',
        letterSpacing: '0.07em',
        color: '#94a3b8',
        borderBottom: '2px solid #e2e8f0',
        background: '#f8fafc',
      });
      th.textContent = col;
      hRow.appendChild(th);
    });
    thead.appendChild(hRow);
    table.appendChild(thead);

    // tbody
    const tbody = document.createElement('tbody');
    let total = 0;
    const primaryCurrency = trip.expenses[0]?.currency ?? 'USD';

    trip.expenses.forEach((exp, idx) => {
      const tr = mkEl('tr', { background: idx % 2 === 0 ? '#fff' : '#f8fafc' });
      [formatDate(exp.date), exp.title, exp.category, fmtCurrency(exp.amount, exp.currency)].forEach((cell, ci) => {
        const td = mkEl('td', {
          padding: '10px 12px',
          color: '#1e293b',
          textAlign: ci === 3 ? 'right' : 'left',
          borderBottom: '1px solid #f1f5f9',
        });
        td.textContent = cell;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
      total += exp.amount;
    });
    table.appendChild(tbody);
    wrap.appendChild(table);

    // Total row
    const totalRow = mkEl('div', {
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: '24px',
      marginTop: '16px',
      padding: '12px 16px',
      background: '#fef3c7',
      borderRadius: '10px',
    });
    const totalLabel = mkEl('span', { fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#92400e' });
    totalLabel.textContent = 'TOTAL';
    const totalVal = mkEl('span', { fontSize: '18px', fontWeight: '900', color: '#92400e' });
    totalVal.textContent = fmtCurrency(total, primaryCurrency);
    totalRow.append(totalLabel, totalVal);
    wrap.appendChild(totalRow);

    return wrap;
  }

  function buildMapSection(): Promise<HTMLElement> {
    return new Promise(resolve => {
      const wrap = offscreenWrapper();

      const h2 = mkEl('h2', { fontSize: '26px', fontWeight: '900', color: '#1e293b', margin: '0 0 20px' });
      h2.textContent = '🗺️ Map Snapshot';
      wrap.appendChild(h2);

      const mapDiv = mkEl('div', { width: '714px', height: '420px', borderRadius: '16px', overflow: 'hidden' });
      wrap.appendChild(mapDiv);
      document.body.appendChild(wrap);

      const map = L.map(mapDiv, { zoomControl: true }).setView([0, 0], 2);

      const tileLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        { attribution: '© CARTO', maxZoom: 19, crossOrigin: true },
      );
      tileLayer.addTo(map);

      const allCoords: [number, number][] = [];
      trip.itinerary.forEach((day, dayIdx) => {
        const color = DAY_COLORS[dayIdx % DAY_COLORS.length];
        const dayCoords: [number, number][] = [];

        day.items.forEach((item, itemIdx) => {
          if (!item.coordinates || (item.coordinates.lat === 0 && item.coordinates.lng === 0)) return;
          const pos: [number, number] = [item.coordinates.lat, item.coordinates.lng];
          allCoords.push(pos);
          dayCoords.push(pos);

          const icon = L.divIcon({
            className: '',
            html: `<div style="background:${color};color:#fff;font-weight:700;font-size:11px;width:36px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,.25);border:2px solid #fff;">${day.day}.${itemIdx + 1}</div>`,
            iconSize: [36, 28],
            iconAnchor: [18, 14],
          });
          L.marker(pos, { icon }).addTo(map);
        });

        if (dayCoords.length >= 2) {
          L.polyline(dayCoords, { color, weight: 3, opacity: 0.6 }).addTo(map);
        }
      });

      if (allCoords.length > 0) {
        map.fitBounds(L.latLngBounds(allCoords), { padding: [40, 40] });
      }

      // Resolve 600 ms after last tile settles, or after 7 s absolute fallback
      let tileTimeout: ReturnType<typeof setTimeout>;
      let resolved = false;
      const finish = () => {
        if (resolved) return;
        resolved = true;
        map.remove();
        resolve(wrap);
      };
      const resetTimer = () => {
        clearTimeout(tileTimeout);
        tileTimeout = setTimeout(finish, 600);
      };
      tileLayer.on('tileload', resetTimer);
      tileLayer.on('tileerror', resetTimer);
      resetTimer();
      setTimeout(finish, 7000);
    });
  }

  // ── PDF assembly helpers ──────────────────────────────────────────────────────

  async function captureSection(sectionEl: HTMLElement): Promise<HTMLCanvasElement> {
    return html2canvas(sectionEl, {
      scale: CAPTURE_SCALE,
      useCORS: true,
      backgroundColor: '#fdfdfc',
      logging: false,
    });
  }

  async function addCanvasToPDF(
    pdf: jsPDF,
    canvas: HTMLCanvasElement,
    addPageBefore: boolean,
  ): Promise<void> {
    const canvasPageH = PAGE_H_PX * CAPTURE_SCALE;
    const pxToMm = PDF_W_MM / canvas.width;
    let yOffset = 0;
    let firstChunk = true;

    while (yOffset < canvas.height) {
      if (!firstChunk || addPageBefore) pdf.addPage();
      firstChunk = false;

      const sliceH = Math.min(canvasPageH, canvas.height - yOffset);
      const tmp = document.createElement('canvas');
      tmp.width = canvas.width;
      tmp.height = sliceH;
      const ctx = tmp.getContext('2d');
      if (!ctx) { yOffset += canvasPageH; continue; }
      ctx.drawImage(canvas, 0, -yOffset);

      pdf.addImage(tmp.toDataURL('image/png'), 'PNG', 0, 0, PDF_W_MM, sliceH * pxToMm);
      yOffset += canvasPageH;
    }
  }

  // ── Main export handler ───────────────────────────────────────────────────────

  async function handleExport() {
    setExporting(true);
    setStatusMsg('Rendering content...');

    const cleanup: HTMLElement[] = [];

    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      let addPageBefore = false;

      // Summary
      if (options.summary) {
        const s = buildSummarySection();
        document.body.appendChild(s);
        cleanup.push(s);
        const canvas = await captureSection(s);
        await addCanvasToPDF(pdf, canvas, addPageBefore);
        addPageBefore = true;
      }

      // Itinerary
      if (options.itinerary) {
        const s = buildItinerarySection();
        document.body.appendChild(s);
        cleanup.push(s);
        const canvas = await captureSection(s);
        await addCanvasToPDF(pdf, canvas, addPageBefore);
        addPageBefore = true;
      }

      // Expenses
      if (options.expenses) {
        const s = buildExpensesSection();
        document.body.appendChild(s);
        cleanup.push(s);
        const canvas = await captureSection(s);
        await addCanvasToPDF(pdf, canvas, addPageBefore);
        addPageBefore = true;
      }

      // Map
      if (options.map) {
        const hasCoords = trip.itinerary.some(d =>
          d.items.some(i => i.coordinates && !(i.coordinates.lat === 0 && i.coordinates.lng === 0)),
        );
        if (hasCoords) {
          setStatusMsg('Rendering map...');
          const s = await buildMapSection();
          cleanup.push(s);
          const canvas = await captureSection(s);
          await addCanvasToPDF(pdf, canvas, addPageBefore);
          addPageBefore = true;
        }
      }

      setStatusMsg('Paginating pages...');
      await new Promise(r => setTimeout(r, 350));

      setStatusMsg('Finalising PDF...');
      await new Promise(r => setTimeout(r, 350));

      if (addPageBefore) {
        pdf.save(`wanderlust-${slugify(trip.name)}-${slugify(trip.destination)}.pdf`);
      }
    } finally {
      cleanup.forEach(node => node.parentNode?.removeChild(node));
      setExporting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const checkboxes: { key: keyof typeof options; label: string; icon: string }[] = [
    { key: 'summary', label: 'Trip Summary', icon: '📋' },
    { key: 'itinerary', label: 'Full Itinerary', icon: '🗓️' },
    { key: 'expenses', label: 'Expense Report', icon: '💳' },
    { key: 'map', label: 'Map Snapshot', icon: '🗺️' },
  ];

  const noneSelected = Object.values(options).every(v => !v);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget && !exporting) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="bg-white rounded-[2.5rem] p-8 shadow-2xl w-full max-w-md mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Export Trip</h2>
          <button
            onClick={onClose}
            disabled={exporting}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        {/* Options panel */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 mb-6 space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Include Sections</p>

          {checkboxes.map(({ key, label, icon }) => (
            <label
              key={key}
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => toggleOption(key)}
            >
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all
                  ${options[key] ? 'bg-amber-500 border-amber-500' : 'border-slate-300 bg-white'}`}
              >
                {options[key] && (
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors select-none">
                {icon} {label}
              </span>
            </label>
          ))}
        </div>

        {/* Status message */}
        {exporting && (
          <div className="flex items-center gap-3 mb-5 px-1">
            <div className="w-5 h-5 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin flex-shrink-0" />
            <span className="text-sm font-semibold text-slate-600">{statusMsg}</span>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleExport}
          disabled={exporting || noneSelected}
          className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-base rounded-2xl transition-colors shadow-sm"
        >
          {exporting ? 'Generating…' : 'Generate PDF'}
        </button>
      </motion.div>
    </div>
  );
}
