// The only audio in the game: a low rumble when the portal opens, a thud when
// something lands. Synthesised, so there are no assets to load and nothing to
// go wrong on a slow phone. Browsers refuse audio until the page has been
// touched, so every call is wrapped and a refusal is simply silence.

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** A long, low swell. Used once, when the portal opens. */
export function rumble(seconds = 2.6) {
  const ac = audio();
  if (!ac) return;
  try {
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const sub = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sawtooth';
    sub.type = 'sine';
    osc.frequency.setValueAtTime(38, now);
    osc.frequency.exponentialRampToValueAtTime(24, now + seconds);
    sub.frequency.setValueAtTime(21, now);
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    osc.connect(filter);
    sub.connect(filter);
    filter.connect(gain).connect(ac.destination);
    osc.start(now);
    sub.start(now);
    osc.stop(now + seconds);
    sub.stop(now + seconds);
  } catch {
    // silence is an acceptable outcome
  }
}

/** A short knock. Something hit the floor, or hit you. */
export function thud(strength = 1) {
  const ac = audio();
  if (!ac) return;
  try {
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150 * strength, now);
    osc.frequency.exponentialRampToValueAtTime(46, now + 0.16);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12 * strength, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  } catch {
    // silence is an acceptable outcome
  }
}
