// Newton's thoughts, typed out in a comic bubble that sits in the world above
// his head and faces the camera. The beats live in story.ts. Nothing here
// waits for the player; it runs to the end whether anyone is watching.
//
// When the last beat is done it fires the newton_leaves world_event, which is
// what makes him stand and walk home on every screen at once.

import { useEffect, useState } from 'react';
import { Html } from '@react-three/drei';
import {
  BEATS,
  BEAT_GAP_MS,
  FADE_MS,
  FAREWELL,
  FAREWELL_DELAY_MS,
  FAREWELL_HOLD_MS,
  FINAL_HOLD_MS,
  FIRST_BEAT_HOLD_MS,
  MONOLOGUE_TOTAL_MS,
  TYPE_MS,
  pauseAfter,
} from './story';
import {
  ENDING_TOTAL_MS,
  NEWTON,
  NEWTON_HEAD_Y,
  NEWTON_WALK_SPEED,
  NEWTON_WALK_START_MS,
  groundHeight,
  walkPoint,
} from './layout';
import { APPLE_EVENT, NEWTON_LEAVES, useWorld } from './store';
import { fireWorldEvent } from './sync';

const SEAT_ANCHOR: [number, number, number] = [
  NEWTON.x,
  groundHeight(NEWTON.x, NEWTON.z) + NEWTON_HEAD_Y + 0.15,
  NEWTON.z + 0.1,
];

function wait(ms: number, timer: { id: number }) {
  return new Promise<void>(resolve => {
    timer.id = window.setTimeout(resolve, ms);
  });
}

/** Types one beat into `set`, resolving when the last character has landed. */
async function type(text: string, set: (s: string) => void, timer: { id: number }, alive: () => boolean) {
  const chars = Array.from(text);
  set('');
  for (let i = 1; i <= chars.length; i++) {
    if (!alive()) return;
    set(chars.slice(0, i).join(''));
    await wait(TYPE_MS + pauseAfter(chars[i - 1]), timer);
  }
}

export function ThoughtBubble() {
  const startedAt = useWorld(s => s.storyStartedAt);
  const leaving = useWorld(s => s.events[NEWTON_LEAVES]);
  const apple = useWorld(s => s.events[APPLE_EVENT]);
  const [text, setText] = useState('');
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [anchor, setAnchor] = useState<[number, number, number]>(SEAT_ANCHOR);

  // A client that reconnects after the monologue already played still needs
  // Newton to go home, so it fires the event itself. Insert-once server-side,
  // so the racing clients cost nothing.
  useEffect(() => {
    if (leaving || !apple) return;
    if (Date.now() - apple.firedAt < MONOLOGUE_TOTAL_MS + 2000) return;
    fireWorldEvent(NEWTON_LEAVES);
  }, [leaving, apple]);

  // The monologue.
  useEffect(() => {
    if (startedAt == null || leaving) return;
    let cancelled = false;
    const timer = { id: 0 };
    const alive = () => !cancelled;

    (async () => {
      setAnchor(SEAT_ANCHOR);
      setFading(false);
      setVisible(true);
      for (let b = 0; b < BEATS.length; b++) {
        await type(BEATS[b].text, setText, timer, alive);
        if (cancelled) return;
        await wait(b === 0 ? FIRST_BEAT_HOLD_MS : BEAT_GAP_MS, timer);
        if (cancelled) return;
      }
      await wait(FINAL_HOLD_MS, timer);
      if (cancelled) return;
      setFading(true);
      await wait(FADE_MS, timer);
      if (cancelled) return;
      setVisible(false);
      fireWorldEvent(NEWTON_LEAVES);
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer.id);
    };
  }, [startedAt, leaving]);

  // The farewell, once he is on his feet.
  useEffect(() => {
    if (!leaving) return;
    if (Date.now() - leaving.firedAt > ENDING_TOTAL_MS) return; // already home
    let cancelled = false;
    const timer = { id: 0 };
    const alive = () => !cancelled;

    (async () => {
      await wait(FAREWELL_DELAY_MS, timer);
      if (cancelled) return;
      setAnchor(SEAT_ANCHOR);
      setFading(false);
      setVisible(true);
      await type(FAREWELL, setText, timer, alive);
      if (cancelled) return;
      await wait(FAREWELL_HOLD_MS, timer);
      if (cancelled) return;
      setFading(true);
      await wait(FADE_MS, timer);
      if (cancelled) return;
      setVisible(false);
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer.id);
    };
  }, [leaving]);

  // Once he is walking the bubble travels with him.
  useEffect(() => {
    if (!leaving || !visible) return;
    const id = window.setInterval(() => {
      const ms = performance.now() - leaving.receivedAt;
      if (ms < NEWTON_WALK_START_MS) return;
      const spot = walkPoint(((ms - NEWTON_WALK_START_MS) / 1000) * NEWTON_WALK_SPEED);
      setAnchor([spot.x, groundHeight(spot.x, spot.z) + 2.9, spot.z]);
    }, 80);
    return () => window.clearInterval(id);
  }, [leaving, visible]);

  if (!visible) return null;

  return (
    <Html position={anchor} center zIndexRange={[40, 0]} style={{ pointerEvents: 'none' }}>
      <div className={`bubble${fading ? ' bubble--fade' : ''}`}>{text || ' '}</div>
    </Html>
  );
}
