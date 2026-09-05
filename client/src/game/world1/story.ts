// The whole story of World 1, in order. Edit the words here; nothing in the
// scene knows what they say. There is no input, no question, no choice: it is
// Newton thinking, and the party happens to be standing there.

export interface Beat {
  text: string;
}

export const BEATS: Beat[] = [
  { text: 'Ow.' },
  { text: '…' },
  { text: 'It fell down. Not sideways. Not up. Down.' },
  { text: 'It always does that. Everything does that.' },
  { text: 'So there’s something pulling it. Toward the ground. Toward… the Earth.' },
  { text: 'Then why doesn’t the Moon fall?' },
  { text: '…or does it?' },
  { text: 'Maybe it’s falling all the time. And missing.' },
];

// Timing, all in milliseconds.
export const TYPE_MS = 25; // per character
export const STOP_PAUSE_MS = 380; // after . ! ? …
export const COMMA_PAUSE_MS = 160; // after ,
export const BEAT_GAP_MS = 1100; // silence between beats
export const FIRST_BEAT_HOLD_MS = 1600; // "Ow." lingers a little longer
export const FINAL_HOLD_MS = 6000; // last bubble stays this long
export const FADE_MS = 700;

export function pauseAfter(ch: string): number {
  if (ch === '.' || ch === '!' || ch === '?' || ch === '…') return STOP_PAUSE_MS;
  if (ch === ',') return COMMA_PAUSE_MS;
  return 0;
}
