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

// The ending. He gets up and goes home, and the party can follow.
export const FAREWELL = 'Wait — follow me.';
export const FAREWELL_DELAY_MS = 350;
export const FAREWELL_HOLD_MS = 2800;

function beatDuration(text: string): number {
  let ms = 0;
  for (const ch of Array.from(text)) ms += TYPE_MS + pauseAfter(ch);
  return ms;
}

/** How long the whole monologue takes, used to spot a story already over. */
export const MONOLOGUE_TOTAL_MS =
  BEATS.reduce(
    (sum, beat, i) => sum + beatDuration(beat.text) + (i === 0 ? FIRST_BEAT_HOLD_MS : BEAT_GAP_MS),
    0
  ) +
  FINAL_HOLD_MS +
  FADE_MS;
