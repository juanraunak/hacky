// World 3 HUD: the opening beat, the boss bar, your own health, and the
// desktop control hint. No zone title, no reset button.

import { useEffect, useRef, useState } from 'react';
import { useWorld } from '../world1/store';
import {
  HP_PER_PHASE,
  RESPAWN_MS,
  MAX_HP,
  PHASES,
  PLAYER_MAX_HP,
  phaseOf,
  useCombat,
} from './combat';

/** Black screen, then the drop. Everyone sees the same beats on their own screen. */
/**
 * The opening. A short black beat to say the party has arrived, then it gets
 * out of the way so you can walk around. The shout comes later, just before
 * the drop, so the arrival lands as a surprise instead of a countdown.
 */
function Intro() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers = [
      window.setTimeout(() => setStep(1), 2200), // start fading
      window.setTimeout(() => setStep(2), 3600), // gone; go explore
      window.setTimeout(() => setStep(3), 8600), // something is coming
      window.setTimeout(() => setStep(4), 11400), // it has landed
    ];
    return () => timers.forEach(window.clearTimeout);
  }, []);

  if (step >= 4) return null;
  if (step === 3) return <div className="warn">LOOK UP</div>;
  if (step >= 2) return null;
  return (
    <div className="intro" data-fading={step === 1}>
      <div>
        <div className="intro-line">EVERYONE IS READY</div>
        <div className="intro-sub">WORLD 3 · THE GIANT APPLE</div>
      </div>
    </div>
  );
}

/** You are out. Counts you back in. */
function Downed({ at }: { at: number }) {
  const [left, setLeft] = useState(Math.ceil(RESPAWN_MS / 1000));
  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, RESPAWN_MS - (performance.now() - at));
      setLeft(Math.ceil(remaining / 1000));
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [at]);
  return (
    <div className="downed">
      <div>
        <div className="downed-line">YOU'RE DOWN</div>
        <div className="downed-sub">BACK IN {left}</div>
      </div>
    </div>
  );
}

/** The pay-off. Held back until the apple has actually come apart. */
function Victory({ at }: { at: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), 1900);
    return () => window.clearTimeout(t);
  }, [at]);
  if (!show) return null;
  return (
    <div className="victory">
      <div>
        <div className="victory-line">TOPIC COMPLETE</div>
        <div className="victory-sub">THE GIANT APPLE IS DOWN</div>
      </div>
    </div>
  );
}

export function Hud() {
  const connection = useWorld(s => s.connection);
  const error = useWorld(s => s.error);
  const isTouch = useWorld(s => s.isTouch);
  const mode = useWorld(s => s.cameraMode);
  const combat = useCombat();
  const flash = useRef<HTMLDivElement>(null);
  const seen = useRef(0);

  const bossPct = Math.max(0, Math.min(100, (combat.hp / MAX_HP) * 100));
  const youPct = Math.max(0, Math.min(100, (combat.playerHp / PLAYER_MAX_HP) * 100));
  const phase = phaseOf(combat.hp);

  // Red vignette when the boss connects.
  useEffect(() => {
    if (combat.playerHitAt === seen.current) return;
    seen.current = combat.playerHitAt;
    const el = flash.current;
    if (!el || !combat.playerHitAt) return;
    el.style.transition = 'none';
    el.style.opacity = '0.42';
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 420ms ease';
      el.style.opacity = '0';
    });
  }, [combat.playerHitAt]);

  return (
    <div className="hud">
      <div className="hit-flash" ref={flash} />
      <Intro />

      {combat.down && <Victory at={combat.downAt} />}
      {combat.playerHp <= 0 && !combat.down && <Downed at={combat.playerDeadAt} />}

      <div className="boss">
        <div className="boss-name">THE GIANT APPLE</div>
        <div className="boss-bar">
          <div className="boss-fill" style={{ width: `${bossPct}%` }} />
          {Array.from({ length: PHASES - 1 }, (_, i) => (
            <span
              key={i}
              className="boss-notch"
              style={{ left: `${((i + 1) * HP_PER_PHASE * 100) / MAX_HP}%` }}
            />
          ))}
        </div>
        <div className="boss-phase">
          {combat.down ? 'DOWN' : `PHASE ${phase + 1} / ${PHASES}`}
        </div>
      </div>

      <div className="you">
        <div className="you-label">{combat.playerHp > 0 ? 'YOU' : 'DOWN'}</div>
        <div className="you-bar">
          <div className="you-fill" data-low={youPct <= 30} style={{ width: `${youPct}%` }} />
        </div>
      </div>

      {connection !== 'online' && (
        <div className="hud-status">
          {connection === 'connecting' ? 'connecting…' : (error ?? 'connection lost')}
        </div>
      )}
      {!isTouch && (
        <div className="hud-hint">
          {mode === 'first'
            ? 'WASD · SPACE to hit · V for third person'
            : 'WASD · drag to look · SPACE or click to hit · V for first person'}
        </div>
      )}
    </div>
  );
}

export default Hud;
