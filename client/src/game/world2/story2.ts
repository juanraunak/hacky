// Everything Newton says in the study, and the one card the game ever shows.
// Edit the words here; nothing in the scene knows what they say.

export const SAY = {
  entry: 'Mind the papers. Some of those are important. I don’t remember which.',
  stone: 'Same as the apple. Same as everything. They all fall the same.',
  pen: 'Keep that. You’ll want something in your hand.',
  feather: 'Put that down. That’s a story for another time.',
  lockedTheDoor: 'I locked the door for this. If the landlady asks, we were reading.',
  lookBehind: 'Oh — wait. Look behind you. What is that.',
  thatsNew: '…that’s new.',
  thrice: 'It’s an apple. It has no legs. How.',
  biggerNotebook: 'I’m going to need a bigger notebook.',
} as const;

// The page pinned to the wall. Lines are added, never removed.
export const NOTE_SAME_FALL = 'big or small, same fall.';
export const NOTE_NOT_FASTER = 'the big ones weren’t faster.';

// The single card, shown while the game is paused for everyone.
export const CARD = {
  title: 'APPLES',
  lines: [
    'Each one goes down in ONE hit with the pen.',
    'LEFT CLICK / TAP when it’s about to reach you.',
  ],
  ready: 'Ready',
} as const;

// Typing, matched to World 1 so Newton sounds like the same man.
export const TYPE_MS = 25;
export const STOP_PAUSE_MS = 380;
export const COMMA_PAUSE_MS = 160;
export const HOLD_MS = 3400;
export const FADE_MS = 700;

export function pauseAfter(ch: string): number {
  if (ch === '.' || ch === '!' || ch === '?' || ch === '…') return STOP_PAUSE_MS;
  if (ch === ',') return COMMA_PAUSE_MS;
  return 0;
}
