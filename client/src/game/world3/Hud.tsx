// World 3 HUD: the opening beat, the boss bar, your own health, and the
// desktop control hint. No zone title, no reset button.

import { useEffect, useRef, useState } from 'react';
import { useWorld } from '../world1/store';
import type { WeaponId } from './weapons';
import { net } from '../../net';
import {
  PHASES,
  resetCombat,
  fireGun,
  setBracing,
  setSwordCharge,
  swingSword,
  PLAYER_MAX_HP,
  RESPAWN_MS,
  phaseOf,
  selectWeapon,
  useCombat,
} from './combat';
import { ABILITY_LAW, ABILITY_NAME, BOSS_LINE, LAW_LINE, LAWS, MAG_SIZE } from './weapons';
import { local } from '../world1/local';

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

/**
 * The only explanation the game gives: what just happened, in the language of
 * the hit. It never says which weapon answers which state — that is the thing
 * the player is here to work out.
 */
function HitText({ fb }: { fb: { effect: string; weapon: WeaponId } }) {
  const label =
    fb.effect === 'strong' ? 'STRONG' : fb.effect === 'weak' ? 'weak' : '\u2026nothing';
  return (
    <div className="hit-text" data-effect={fb.effect}>
      {label}
      {/* The law is named only when it worked: you earn the explanation by
          landing it, you are never told it up front. */}
      {fb.effect === 'strong' && <span className="hit-law">{LAW_LINE[fb.weapon]}</span>}
    </div>
  );
}

/** The boss saying, in physics, exactly what it is about to do to you. */
function Shout({ text }: { text: string }) {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setGone(true), 3200);
    return () => window.clearTimeout(t);
  }, [text]);
  if (gone) return null;
  return <div className="shout">{text}</div>;
}

/** What you just picked up off the floor. */
function Got({ id }: { id: WeaponId }) {
  const [gone, setGone] = useState(false);
  const law = LAWS.find(l => l.id === id);
  useEffect(() => {
    const t = window.setTimeout(() => setGone(true), 2600);
    return () => window.clearTimeout(t);
  }, [id]);
  if (gone || !law) return null;
  return (
    <div className="got">
      <b>{law.law}</b>
      <span>{law.short}</span>
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

/**
 * The pay-off, then out. Held until the apple has actually come apart, read
 * for a few beats, then a clean cut to black and back to the party screen --
 * nobody should have to find a button after winning.
 */
function Victory({ at }: { at: number }) {
  const [step, setStep] = useState(0); // 0 nothing, 1 card, 2 cutting out

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setStep(1), 1900), // debris has landed
      window.setTimeout(() => setStep(2), 5200), // start the cut
      window.setTimeout(() => {
        net.callReducer('logEvent', 'finished', '');
        resetCombat();
        net.callReducer('advanceWorld', 0);
        // Land on the clean room URL. A reload guarantees the party screen,
        // with no stale flag and no phase that has not propagated yet.
        window.setTimeout(() => {
          window.location.href = window.location.pathname;
        }, 700);
      }, 6400),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [at]);

  if (step === 0) return null;
  return (
    <>
      <div className="victory">
        <div>
          <div className="victory-line">TOPIC COMPLETE</div>
          <div className="victory-sub">THE GIANT APPLE IS DOWN</div>
          <div className="victory-next">back to your party…</div>
        </div>
      </div>
      <div className="cut" data-on={step === 2} />
    </>
  );
}

export function Hud() {
  const connection = useWorld(s => s.connection);
  const error = useWorld(s => s.error);
  const isTouch = useWorld(s => s.isTouch);
  void useWorld(s => s.cameraMode);
  const combat = useCombat();
  const flash = useRef<HTMLDivElement>(null);
  const seen = useRef(0);
  const held = useRef(0);
  const reloading = combat.reloadingUntil > performance.now();

  const bossPct = Math.max(0, Math.min(100, (combat.hp / combat.maxHp) * 100));
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

      {combat.landed && combat.owned.length >= 3 && !combat.down && (
        <Shout key={combat.modeSince} text={BOSS_LINE[combat.mode]} />
      )}
      {combat.landed && combat.owned.length < 3 && (
        <div className="gather">
          FIND THE THREE LAWS
          <span>{combat.owned.length} / 3</span>
        </div>
      )}
      {combat.justGot && <Got key={combat.justGot.at} id={combat.justGot.id} />}

      <div className="boss">
        <div className="boss-name">THE GIANT APPLE</div>
        <div className="boss-bar">
          <div className="boss-fill" style={{ width: `${bossPct}%` }} />
          {Array.from({ length: PHASES - 1 }, (_, i) => (
            <span
              key={i}
              className="boss-notch"
              style={{ left: `${((i + 1) * 100) / PHASES}%` }}
            />
          ))}
        </div>
        {!combat.down && combat.landed && combat.owned.length >= 3 && (
          <div className="boss-mode" data-mode={combat.mode}>
            {ABILITY_NAME[combat.mode]}
            <span className="boss-law">{ABILITY_LAW[combat.mode]}</span>
          </div>
        )}
        <div className="boss-phase">
          {combat.down
            ? 'DOWN'
            : `PHASE ${phase + 1} / ${PHASES} · ${combat.players} IN THE FIGHT`}
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
      {combat.feedback && combat.feedback.weapon === 'shield' && combat.feedback.effect === 'strong' ? (
        <div className="blocked" key={combat.feedback.at}>
          BLOCKED
          <span className="hit-law">{LAW_LINE.shield}</span>
        </div>
      ) : (
        combat.feedback && <HitText key={combat.feedback.at} fb={combat.feedback} />
      )}

      <div className="slots">
        {LAWS.map((w, i) => (
          <button
            key={w.id}
            type="button"
            className="slot"
            data-on={combat.weapon === w.id}
            data-locked={!combat.owned.includes(w.id)}
            onPointerDown={e => {
              e.stopPropagation();
              selectWeapon(w.id);
            }}
          >
            <span className="slot-glyph">{w.glyph}</span>
            <span className="slot-law">{w.short}</span>
            <span className="slot-num">{i + 1}</span>
          </button>
        ))}
        {combat.weapon === 'sword' && combat.swordCharge > 0.02 && (
          <div className="charge">
            <div className="charge-fill" style={{ width: `${combat.swordCharge * 100}%` }} />
          </div>
        )}
        {combat.bracing && <div className="bracing">BRACED</div>}
        {combat.weapon === 'gun' && (
          <div className="ammo">
            {reloading ? (
              <span className="ammo-reload">RELOADING</span>
            ) : (
              Array.from({ length: MAG_SIZE }, (_, i) => (
                <span key={i} className="pip" data-spent={i >= combat.ammo} />
              ))
            )}
          </div>
        )}
      </div>

      {(
        <div className="mobile-extra">
          <button
            type="button"
            className="mini"
            onPointerDown={e => {
              e.stopPropagation();
              if (local.y <= 0.01) local.vy = 15;
            }}
          >
            JUMP
          </button>
          <button
            type="button"
            className="mini"
            onPointerDown={e => {
              e.stopPropagation();
              local.sprinting = true;
            }}
            onPointerUp={e => {
              e.stopPropagation();
              local.sprinting = false;
            }}
          >
            RUN
          </button>
        </div>
      )}

      {(
        <button
          type="button"
          className="fire"
          onPointerDown={e => {
            e.stopPropagation();
            const w = combat.weapon;
            if (w === 'gun') fireGun();
            else if (w === 'shield') setBracing(true);
            else held.current = performance.now();
          }}
          onPointerUp={e => {
            e.stopPropagation();
            if (combat.weapon === 'shield') setBracing(false);
            if (combat.weapon === 'sword' && held.current) {
              setSwordCharge((performance.now() - held.current) / 700);
              swingSword();
              held.current = 0;
            }
          }}
        >
          {combat.weapon === 'gun' ? 'FIRE' : combat.weapon === 'shield' ? 'BRACE' : 'SWING'}
        </button>
      )}

      {!isTouch && (
        <div className="hud-hint">
          {'WASD · SHIFT run · SPACE jump · 1/2/3 weapon · hold F to use · V camera'}
        </div>
      )}
    </div>
  );
}

export default Hud;
