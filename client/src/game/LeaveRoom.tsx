// Leave the party from anywhere. Present in every world, not just the lobby,
// so you are never stuck inside a run you want out of.

import { useState } from 'react';
import { net } from '../net';
import { clearLaws, resetCombat } from './world3/combat';
import './leave.css';

export function LeaveRoom() {
  const [confirm, setConfirm] = useState(false);
  const host = net.isHost();

  // Only the party leader can pull everyone back. Anyone could otherwise end
  // a run the rest of the party is still enjoying.
  const toLobby = () => {
    resetCombat();
    clearLaws();
    net.callReducer('advanceWorld', 0);
    setConfirm(false);
    // Same as the end of a run: reload onto the clean room URL so the party
    // screen is the only thing that can come up.
    window.setTimeout(() => {
      window.location.href = window.location.pathname;
    }, 700);
  };

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
      <div className="leave-bar">
        {host && (
          <button
            type="button"
            className="lobby-btn"
            onPointerDown={e => {
              e.stopPropagation();
              toLobby();
            }}
          >
            TO LOBBY
          </button>
        )}
        <button type="button" className="leave-btn" onPointerDown={e => { e.stopPropagation(); setConfirm(true); }}>
          LEAVE
        </button>
      </div>
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
