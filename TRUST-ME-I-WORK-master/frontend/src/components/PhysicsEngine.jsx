import React, { useState, useMemo } from 'react';
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea, ResponsiveContainer
} from 'recharts';
import { Activity, Calculator, TrendingUp, TrendingDown, MapPin , TrainIcon  } from 'lucide-react';

const STATIONS = [
  { code: 'MAS', name: 'Chennai Central', km: 0 },
  { code: 'KPD', name: 'Katpadi', km: 130 },
  { code: 'JTJ', name: 'Jolarpettai', km: 214 },
  { code: 'SA',  name: 'Salem', km: 334 },
  { code: 'ED',  name: 'Erode', km: 396 },
  { code: 'TUP', name: 'Tiruppur', km: 446 },
  { code: 'CBE', name: 'Coimbatore', km: 497 }
];

const DECELERATION_RATE = 0.8; // m/s^2, standard passenger train braking
const ACCELERATION_RATE = 0.5; // m/s^2, typical express/EMU powering rate
const MS_PER_KMH = 1000 / 3600;

const stationFor = (code) => STATIONS.find(s => s.code === code);

const formatTime = (minutes) => {
  if (!Number.isFinite(minutes)) return '--:--';
  const d = Math.floor(minutes / (24 * 60));
  const h = Math.floor((minutes % (24 * 60)) / 60);
  const m = Math.floor(minutes % 60);
  const dayStr = d > 0 ? `+${d}d ` : '';
  return `${dayStr}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// Break a train's segments into an ordered list of "legs": moving legs
// (constant avg speed across one segment, derived from that segment's
// scheduled entry/exit time) and dwell legs (stationary, speed = 0,
// wherever there's a time gap between consecutive segments - whether
// that's a real timetabled halt or a solver-imposed wait for track
// clearance, the underlying JSON doesn't currently distinguish the two).
function buildLegs(train) {
  const legs = [];
  const segs = train.segments;

  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    const [startCode, endCode] = seg.segment_name.split('-');
    const startStn = stationFor(startCode);
    const endStn = stationFor(endCode);
    const durationMins = seg.exit_time - seg.entry_time;
    if (!startStn || !endStn || durationMins <= 0) continue;

    // Segment names are canonical low-km -> high-km (e.g. "TUP-CBE").
    // UP (left) trains physically traverse the segment the other way.
    const fromStn = train.direction === 'left' ? endStn : startStn;
    const toStn = train.direction === 'left' ? startStn : endStn;

    const distanceKm = Math.abs(endStn.km - startStn.km);
    const speedKmh = distanceKm / (durationMins / 60);

    legs.push({
      type: 'move',
      fromStn, toStn,
      entry: seg.entry_time,
      exit: seg.exit_time,
      speedKmh,
    });

    const next = segs[i + 1];
    if (next && next.entry_time > seg.exit_time + 0.01) {
      legs.push({
        type: 'dwell',
        atStn: toStn,
        entry: seg.exit_time,
        exit: next.entry_time,
        speedKmh: 0,
      });
    }
  }
  return legs;
}

// Turn legs into step-chart points, plus braking/accelerating zone shading
// and a list of discrete speed-change events, using v^2 = u^2 +/- 2as.
function buildProfile(train) {
  const legs = buildLegs(train);
  const points = [];
  const zones = [];
  const events = [];
  let maxSpeed = 0;
  let stops = 0;

  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    maxSpeed = Math.max(maxSpeed, leg.speedKmh);
    if (leg.type === 'dwell') stops++;

    const label = leg.type === 'dwell'
      ? `Halt at ${leg.atStn.name}`
      : `${leg.fromStn.name} -> ${leg.toStn.name}`;

    points.push({ t: leg.entry, speed: leg.speedKmh, label });
    points.push({ t: leg.exit, speed: leg.speedKmh, label });

    if (leg.type !== 'move') continue;

    const prevSpeed = i > 0 ? legs[i - 1].speedKmh : 0;
    const nextSpeed = i < legs.length - 1 ? legs[i + 1].speedKmh : 0;
    const v = leg.speedKmh * MS_PER_KMH;
    const legDistM = Math.abs(leg.toStn.km - leg.fromStn.km) * 1000;
    const legDurMin = leg.exit - leg.entry;

    // Accelerating at the start of this leg?
    if (leg.speedKmh > prevSpeed + 1) {
      const vPrev = prevSpeed * MS_PER_KMH;
      const accelDistM = Math.min(legDistM, (v * v - vPrev * vPrev) / (2 * ACCELERATION_RATE));
      const frac = legDistM > 0 ? accelDistM / legDistM : 0;
      const tEnd = leg.entry + frac * legDurMin;
      zones.push({ kind: 'accel', x1: leg.entry, x2: tEnd });
      events.push({
        kind: 'ACCELERATE', time: leg.entry, station: leg.fromStn.name,
        fromKmh: prevSpeed, toKmh: leg.speedKmh, distanceM: accelDistM,
      });
    }

    // Braking at the end of this leg?
    if (leg.speedKmh > nextSpeed + 1) {
      const vNext = nextSpeed * MS_PER_KMH;
      const brakeDistM = Math.min(legDistM, (v * v - vNext * vNext) / (2 * DECELERATION_RATE));
      const frac = legDistM > 0 ? brakeDistM / legDistM : 0;
      const tStart = leg.exit - frac * legDurMin;
      zones.push({ kind: 'brake', x1: tStart, x2: leg.exit });
      events.push({
        kind: nextSpeed === 0 ? 'BRAKE TO HALT' : 'BRAKE', time: tStart, station: leg.toStn.name,
        fromKmh: leg.speedKmh, toKmh: nextSpeed, distanceM: brakeDistM,
      });
    }
  }

  events.sort((a, b) => a.time - b.time);
  return { legs, points, zones, events, maxSpeed, stops };
}

function Stat({ label, value }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div className="mono" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

function LegendSwatch({ color, label }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />
      {label}
    </span>
  );
}

export default function PhysicsEngine({ schedule }) {
  const trains = schedule?.trains || [];
  const [selectedId, setSelectedId] = useState(trains[0]?.train_id || '');

  const selectedTrain = trains.find(t => t.train_id === selectedId) || trains[0];
  const profile = useMemo(() => (selectedTrain ? buildProfile(selectedTrain) : null), [selectedTrain]);

  if (!schedule || trains.length === 0) return null;

  const tMin = selectedTrain.segments[0]?.entry_time ?? 0;
  const tMax = selectedTrain.actual_finish ?? tMin + 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>

      {/* Train selector */}
      <div style={{ background: 'var(--surface-color)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
       
        <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Select train:</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{ background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', minWidth: '260px' }}
        >
          {trains.map(t => (
            <option key={t.train_id} value={t.train_id}>
              {t.train_id} — {t.train_class} ({t.direction === 'left' ? 'UP' : 'DOWN'})
            </option>
          ))}
        </select>

        {profile && (
          <div style={{ display: 'flex', gap: '1.5rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
            <Stat label="Top speed" value={`${profile.maxSpeed.toFixed(0)} km/h`} />
            <Stat label="Stops" value={profile.stops} />
            <Stat label="Braking events" value={profile.events.filter(e => e.kind.includes('BRAKE')).length} />
            <Stat label="Journey" value={`${formatTime(tMin)} -> ${formatTime(tMax)}`} />
          </div>
        )}
      </div>

      {profile && (
        <>
          {/* Speed graph */}
          <div className="card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              
              Speed Profile — {selectedTrain.train_id}
            </h3>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <ComposedChart data={profile.points} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis
                    dataKey="t" type="number" domain={['dataMin', 'dataMax']}
                    tickFormatter={formatTime} stroke="var(--text-secondary)"
                    label={{ value: 'Time of day', position: 'insideBottom', offset: -5, fill: 'var(--text-secondary)' }}
                  />
                  <YAxis
                    stroke="var(--text-secondary)"
                    label={{ value: 'Speed (km/h)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)' }}
                  />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}
                    labelFormatter={formatTime}
                    formatter={(value, name, props) => [`${value.toFixed(0)} km/h`, props.payload.label || '']}
                  />

                  {profile.zones.map((z, i) => (
                    <ReferenceArea
                      key={i}
                      x1={z.x1} x2={z.x2}
                      fill={z.kind === 'brake' ? 'var(--color-signal-red)' : 'var(--color-signal-green)'}
                      fillOpacity={0.18}
                      strokeOpacity={0}
                    />
                  ))}

                  {profile.legs.filter(l => l.type === 'dwell').map((l, i) => (
                    <ReferenceLine key={i} x={l.entry} stroke="var(--text-secondary)" strokeDasharray="3 3"
                      label={{ value: l.atStn.name, position: 'top', fill: 'var(--text-secondary)', fontSize: 11 }} />
                  ))}

                  <Area type="stepAfter" dataKey="speed" stroke="var(--accent-color)" fill="var(--accent-color)" fillOpacity={0.15} strokeWidth={2} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <LegendSwatch color="var(--color-signal-green)" label="Accelerating (a = 0.5 m/s²)" />
              <LegendSwatch color="var(--color-signal-red)" label="Braking (a = 0.8 m/s²)" />
              <span>Dashed lines mark station stops / waits.</span>
            </div>
          </div>

          {/* Event log / math panel */}
          <div className="card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              Speed Change Events 
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.5rem' }}>Time</th>
                    <th style={{ padding: '0.5rem' }}>Near</th>
                    <th style={{ padding: '0.5rem' }}>Action</th>
                    <th style={{ padding: '0.5rem' }}>Speed change</th>
                    <th style={{ padding: '0.5rem' }}>Required distance</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.events.map((e, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)' }}>{formatTime(e.time)}</td>
                      <td style={{ padding: '0.5rem' }}>
                        <MapPin size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                        {e.station}
                      </td>
                      <td style={{ padding: '0.5rem', color: e.kind.includes('BRAKE') ? 'var(--color-signal-red)' : 'var(--color-signal-green)', fontWeight: 'bold' }}>
                        {e.kind.includes('BRAKE')
                          ? <TrendingDown size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                          : <TrendingUp size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />}
                        {e.kind}
                      </td>
                      <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)' }}>{e.fromKmh.toFixed(0)} → {e.toKmh.toFixed(0)} km/h</td>
                      <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)' }}>{e.distanceM.toFixed(0)} m</td>
                    </tr>
                  ))}
                  {profile.events.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Constant speed throughout — no braking or acceleration events.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
