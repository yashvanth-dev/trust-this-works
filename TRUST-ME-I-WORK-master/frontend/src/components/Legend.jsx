import React from 'react';

// Single source of truth for train-class colors, shared by the Gantt chart,
// track diagram, stats table, and physics view so the legend always matches
// what's actually drawn.
export const TRAIN_CLASS_COLORS = {
  'Rajdhani/Vande Bharat': 'var(--color-rajdhani)',
  'Mail/Express': 'var(--color-mail)',
  'Passenger': 'var(--color-passenger)',
  'Freight': 'var(--color-freight)',
};

export default function Legend({ compact = false }) {
  return (
    <div className="legend" style={compact ? { fontSize: '0.75rem' } : undefined}>
      {Object.entries(TRAIN_CLASS_COLORS).map(([label, color]) => (
        <span className="legend-item" key={label} style={{ color }}>
          <span className="legend-dot" style={{ background: color }} />
          <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        </span>
      ))}
    </div>
  );
}
