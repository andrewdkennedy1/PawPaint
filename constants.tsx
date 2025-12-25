
export const COLORS = [
  '#f472b6', // Pink
  '#f87171', // Soft Red
  '#fb923c', // Orange
  '#fbbf24', // Yellow
  '#4ade80', // Green
  '#2dd4bf', // Teal
  '#60a5fa', // Blue
  '#818cf8', // Indigo
  '#a78bfa', // Purple
  '#4b5563', // Grey-Black
  '#ffffff', // White
];

export const COLOR_THEMES = [
  { id: 'default', name: 'Classic', colors: COLORS },
  {
    id: 'ocean',
    name: 'Ocean',
    colors: ['#0ea5e9', '#38bdf8', '#22d3ee', '#14b8a6', '#0f766e', '#1e3a8a', '#0ea5e9', '#e0f2fe'],
  },
  {
    id: 'sunset',
    name: 'Sunset',
    colors: ['#f97316', '#fb7185', '#f472b6', '#fbbf24', '#f59e0b', '#ef4444', '#fde68a', '#a855f7'],
  },
  {
    id: 'pastel',
    name: 'Pastel',
    colors: ['#fecdd3', '#fde68a', '#bbf7d0', '#bae6fd', '#ddd6fe', '#fbcfe8', '#fef9c3', '#e2e8f0'],
  },
  {
    id: 'neon',
    name: 'Neon',
    colors: ['#22c55e', '#a3e635', '#facc15', '#f97316', '#ef4444', '#ec4899', '#a855f7', '#38bdf8'],
  },
  {
    id: 'halloween',
    name: 'Halloween',
    colors: ['#f97316', '#ea580c', '#f59e0b', '#111827', '#9a3412', '#7c2d12', '#fde68a', '#1f2937'],
  },
  {
    id: 'xmas',
    name: 'Xmas',
    colors: ['#dc2626', '#b91c1c', '#16a34a', '#14532d', '#fef2f2', '#fca5a5', '#86efac', '#fef3c7'],
  },
];

export const BRUSH_SIZES = [8, 16, 32, 64];
