// The thread between the three worlds.
//
// Each world signals it is finished by firing a database event that everybody
// already receives. This watches for that event, offers the portal, and any
// player who takes it moves the whole party: the phase lives on the room, so
// nobody is left behind in the previous world.

import { useEffect, useState } from 'react';
import { net } from '../net';
import { useWorld, APPLE_EVENT, CELLAR_OPEN } from './world1/store';
import { readCombat } from './world3/combat';
import './journey.css';

const DONE_EVENT: Record<number, string> = {
  1: APPLE_EVENT,
  2: CELLAR_OPEN,
};

const NEXT_LABEL: Record<number, string> = {
  1: "TO NEWTON'S STUDY",
  2: 'TO THE GIANT APPLE',
  3: 'FINISH',
};

export function Journey({ world }: { world: 1 | 2 | 3 }) {
  const events = useWorld(s => s.events);
  const [going, setGoing] = useState(false);
  const [tick, setTick] = useState(0);

  // World 3 finishes on the boss dying, which is combat state rather than a
  // database event, so poll it. Cheap, and only while World 3 is mounted.
  useEffect(() => {
    if (world !== 3) return;
    const id = window.setInterval(() => setTick(t => t + 1), 400);
    return () => window.clearInterval(id);
  }, [world]);
  void tick;

  const ready =
    world === 3 ? readCombat().down : Boolean(events[DONE_EVENT[world]]);

  useEffect(() => {
    setGoing(false);
  }, [world]);

  if (!ready) return null;

  return (
    <div className="journey">
      <button
        type="button"
        className="journey-go"
        disabled={going}
        onPointerDown={e => {
          e.stopPropagation();
          setGoing(true);
          net.callReducer('advanceWorld', world + 1);
        }}
      >
        {going ? 'GOING…' : NEXT_LABEL[world]}
      </button>
      <span className="journey-note">everyone travels together</span>
    </div>
  );
}

export default Journey;
