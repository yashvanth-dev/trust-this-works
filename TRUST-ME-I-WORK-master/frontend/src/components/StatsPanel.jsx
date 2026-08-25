import React from 'react';
import { TrendingDown, Gauge, Clock } from 'lucide-react';
import Legend, { TRAIN_CLASS_COLORS } from './Legend';

function formatTime(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export default function StatsPanel({ currentSchedule, compare, mode }) {
  const improvement = compare.improvement;
  const currentSummary = mode === 'optimized' ? compare.optimized_summary : compare.baseline_summary;

  const trains = [...currentSchedule.trains].sort((a, b) => a.actual_finish - b.actual_finish);

  return (
    <div className="panel">
      <div className="section-heading">
        <h2 style={{ margin: 0 }}>
          Section Performance Summary
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500, marginLeft: '0.5rem' }}>
            {mode === 'optimized' ? '(AI · CP-SAT)' : '(FCFS Baseline)'}
          </span>
        </h2>
        <Legend compact />
      </div>

      {mode === 'optimized' ? (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-card-icon"><TrendingDown size={16} /></div>
            <div className="stat-label">Weighted Delay Reduction</div>
            <div className="stat-value" style={{ color: 'var(--color-signal-green)' }}>
              {improvement.weighted_delay_reduction_pct}%
            </div>
            <div className="stat-sub">↓ {improvement.weighted_delay_reduction} score vs. FCFS</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon"><Gauge size={16} /></div>
            <div className="stat-label">Bottleneck Throughput</div>
            <div className="stat-value" style={{ color: 'var(--accent-color-strong)' }}>
              +{improvement.throughput_increase_pct}%
            </div>
            <div className="stat-sub">↑ {improvement.throughput_increase} trains/hr</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon"><Clock size={16} /></div>
            <div className="stat-label">Solve Time</div>
            <div className="stat-value mono">{currentSummary.solve_time_seconds.toFixed(3)}s</div>
            <div className="stat-sub">Exact optimum, not a heuristic</div>
          </div>
        </div>
      ) : (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'rgba(255,82,82,0.12)', color: 'var(--color-signal-red)' }}>
              <TrendingDown size={16} style={{ transform: 'scaleY(-1)' }} />
            </div>
            <div className="stat-label">Weighted Delay (unoptimized)</div>
            <div className="stat-value" style={{ color: 'var(--color-signal-amber)' }}>
              {Math.round(currentSummary.total_weighted_delay)}
            </div>
            <div className="stat-sub">First-come-first-served dispatch</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon"><Gauge size={16} /></div>
            <div className="stat-label">Bottleneck Throughput</div>
            <div className="stat-value">{currentSummary.throughput_trains_per_hour}</div>
            <div className="stat-sub">trains/hr, no dispatch priority</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon"><Clock size={16} /></div>
            <div className="stat-label">Solve Time</div>
            <div className="stat-value mono">{currentSummary.solve_time_seconds.toFixed(3)}s</div>
            <div className="stat-sub">Rule-based, no optimization</div>
          </div>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Train</th>
            <th>Class</th>
            <th>Dir</th>
            <th>Scheduled Arr</th>
            <th>Actual Arr</th>
            <th>Delay</th>
          </tr>
        </thead>
        <tbody>
          {trains.map(t => {
            let delayClass = 'delay-none';
            if (t.delay > 15) delayClass = 'delay-major';
            else if (t.delay > 0) delayClass = 'delay-minor';

            const classColor = TRAIN_CLASS_COLORS[t.train_class] || 'var(--text-secondary)';

            return (
              <tr key={t.train_id}>
                <td className="mono" style={{ fontWeight: 600 }}>{t.train_id}</td>
                <td>
                  <span className="class-cell">
                    <span className="class-dot" style={{ background: classColor }} />
                    {t.train_class}
                  </span>
                </td>
                <td>{t.direction === 'right' ? 'MAS→CBE' : 'CBE→MAS'}</td>
                <td className="mono">{formatTime(t.scheduled_finish)}</td>
                <td className="mono">{formatTime(t.actual_finish)}</td>
                <td>
                  <span className={`delay-badge ${delayClass}`}>
                    {t.delay === 0 ? 'On Time' : `+${t.delay}m`}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
