// Almost no chrome. The zone name top-left, a crosshair dot in first person,
// your held item bottom-right, and a paper card only while the connection is
// not yet up. Nothing here asks the player anything.

import { useEffect, useState } from 'react';
import { APPLE_ITEM, useWorld } from './store';

function AppleIcon() {
  return (
    <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">
      <path d="M20 12 c-1 -4 1 -7 4 -8" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="25" cy="9" rx="5" ry="2.6" fill="#4be36b" stroke="#111" strokeWidth="2.5" transform="rotate(-25 25 9)" />
      <path
        d="M12 13 c6 -4 10 0 8 0 c-2 0 2 -4 8 0 c7 5 6 20 -2 23 c-2 1 -4 -1 -6 -1 c-2 0 -4 2 -6 1 c-8 -3 -9 -18 -2 -23z"
        fill="#ff4d4d"
        stroke="#111"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Hud() {
  const connection = useWorld(s => s.connection);
  const error = useWorld(s => s.error);
  const mode = useWorld(s => s.cameraMode);
  const isTouch = useWorld(s => s.isTouch);
  const holding = useWorld(s => (s.identity ? (s.held[s.identity] ?? null) : null));
  const roomCode = useWorld(s => s.roomCode);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const onChange = () => setLocked(!!document.pointerLockElement);
    document.addEventListener('pointerlockchange', onChange);
    return () => document.removeEventListener('pointerlockchange', onChange);
  }, []);

  const first = mode === 'first' && !isTouch;

  return (
    <div className="hud">
      <div className="hud-title">World 1 — the tree</div>

      {first && connection === 'online' && <div className="crosshair" />}

      {first && !locked && connection === 'online' && (
        <div className="hint">click to look around · V for third person</div>
      )}

      {holding === APPLE_ITEM && (
        <div className="held-item">
          <AppleIcon />
        </div>
      )}

      {connection !== 'online' && (
        <div className="card-wrap">
          <div className="card">
            {connection === 'connecting' ? (
              <>
                <div className="card-title">Finding the meadow</div>
                <div className="card-body">room {roomCode}</div>
              </>
            ) : (
              <>
                <div className="card-title">Lost the meadow</div>
                <div className="card-body">{error ?? 'connection failed'}</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
