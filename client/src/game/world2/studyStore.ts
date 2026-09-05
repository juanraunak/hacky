// Local-only state for the study: what Newton is saying right now, what the
// notebook has written down, and the little feedback flashes. Anything the
// party has to agree on lives in the database instead.

import { create } from 'zustand';

export interface StudyState {
  /** The line Newton is saying. `id` changes even when the text repeats. */
  line: string | null;
  lineId: number;
  notes: string[];
  /** performance.now() of the last connected swing, for the HIT flash. */
  hitAt: number;
  /** How many apples have got through to you. */
  timesHit: number;
  swingAt: number;
  say: (text: string) => void;
  hush: () => void;
  addNote: (text: string) => void;
  markHit: () => void;
  markThump: () => number;
  markSwing: () => void;
}

export const useStudy = create<StudyState>((set, get) => ({
  line: null,
  lineId: 0,
  notes: [],
  hitAt: 0,
  timesHit: 0,
  swingAt: 0,

  say: text => set(s => ({ line: text, lineId: s.lineId + 1 })),
  hush: () => set({ line: null }),
  addNote: text =>
    set(s => (s.notes.includes(text) ? s : { notes: [...s.notes, text] })),
  markHit: () => set({ hitAt: performance.now() }),
  markThump: () => {
    const timesHit = get().timesHit + 1;
    set({ timesHit });
    return timesHit;
  },
  markSwing: () => set({ swingAt: performance.now() }),
}));
