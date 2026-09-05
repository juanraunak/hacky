// Local-only state for the study: where Newton is walking, what he is part
// way through saying, what the notebook has written down, and the little
// feedback flashes. Anything the party has to agree on lives in the database.

import { create } from 'zustand';
import { newtonRoute } from './study';

export interface StudyState {
  /** The line Newton is saying. `id` changes even when the text repeats. */
  line: string | null;
  lineId: number;
  /** The rest of the beat, waiting its turn. */
  queue: string[];
  /** The route he is walking, in study coordinates. Front of the list first. */
  path: { x: number; z: number }[];
  notes: string[];
  /** performance.now() of the last connected swing, for the HIT flash. */
  hitAt: number;
  /** How many apples have got through to you. */
  timesHit: number;
  swingAt: number;

  /** Say a whole beat. Later lines wait for the earlier ones to finish. */
  say: (...lines: string[]) => void;
  /** The bubble calls this when it has finished with the current line. */
  advance: () => void;
  hush: () => void;
  goTo: (x: number, z: number) => void;
  /** Newton calls this when he reaches the head of the path. */
  stepped: () => void;
  addNote: (text: string) => void;
  markHit: () => void;
  markThump: () => number;
  markSwing: () => void;
}

export const useStudy = create<StudyState>((set, get) => ({
  line: null,
  lineId: 0,
  queue: [],
  path: [],
  notes: [],
  hitAt: 0,
  timesHit: 0,
  swingAt: 0,

  say: (...lines) => {
    const [first, ...rest] = lines.filter(Boolean);
    if (!first) return;
    set(s => ({ line: first, queue: rest, lineId: s.lineId + 1 }));
  },
  advance: () =>
    set(s => {
      if (s.queue.length === 0) return { line: null, queue: [] };
      const [next, ...rest] = s.queue;
      return { line: next, queue: rest, lineId: s.lineId + 1 };
    }),
  hush: () => set({ line: null, queue: [] }),
  goTo: (x, z) => set({ path: newtonRoute(x, z) }),
  stepped: () => set(s => ({ path: s.path.slice(1) })),

  addNote: text => set(s => (s.notes.includes(text) ? s : { notes: [...s.notes, text] })),
  markHit: () => set({ hitAt: performance.now() }),
  markThump: () => {
    const timesHit = get().timesHit + 1;
    set({ timesHit });
    return timesHit;
  },
  markSwing: () => set({ swingAt: performance.now() }),
}));
