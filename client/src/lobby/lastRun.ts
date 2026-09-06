// What Newton remembers about your last visit.
//
// The welcome mail is a letter about a game you have already played -- the
// weapon you walked off with, who was on the wall with you, the code to get
// back in. None of that exists on the landing page, which is where signing up
// happens, so a run records it on its way out and the letter reads it back.

export interface LastRun {
  /** What they call themselves. */
  name: string;
  /** The weapon they finished holding, in words: "sword", "cannon", "shield". */
  weapon: string;
  /** The rest of the party, already written as a list. */
  party: string;
  /** The room they were in, so the letter can point back at it. */
  code: string;
}

const KEY = 'hacky.lastRun';

const FALLBACK: LastRun = {
  name: 'friend',
  weapon: 'sword',
  party: 'the others',
  code: '',
};

/** Weapon ids are internal; Newton would not write "gun" in a letter. */
export const WEAPON_WORD: Record<string, string> = {
  sword: 'sword',
  gun: 'cannon',
  shield: 'shield',
};

/**
 * Turn a list of names into something readable: "Ada", "Ada and Ben",
 * "Ada, Ben and Cleo". An empty party reads as the fallback rather than as a
 * gap in the sentence.
 */
export function namesToList(names: string[]): string {
  const clean = names.map(n => n.trim()).filter(Boolean);
  if (clean.length === 0) return FALLBACK.party;
  if (clean.length === 1) return clean[0];
  return `${clean.slice(0, -1).join(', ')} and ${clean[clean.length - 1]}`;
}

export function rememberRun(run: Partial<LastRun>): void {
  try {
    const merged = { ...readLastRun(), ...run };
    localStorage.setItem(KEY, JSON.stringify(merged));
  } catch {
    // Non-fatal. The letter falls back to something that still reads.
  }
}

export function readLastRun(): LastRun {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...FALLBACK };
    const saved = JSON.parse(raw) as Partial<LastRun>;
    return {
      name: saved.name?.trim() || FALLBACK.name,
      weapon: saved.weapon?.trim() || FALLBACK.weapon,
      party: saved.party?.trim() || FALLBACK.party,
      code: saved.code?.trim() || FALLBACK.code,
    };
  } catch {
    return { ...FALLBACK };
  }
}

/** Where "go back down" points. Falls back to the front door. */
export function lobbyLink(code: string): string {
  return code ? `${window.location.origin}/r/${code}` : window.location.origin;
}
