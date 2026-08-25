import React from 'react';
import Legend, { TRAIN_CLASS_COLORS as COLOR_MAP } from './Legend';

const formatTime = (minutes) => {
    const d = Math.floor(minutes / (24 * 60));
    const h = Math.floor((minutes % (24 * 60)) / 60);
    const m = Math.floor(minutes % 60);
    let dayStr = d > 0 ? `+${d}d ` : '';
    return `${dayStr}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// Compact "HH:MM" only, for axis ticks — the day is called out separately
// with a boundary marker instead of being repeated on every tick.
const formatTick = (minutes) => {
  const h = Math.floor((minutes % (24 * 60)) / 60);
  const m = Math.floor(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// Pick a tick spacing that keeps roughly 10-16 ticks on screen regardless of
// how long the schedule horizon is, so labels never have to fight for room.
function pickTickInterval(horizonMinutes) {
  const hours = horizonMinutes / 60;
  if (hours <= 4) return 30;
  if (hours <= 8) return 60;
  if (hours <= 16) return 120;
  if (hours <= 30) return 180;
  return 240;
}

export default function GanttChart({ schedule }) {
  if (!schedule || !schedule.trains) return null;

  const maxTime = Math.max(
    ...schedule.trains.map(t => t.actual_finish),
    ...schedule.trains.map(t => t.scheduled_finish)
  );
  
  const minTime = Math.min(
    ...schedule.trains.map(t => t.segments[0].entry_time)
  );

  const horizon = Math.max(maxTime - minTime, 1) * 1.05;
  const tickInterval = pickTickInterval(horizon);
  const tickCount = Math.ceil(horizon / tickInterval) + 1;
  const ticks = Array.from({ length: tickCount }, (_, i) => minTime + i * tickInterval);

  // Day-boundary markers (crossing midnight), shown once instead of
  // prefixing "+1d" onto every single tick label.
  const dayBoundaries = [];
  const firstDay = Math.floor(minTime / 1440);
  const lastDay = Math.floor((minTime + horizon) / 1440);
  for (let d = firstDay + 1; d <= lastDay; d++) {
    const t = d * 1440;
    if (t > minTime && t < minTime + horizon) dayBoundaries.push({ t, label: `Day ${d - firstDay + 1}` });
  }

  const timelineMinWidth = Math.max(700, tickCount * 72);
  const sortedTrains = [...schedule.trains].sort((a, b) => a.segments[0].entry_time - b.segments[0].entry_time);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      <Legend />
      <div style={{ position: 'relative', width: '100%', overflowX: 'auto', paddingBottom: '0.5rem' }}>
      <div style={{ minWidth: `${230 + timelineMinWidth}px` }}>
        {/* Header / Time Axis */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }} className="mono">
          <div style={{ width: '150px', flexShrink: 0, fontWeight: 600 }}>Train ID</div>
          <div style={{ width: '80px', flexShrink: 0, fontWeight: 600 }}>Sched Arr</div>
          <div style={{ position: 'relative', flexGrow: 1, minWidth: `${timelineMinWidth}px`, height: '1.2rem' }}>
            {ticks.map((t, i) => (
              <div 
                key={i} 
                style={{ 
                  position: 'absolute', 
                  left: `${((t - minTime) / horizon) * 100}%`,
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap'
                }}
              >
                {formatTick(t)}
              </div>
            ))}
            {dayBoundaries.map((b, i) => (
              <div
                key={`day-${i}`}
                style={{
                  position: 'absolute',
                  left: `${((b.t - minTime) / horizon) * 100}%`,
                  transform: 'translateX(-50%)',
                  top: '-1.1rem',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: 'var(--accent-color-strong)',
                  whiteSpace: 'nowrap'
                }}
              >
                {b.label}
              </div>
            ))}
          </div>
        </div>

        {/* Train Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {sortedTrains.map(train => {
            const color = COLOR_MAP[train.train_class] || 'var(--text-primary)';
            
            return (
              <div key={train.train_id} style={{ display: 'flex', alignItems: 'center', position: 'relative', height: '2.5rem' }}>
                {/* Labels */}
                <div className="mono" style={{ width: '150px', flexShrink: 0, fontSize: '0.8rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{train.train_id}</span>
                </div>
                <div className="mono" style={{ width: '80px', flexShrink: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {formatTime(train.scheduled_finish)}
                </div>

                {/* Timeline */}
                <div style={{ position: 'relative', flexGrow: 1, minWidth: `${timelineMinWidth}px`, height: '100%', backgroundColor: 'var(--surface-color-light)', borderRadius: '0.25rem' }}>
                  
                  {ticks.map((t, i) => (
                    <div 
                      key={i} 
                      style={{ 
                        position: 'absolute', 
                        left: `${((t - minTime) / horizon) * 100}%`,
                        top: 0,
                        bottom: 0,
                        width: '1px',
                        backgroundColor: 'var(--border-color)',
                        opacity: 0.5
                      }}
                    />
                  ))}

                  {dayBoundaries.map((b, i) => (
                    <div
                      key={`dbline-${i}`}
                      style={{
                        position: 'absolute',
                        left: `${((b.t - minTime) / horizon) * 100}%`,
                        top: 0,
                        bottom: 0,
                        width: '1px',
                        backgroundColor: 'var(--accent-color)',
                        opacity: 0.35
                      }}
                    />
                  ))}

                  <div 
                    title={`Ideal Finish: ${formatTime(train.scheduled_finish)}`}
                    style={{
                      position: 'absolute',
                      left: `${((train.scheduled_finish - minTime) / horizon) * 100}%`,
                      top: '-4px',
                      bottom: '-4px',
                      width: '2px',
                      backgroundColor: 'var(--text-secondary)',
                      borderLeft: '1px dashed rgba(255,255,255,0.3)',
                      zIndex: 1
                    }}
                  />

                  {train.segments.map((seg, idx) => {
                    const startPct = ((seg.entry_time - minTime) / horizon) * 100;
                    const widthPct = ((seg.exit_time - seg.entry_time) / horizon) * 100;
                    
                    return (
                      <div
                        key={idx}
                        title={`${seg.segment_name}: ${formatTime(seg.entry_time)} - ${formatTime(seg.exit_time)}`}
                        style={{
                          position: 'absolute',
                          left: `${startPct}%`,
                          width: `${widthPct}%`,
                          top: '20%',
                          height: '60%',
                          backgroundColor: color,
                          opacity: 0.8,
                          borderRadius: '0.125rem',
                          border: '1px solid rgba(0,0,0,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          fontSize: '0.65rem',
                          color: '#fff',
                          fontWeight: 600,
                          cursor: 'default',
                          transition: 'all 0.2s',
                          zIndex: 2
                        }}
                      >
                        {widthPct > 3 ? seg.segment_name : ''}
                      </div>
                    );
                  })}
                  
                  {train.actual_finish > train.scheduled_finish && (
                    <div 
                      title={`Delay: ${train.delay}m`}
                      style={{
                        position: 'absolute',
                        left: `${((train.scheduled_finish - minTime) / horizon) * 100}%`,
                        width: `${((train.actual_finish - train.scheduled_finish) / horizon) * 100}%`,
                        top: '50%',
                        height: '2px',
                        backgroundColor: 'var(--color-signal-red)',
                        opacity: 1,
                        zIndex: 0
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
}
