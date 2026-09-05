// Leave the party from anywhere. Present in every world, not just the lobby,
// so you are never stuck inside a run you want out of.

import { useState } from 'react';
import { net } from '../net';
import './leave.css';

export function LeaveRoom() {
  const [confirm, setConfirm] = useState(false);

  const go = () => {
    // Tell the server, then leave regardless: a failed reducer must never
    // trap someone in a room.
    try {
      net.callReducer(net.isHost() ? 'disbandRoom' : 'leaveRoom');
    } catch {
      // ignore
    }
    window.setTimeout(() => {
      window.location.href = '/';
    }, 160);
  };

  if (!confirm) {
    return (
      <button type="button" className="leave-btn" onPointerDown={e => { e.stopPropagation(); setConfirm(true); }}>
        LEAVE
      </button>
    );
  }

  return (
    <div className="leave-ask">
      <span>Leave the party?</span>
      <button type="button" className="leave-yes" onPointerDown={e => { e.stopPropagation(); go(); }}>
        LEAVE
      </button>
      <button type="button" className="leave-no" onPointerDown={e => { e.stopPropagation(); setConfirm(false); }}>
        STAY
      </button>
    </div>
  );
}

export default LeaveRoom;
