// The lesson, in order. Newton walks to whatever he is about to talk about,
// says his piece, and moves on. Every beat hangs off a database event, so the
// whole party gets the same lecture at the same time.
//
// He never asks the player anything and never checks whether they got it.

import { useCallback, useEffect, useRef } from 'react';
import {
  AFTER_WAVE_2,
  BEFORE_FIGHT,
  CELLAR,
  DONE,
  ENTRY,
  FEATHER,
  GUN,
  NOTE_BRACE,
  NOTE_NOT_FASTER,
  NOTE_RECOIL,
  NOTE_SAME_FALL,
  NOTE_WINDUP,
  PEN,
  PORTAL,
  RACK,
  SHIELD,
  STATION,
  STONE,
  STONE_NOTE,
  SWORD,
  type Beat,
} from './story2';
import { STATIONS } from './study';
import {
  CELLAR_OPEN,
  FEATHER_DROPPED,
  FIGHT_DONE,
  FIGHT_READY,
  GUN_ITEM,
  PEN_DROPPED,
  PORTAL_OPEN,
  SHIELD_ITEM,
  STONE_DROPPED,
  STUDY_ENTERED,
  SWORD_ITEM,
  useWorld,
} from '../world1/store';
import { fireWorldEvent } from '../world1/sync';
import { useStudy } from './studyStore';

/** Roughly how long it takes him to cross the room, so he speaks on arrival. */
const WALK_LEAD_MS = 1400;
/** An event older than this happened before you got here; skip its speech. */
const STALE_MS = 25000;

export function Director() {
  const entered = useWorld(s => s.events[STUDY_ENTERED]);
  const stone = useWorld(s => s.events[STONE_DROPPED]);
  const pen = useWorld(s => s.events[PEN_DROPPED]);
  const feather = useWorld(s => s.events[FEATHER_DROPPED]);
  const portal = useWorld(s => s.events[PORTAL_OPEN]);
  const ready = useWorld(s => s.events[FIGHT_READY]);
  const done = useWorld(s => s.events[FIGHT_DONE]);
  const apples = useWorld(s => s.apples);
  const cellar = useWorld(s => s.events[CELLAR_OPEN]);
  const mine = useWorld(s => (s.identity ? (s.held[s.identity] ?? null) : null));
  const notedWave2 = useRef(false);

  /** Walk there now, start talking once he has had time to arrive. */
  const perform = useCallback((beat: Beat, delay = 0): (() => void) => {
    const study = useStudy.getState();
    const spot = STATIONS[beat.at];
    const go = window.setTimeout(() => study.goTo(spot.x, spot.z), delay);
    const talk = window.setTimeout(
      () => useStudy.getState().say(...beat.lines),
      delay + WALK_LEAD_MS
    );
    return () => {
      window.clearTimeout(go);
      window.clearTimeout(talk);
    };
  }, []);

  // He starts behind the desk and comes round it to meet the party.
  useEffect(() => {
    if (!entered) return;
    if (Date.now() - entered.firedAt > STALE_MS) {
      useStudy.getState().goTo(STATIONS[STATION.desk].x, STATIONS[STATION.desk].z);
      return;
    }
    return perform(ENTRY, 900);
  }, [entered, perform]);

  // The stone: the whole lesson, then he goes and writes it on the wall.
  useEffect(() => {
    if (!stone) return;
    if (Date.now() - stone.firedAt > STALE_MS) {
      useStudy.getState().addNote(NOTE_SAME_FALL);
      return;
    }
    const stopA = perform(STONE, 700);
    const stopB = perform(STONE_NOTE, 22000);
    const note = window.setTimeout(() => useStudy.getState().addNote(NOTE_SAME_FALL), 23500);
    return () => {
      stopA();
      stopB();
      window.clearTimeout(note);
    };
  }, [stone, perform]);

  useEffect(() => {
    if (!pen || Date.now() - pen.firedAt > STALE_MS) return;
    return perform(PEN, 900);
  }, [pen, perform]);

  // The feather is the exception, and he refuses to explain it. On purpose.
  useEffect(() => {
    if (!feather || Date.now() - feather.firedAt > STALE_MS) return;
    return perform(FEATHER, 2800);
  }, [feather, perform]);

  // The portal waits for the stone and the pen. The feather is not part of it.
  useEffect(() => {
    if (!stone || !pen || portal) return;
    const open = window.setTimeout(() => fireWorldEvent(PORTAL_OPEN), 30000);
    return () => window.clearTimeout(open);
  }, [stone, pen, portal]);

  // It comes up behind the party, so he steps aside and tells them to turn.
  useEffect(() => {
    if (!portal || Date.now() - portal.firedAt > STALE_MS) return;
    return perform(PORTAL, 300);
  }, [portal, perform]);

  // Once they have pressed Ready, the point of the fight, before it starts.
  useEffect(() => {
    if (!ready || Date.now() - ready.firedAt > STALE_MS) return;
    return perform(BEFORE_FIGHT, 400);
  }, [ready, perform]);

  // The payoff, once two waves have been through.
  useEffect(() => {
    if (notedWave2.current || done) return;
    if (!Object.values(apples).some(a => a.wave >= 3)) return;
    notedWave2.current = true;
    useStudy.getState().addNote(NOTE_NOT_FASTER);
    perform(AFTER_WAVE_2, 200);
  }, [apples, done, perform]);

  useEffect(() => {
    if (!done || Date.now() - done.firedAt > STALE_MS) return;
    const stopA = perform(DONE, 1600);
    // Then he walks to the wall the bookshelf just left, and gives up.
    const stopB = perform(RACK, 15000);
    return () => {
      stopA();
      stopB();
    };
  }, [done, perform]);

  // Whatever you took off the rack, he explains the law it is. The line only
  // plays for the person who took it; the rest are getting their own.
  useEffect(() => {
    if (!mine) return;
    if (mine === SHIELD_ITEM) {
      useStudy.getState().addNote(NOTE_BRACE);
      return perform(SHIELD, 500);
    }
    if (mine === SWORD_ITEM) {
      useStudy.getState().addNote(NOTE_WINDUP);
      return perform(SWORD, 500);
    }
    if (mine === GUN_ITEM) {
      useStudy.getState().addNote(NOTE_RECOIL);
      return perform(GUN, 500);
    }
  }, [mine, perform]);

  useEffect(() => {
    if (!cellar || Date.now() - cellar.firedAt > STALE_MS) return;
    return perform(CELLAR, 600);
  }, [cellar, perform]);

  return null;
}
