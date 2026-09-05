// Newton's thoughts, typed out in a comic bubble that sits in the world above
// his head and faces the camera. The beats live in story.ts. Nothing here
// waits for the player; it runs to the end whether anyone is watching.

import { useEffect, useState } from 'react';
import { Html } from '@react-three/drei';
import {
  BEATS,
  BEAT_GAP_MS,
  FADE_MS,
  FINAL_HOLD_MS,
  FIRST_BEAT_HOLD_MS,
  TYPE_MS,
  pauseAfter,
} from './story';
import { NEWTON, NEWTON_HEAD_Y, groundHeight } from './layout';
import { useWorld } from './store';

const ANCHOR: [number, number, number] = [
  NEWTON.x,
  groundHeight(NEWTON.x, NEWTON.z) + NEWTON_HEAD_Y + 0.15,
  NEWTON.z + 0.1,
];

export function ThoughtBubble() {
  const startedAt = useWorld(s => s.storyStartedAt);
  const [text, setText] = useState('');
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (startedAt == null) {
      setVisible(false);
      setFading(false);
      setText('');
      return;
    }
    let cancelled = false;
    let timer = 0;
    const wait = (ms: number) =>
      new Promise<void>(resolve => {
        timer = window.setTimeout(resolve, ms);
      });

    (async () => {
      setFading(false);
      setVisible(true);
      for (let b = 0; b < BEATS.length; b++) {
        const chars = Array.from(BEATS[b].text);
        setText('');
        for (let i = 1; i <= chars.length; i++) {
          if (cancelled) return;
          setText(chars.slice(0, i).join(''));
          await wait(TYPE_MS + pauseAfter(chars[i - 1]));
        }
        if (cancelled) return;
        await wait(b === 0 ? FIRST_BEAT_HOLD_MS : BEAT_GAP_MS);
      }
      if (cancelled) return;
      await wait(FINAL_HOLD_MS);
      if (cancelled) return;
      setFading(true);
      await wait(FADE_MS);
      if (cancelled) return;
      setVisible(false);
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [startedAt]);

  if (!visible) return null;

  return (
    <Html position={ANCHOR} center zIndexRange={[40, 0]} style={{ pointerEvents: 'none' }}>
      <div className={`bubble${fading ? ' bubble--fade' : ''}`}>{text || ' '}</div>
    </Html>
  );
}
