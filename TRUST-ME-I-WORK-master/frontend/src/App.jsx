import React, { useState, useEffect } from 'react';
import StatsPanel from './components/StatsPanel';
import GanttChart from './components/GanttChart';
import TrackDiagram from './components/TrackDiagram';
import PhysicsEngine from './components/PhysicsEngine';
import SignalLoader from './components/SignalLoader';
import { Gauge, Activity, LayoutDashboard } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("React Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="status-screen">
          <h2 style={{ color: 'var(--color-signal-red)' }}>Something went wrong in the render tree.</h2>
          <details style={{ whiteSpace: 'pre-wrap', textAlign: 'left', color: 'var(--text-secondary)', maxWidth: 600 }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('optimized'); // 'optimized' or 'baseline'
  const [showPhysics, setShowPhysics] = useState(false);

  useEffect(() => {
    let isSubscribed = true;

    async function fetchData(retries = 10) {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      try {
        const [optRes, baseRes, compRes] = await Promise.all([
          fetch(`${API_BASE}/schedule/optimized`),
          fetch(`${API_BASE}/schedule/baseline`),
          fetch(`${API_BASE}/compare`)
        ]);

        if (!optRes.ok || !baseRes.ok || !compRes.ok) {
          throw new Error('Failed to fetch data from backend');
        }

        const optimized = await optRes.json();
        const baseline = await baseRes.json();
        const compare = await compRes.json();

        if (isSubscribed) {
          setData({ optimized, baseline, compare });
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        if (retries > 0 && isSubscribed) {
          setError(`Backend not ready yet. Waiting for AI computation to finish... (${retries} retries left)`);
          setTimeout(() => fetchData(retries - 1), 5000);
        } else if (isSubscribed) {
          setError(err.message);
          setLoading(false);
        }
      }
    }
    fetchData();
    return () => { isSubscribed = false; };
  }, []);

  if (loading && !error) {
    return (
      <div className="status-screen">
        <SignalLoader />
        <div>
          <h2 style={{ margin: 0 }}>Computing optimal schedule</h2>
          <p>The CP-SAT solver is optimizing dispatch order across the corridor. This can take up to a minute while it proves the schedule is optimal.</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="status-screen">
        <SignalLoader />
        <div>
          <h2 style={{ margin: 0 }}>Starting up</h2>
          <p style={{ color: 'var(--color-signal-amber)' }}>{error}</p>
          <p>The AI (CP-SAT solver) can take up to a minute to compute and verify the routes before the server opens.</p>
        </div>
      </div>
    );
  }

  const currentSchedule = mode === 'optimized' ? data.optimized : data.baseline;

  return (
    <ErrorBoundary>
      <div className="app-container">
        <header className="app-header">
          <div className="brand">
            <BrandMark />
            <div className="brand-text">
              <h1>Section Control</h1>
              <div className="brand-eyebrow">
                <span>MAS → CBE</span>
                <span>·</span>
                <span>497 KM</span>
                <span>·</span>
                <span>SOUTHERN RAILWAY</span>
                <span>·</span>
                <span>SIH25022</span>
              </div>
            </div>
          </div>

          <div className="header-controls">
            {!showPhysics && (
              <div className="segmented" role="tablist" aria-label="Schedule mode">
                <button
                  role="tab"
                  aria-selected={mode === 'baseline'}
                  className={mode === 'baseline' ? 'active' : ''}
                  onClick={() => setMode('baseline')}
                >
                  FCFS Manual
                </button>
                <button
                  role="tab"
                  aria-selected={mode === 'optimized'}
                  className={mode === 'optimized' ? 'active' : ''}
                  onClick={() => setMode('optimized')}
                >
                  AI Optimized
                </button>
              </div>
            )}
            <button
              className={`btn btn-ghost ${showPhysics ? 'active' : ''}`}
              onClick={() => setShowPhysics(!showPhysics)}
            >
              {showPhysics ? <LayoutDashboard size={15} /> : <Activity size={15} />}
              {showPhysics ? 'Back to dashboard' : 'AI physics & math'}
            </button>
          </div>
        </header>

        {showPhysics ? (
          <PhysicsEngine schedule={currentSchedule} />
        ) : (
          <>
            <StatsPanel currentSchedule={currentSchedule} compare={data.compare} mode={mode} />

            <section className="card">
              <h2><Gauge size={17} color="var(--accent-color)" /> Live Section View</h2>
              <TrackDiagram schedule={currentSchedule} />
            </section>

            <section className="card">
              <h2>Master Train Schedule (Gantt)</h2>
              <GanttChart schedule={currentSchedule} />
            </section>
          </>
        )}

        <footer className="app-footer">
          <span>SIH25022 · Chennai Central (MAS) → Coimbatore Junction (CBE) · CP-SAT constraint optimization</span>
          <span>Data verified against etrain.info, Aug 2026</span>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
