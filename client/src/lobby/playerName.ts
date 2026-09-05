// The name you go by. Chosen once, kept on the device, and used everywhere:
// the party list, the tag over your head in the worlds, all of it.

import { animalName } from './names';

const KEY = 'hacky.name';

export function readName(): string | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

export function writeName(name: string): string {
  const clean = name.trim().slice(0, 16);
  try {
    window.localStorage.setItem(KEY, clean);
  } catch {
    // private mode: it lasts the session and no longer
  }
  return clean;
}

/** Your name, or a suggested one if you have not picked yet. */
export function nameOr(identity: string): string {
  return readName() ?? animalName(identity);
}
