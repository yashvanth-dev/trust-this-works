import React from 'react';

// A three-lamp signal (red / amber / green) that pulses in sequence,
// standing in for a generic spinner — the AI is "waiting for the green light".
export default function SignalLoader() {
  return (
    <div className="signal-loader" role="status" aria-label="Loading">
      <span />
      <span />
      <span />
    </div>
  );
}
