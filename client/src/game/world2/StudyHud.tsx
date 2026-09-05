// Study chrome: the zone name, the one card the game ever shows, the HIT
// flash, and what is in your hand. No score, no health, no questions.

import { useEffect, useState } from 'react';
import { CARD } from './story2';
import {
  FIGHT_DONE,
  FIGHT_READY,
  PEN_ITEM,
  PORTAL_OPEN,
  useWorld,
} from '../world1/store';
import { fireWorldEvent, resetWorld } from '../world1/sync';
import { useStudy } from './studyStore';
import { STONE_ITEM_ID, FEATHER_ITEM_ID } from './DropTest';

function PenIcon() {
  return (
    <svg viewBox="0 0 48 48" width="42" height="42" aria-hidden="true">
      <path
        d="M12 40 L15 31 L33 9 c2 -2 5 -2 7 0 c2 2 2 5 0 7 L18 38 Z"
        fill="#fff8e7"
        stroke="#111"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M15 31 L18 38" stroke="#111" strokeWidth="3" strokeLinecap="round" />
      <path d="M12 40 L16 36" stroke="#111" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function heldLabel(item: string | null): string | null {
  if (item === PEN_ITEM) return 'pen';
  if (item === STONE_ITEM_ID) return 'stone';
  if (item === FEATHER_ITEM_ID) return 'feather';
  return item;
}

export function StudyHud() {
  const connection = useWorld(s => s.connection);
  const mode = useWorld(s => s.cameraMode);
  const isTouch = useWorld(s => s.isTouch);
  const portal = useWorld(s => s.events[PORTAL_OPEN]);
  const ready = useWorld(s => s.events[FIGHT_READY]);
  const done = useWorld(s => s.events[FIGHT_DONE]);
  const holding = useWorld(s => (s.identity ? (s.held[s.identity] ?? null) : null));
  const hitAt = useStudy(s => s.hitAt);
  const [flash, setFlash] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const onChange = () => setLocked(!!document.pointerLockElement);
    document.addEventListener('pointerlockchange', onChange);
    return () => document.removeEventListener('pointerlockchange', onChange);
  }, []);

  useEffect(() => {
    if (!hitAt) return;
    setFlash(true);
    const t = window.setTimeout(() => setFlash(false), 420);
    return () => window.clearTimeout(t);
  }, [hitAt]);

  const first = mode === 'first' && !isTouch;
  const paused = !!portal && !ready && !done;
  const label = heldLabel(holding);

  return (
    <div className="hud">
      <div className="hud-title">World 2 — the study</div>

      {first && connection === 'online' && !paused && <div className="crosshair" />}
      {first && !locked && connection === 'online' && !paused && (
        <div className="hint">click to look around · V for third person</div>
      )}

      {flash && <div className="hit-flash">HIT</div>}

      {label && (
        <div className="held-item held-item--label">
          <span>{label}</span>
        </div>
      )}

      {connection === 'online' && !paused && (
        <button type="button" className="reset-button" onClick={() => resetWorld()}>
          Reset
        </button>
      )}

      {paused && (
        <div className="card-wrap card-wrap--dim">
          <div className="card card--wide">
            <div className="card-icon">
              <PenIcon />
            </div>
            <div className="card-title">{CARD.title}</div>
            {CARD.lines.map(line => (
              <div key={line} className="card-body">
                {line}
              </div>
            ))}
            <button
              type="button"
              className="card-button"
              onClick={() => fireWorldEvent(FIGHT_READY)}
            >
              {CARD.ready}
            </button>
          </div>
        </div>
      )}

      {connection !== 'online' && (
        <div className="card-wrap">
          <div className="card">
            <div className="card-title">Lost the study</div>
            <div className="card-body">reconnecting…</div>
          </div>
        </div>
      )}
    </div>
  );
}
