// The Newton game: the meadow, then the study. This owns the one database
// connection and the cut between the two, so neither world has to know the
// other exists.

import { useEffect, useRef, useState } from 'react';
import World1 from './World1';
import World2 from './World2';
import { connectWorld } from './world1/sync';
import { STUDY_ENTERED, useWorld, type CameraMode } from './world1/store';
import { local } from './world1/local';

/** How long the screen stays black between the two worlds. A cut, not a fade. */
const BLACK_MS = 1000;
/** Older than this and the party is long since inside; skip the cut. */
const CUT_STALE_MS = 20000;

export interface NewtonGameProps {
  roomCode: string;
  name?: string;
  resetOnEntry?: boolean;
  forcedCamera?: CameraMode | null;
}

export default function NewtonGame({
  roomCode,
  name = '',
  resetOnEntry = false,
  forcedCamera = null,
}: NewtonGameProps) {
  // The connection is keyed on the room and nothing else. The display name
  // arrives a moment after the lobby connects, and reconnecting because a
  // prop changed would abort a socket that is still opening.
  const latest = useRef({ name, resetOnEntry });
  latest.current = { name, resetOnEntry };
  useEffect(
    () => connectWorld({ roomCode, name: latest.current.name, reset: latest.current.resetOnEntry }),
    [roomCode]
  );

  useEffect(() => {
    if (forcedCamera) useWorld.getState().setCameraMode(forcedCamera);
  }, [forcedCamera]);

  const entered = useWorld(s => s.events[STUDY_ENTERED]);
  const [where, setWhere] = useState<'meadow' | 'black' | 'study'>('meadow');

  useEffect(() => {
    if (!entered) {
      setWhere('meadow');
      return;
    }
    if (Date.now() - entered.firedAt > CUT_STALE_MS) {
      setWhere('study');
      return;
    }
    // The study places everyone itself, so forget where you stood outside.
    local.spawned = false;
    setWhere('black');
    const id = window.setTimeout(() => setWhere('study'), BLACK_MS);
    return () => window.clearTimeout(id);
  }, [entered]);

  return (
    <>
      {where === 'study' ? (
        <World2 />
      ) : (
        <World1 roomCode={roomCode} name={name} forcedCamera={forcedCamera} />
      )}
      {where === 'black' && <div className="blackout" />}
    </>
  );
}
