// World 2 as scenes. He explains, you do it, and you cannot move on until you
// have actually done it. Every weapon, control and effect is World 3's — this
// is the same fight system pointed at Newton instead of the apple.

import { useEffect, useRef, useState } from 'react';
import { fireWorldEvent } from '../world1/sync';
import { net } from '../../net';
import { useWorld } from '../world1/store';
import { CELLAR_OPEN } from '../world1/store';
import { grantWeapon, installAttackInput, selectWeapon, training } from '../world3/combat';
import type { WeaponId } from '../world3/weapons';
import { briefDone, briefing, drill, incoming, newtonEntrance } from './briefState';

type Counter = 'blocks' | 'swordHits' | 'shots';

interface Scene {
  /** He is entering the room; nobody talks over it. */
  enter?: boolean;
  /** Waits for you to say you are ready. */
  ask?: string;
  /** He is talking. Timed. */
  say?: string;
  law?: string;
  grant?: WeaponId;
  /** You are doing. Gated on actually doing it. */
  do?: { weapon: WeaponId; prompt: string; counter: Counter; need: number; throwAtYou?: boolean };
  ms?: number;
}

const SCENES: Scene[] = [
  { enter: true, ms: 3800 },
  { say: "You're here. Good. Something enormous is falling toward us and I am fresh out of ideas.", ms: 3600 },
  { ask: 'ARE YOU READY?' },

  // --- first law -----------------------------------------------------------
  {
    say: 'Shield first. Plant your feet and a body at rest stays at rest. I am going to throw things at you now.',
    law: '1st LAW · INERTIA · net force zero, you do not move',
    grant: 'shield',
    ms: 5000,
  },
  {
    do: { weapon: 'shield', prompt: 'HOLD to brace — block 2', counter: 'blocks', need: 2, throwAtYou: true },
  },
  { say: 'Good. Nothing moved you. That is the whole of the first law.', ms: 3000 },

  // --- second law ----------------------------------------------------------
  {
    say: 'Sword. Force is mass times acceleration — the blade is the mass, YOU are the acceleration. Hold to wind it up, let go to swing.',
    law: '2nd LAW · F = ma · a slow swing is a wasted swing',
    grant: 'sword',
    ms: 5600,
  },
  {
    do: { weapon: 'sword', prompt: 'HOLD to charge, swing — hit me twice', counter: 'swordHits', need: 2 },
  },
  { say: 'Ow. Ow. That genuinely hurts, and that is the point — you accelerated it.', ms: 3400 },

  // --- third law -----------------------------------------------------------
  {
    say: 'And the gun. Every action has an equal and opposite reaction. It throws the shot forward and it throws YOU backward. Do not blame me.',
    law: '3rd LAW · ACTION / REACTION · it kicks you back',
    grant: 'gun',
    ms: 5600,
  },
  {
    do: { weapon: 'gun', prompt: 'FIRE twice — feel the push back', counter: 'shots', need: 2 },
  },
  { say: 'You felt that. Every shot shoved you. Three laws, and you are out of time. Go.', ms: 3600 },
];

/** Shouts the moment Newton winds up, so bracing is never a guess. */
function IncomingCue() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => setOn(incoming.armed && incoming.at > 0), 90);
    return () => window.clearInterval(id);
  }, []);
  if (!on) return null;
  return <div className="incoming">INCOMING — BRACE!</div>;
}

/** Held here until the last person finishes their own run of the montage. */
function WaitingForParty() {
  const events = useWorld(s => s.events);
  const party = useWorld(s => s.party);
  const ready = Object.keys(events).filter(k => k.startsWith('w2ready:')).length;
  // Connected only: a disconnected row would hold the whole party hostage.
  const total = Math.max(1, Object.values(party).filter(p => p?.connected).length);

  // Once everybody has trained, take the party through. Advancing the room's
  // phase directly is the reliable move: relying on the cellar event reaching
  // a portal button left people stuck in the study with no way out.
  useEffect(() => {
    if (ready < total) return;
    fireWorldEvent(CELLAR_OPEN);
    const t = window.setTimeout(() => net.callReducer('advanceWorld', 3), 1200);
    return () => window.clearTimeout(t);
  }, [ready, total]);

  return (
    <div className="brief-wait">
      <b>TRAINED</b>
      <span>
        {ready >= total
          ? 'everyone is ready — going to the giant apple…'
          : `waiting for the others · ${ready} / ${total}`}
      </span>
    </div>
  );
}

export function Briefing() {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const granted = useRef(new Set<string>());
  const base = useRef(0);

  const advance = () => {
    if (step + 1 >= SCENES.length) {
      briefing.active = false;
      briefDone.value = true;
      setDone(true);
      // Each player announces their own finish. The cellar only opens once
      // everybody has been through it, so nobody is dragged into the fight
      // half-trained.
      const me = useWorld.getState().identity ?? 'me';
      fireWorldEvent(`w2ready:${me.slice(0, 10)}`);
    } else {
      setStep(step + 1);
    }
  };

  useEffect(() => {
    const scene = SCENES[step];
    if (!scene) return;

    if (scene.grant && !granted.current.has(scene.grant)) {
      granted.current.add(scene.grant);
      grantWeapon(scene.grant);
      selectWeapon(scene.grant);
    }

    if (scene.ask) {
      briefing.active = false; // you keep the controls the whole way through
      drill.shove = false;
      return; // waits for the button
    }

    if (scene.enter) {
      briefing.active = false;
      newtonEntrance.playing = true;
      newtonEntrance.startedAt = performance.now();
      const t = window.setTimeout(() => setStep(s => s + 1), scene.ms ?? 3400);
      return () => window.clearTimeout(t);
    }

    if (scene.do) {
      briefing.active = false;
      drill.shove = Boolean(scene.do.throwAtYou);
      selectWeapon(scene.do.weapon);
      base.current = training[scene.do.counter];
      setProgress(0);
      return; // gated: advanced by the poll below, not a timer
    }

    // No timers: he waits for you. Every player runs the montage at their own
    // pace, on their own screen.
    briefing.active = true;
    drill.shove = false;
  }, [step]);

  // Watch the drill counters and move on the moment the goal is met.
  useEffect(() => {
    const scene = SCENES[step];
    if (!scene?.do) return;
    const id = window.setInterval(() => {
      const got = training[scene.do!.counter] - base.current;
      setProgress(Math.min(got, scene.do!.need));
      if (got >= scene.do!.need) {
        window.clearInterval(id);
        drill.shove = false;
        advance();
      }
    }, 120);
    return () => window.clearInterval(id);
  }, [step]);

  // World 3 installs these for the boss fight; World 2 needs the identical
  // handlers or nothing braces, swings or fires. This was why the shield did
  // nothing here.
  useEffect(() => {
    briefDone.value = false;
    training.active = true;
    const off = installAttackInput();
    return () => {
      off();
      briefing.active = false;
      drill.shove = false;
      training.active = false;
    };
  }, []);

  if (done) return <WaitingForParty />;
  const scene = SCENES[step];

  if (scene.enter) {
    return (
      <div className="brief-enter">
        <span>NEWTON'S STUDY</span>
      </div>
    );
  }

  if (scene.ask) {
    return (
      <div className="brief">
        <div className="brief-panel">
          <div className="brief-who">NEWTON</div>
          <p className="brief-line">{scene.ask}</p>
          <button
            type="button"
            className="brief-ready"
            onPointerDown={e => {
              e.stopPropagation();
              setStep(s => s + 1);
            }}
          >
            I'M READY
          </button>
        </div>
      </div>
    );
  }

  if (scene.do) {
    return (
      <div className="brief-test">
        {scene.do.throwAtYou && <IncomingCue />}
        <div className="brief-test-inner">
          <b>{scene.do.prompt}</b>
          <span className="brief-count">
            {Array.from({ length: scene.do.need }, (_, i) => (
              <i key={i} data-on={i < progress} />
            ))}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="brief">
      <div className="brief-panel">
        <div className="brief-who">NEWTON</div>
        <p className="brief-line">{scene.say}</p>
        {scene.law && <div className="brief-law">{scene.law}</div>}
        <button type="button" className="brief-next" onPointerDown={e => { e.stopPropagation(); advance(); }}>
          NEXT
        </button>
        <div className="brief-dots">
          {SCENES.map((_, i) => (
            <span key={i} data-on={i <= step} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Briefing;
