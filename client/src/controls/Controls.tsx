// The sole input boundary. The game layer never touches touch or keyboard
// events; it receives a normalized vector and slot indices from here.
//
// Signature is final:
//   <Controls onInput={(vec) => ...} onAction={(slotIndex) => ...} />

import { useCallback, useEffect, useRef } from 'react';
import './controls.css';

export interface Vec {
  x: number;
  y: number;
}

export interface ControlsProps {
  /** Normalized direction, magnitude 0..1. Emitted on change, {0,0} on release. */
  onInput: (vec: Vec) => void;
  /** Action slot 0-3, matching the four buttons. */
  onAction: (slotIndex: number) => void;
}

const SLOTS = [0, 1, 2, 3];
const STICK_RADIUS = 52; // px of travel before the vector saturates at 1
const EPSILON = 0.001;

const MOVE_KEYS: Record<string, Vec> = {
  KeyW: { x: 0, y: -1 },
  ArrowUp: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  ArrowDown: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  ArrowLeft: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

const ACTION_KEYS: Record<string, number> = {
  Digit1: 0,
  Digit2: 1,
  Digit3: 2,
  Digit4: 3,
};

export function Controls({ onInput, onAction }: ControlsProps) {
  const nubRef = useRef<HTMLDivElement>(null);
  const lastSent = useRef<Vec>({ x: 0, y: 0 });
  const pointerId = useRef<number | null>(null);
  const pointerVec = useRef<Vec>({ x: 0, y: 0 });
  const heldKeys = useRef<Set<string>>(new Set());

  // Latest callbacks without re-subscribing the window listeners every render.
  const onInputRef = useRef(onInput);
  const onActionRef = useRef(onAction);
  onInputRef.current = onInput;
  onActionRef.current = onAction;

  const emit = useCallback((vec: Vec) => {
    const prev = lastSent.current;
    if (Math.abs(prev.x - vec.x) < EPSILON && Math.abs(prev.y - vec.y) < EPSILON) return;
    lastSent.current = vec;
    onInputRef.current(vec);
  }, []);

  const moveNub = useCallback((vec: Vec) => {
    const nub = nubRef.current;
    if (nub) {
      nub.style.transform = `translate(${vec.x * STICK_RADIUS}px, ${vec.y * STICK_RADIUS}px)`;
    }
  }, []);

  // Pointer wins while a finger is down; otherwise the keyboard drives.
  const recompute = useCallback(() => {
    if (pointerId.current !== null) {
      emit(pointerVec.current);
      moveNub(pointerVec.current);
      return;
    }
    let x = 0;
    let y = 0;
    for (const code of heldKeys.current) {
      const dir = MOVE_KEYS[code];
      if (dir) {
        x += dir.x;
        y += dir.y;
      }
    }
    const mag = Math.hypot(x, y);
    const vec = mag > 1 ? { x: x / mag, y: y / mag } : { x, y };
    emit(vec);
    moveNub(vec);
  }, [emit, moveNub]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (pointerId.current !== null) return;
      pointerId.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      pointerVec.current = { x: 0, y: 0 };
      recompute();
    },
    [recompute]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (pointerId.current !== event.pointerId) return;
      const box = event.currentTarget.getBoundingClientRect();
      const dx = event.clientX - (box.left + box.width / 2);
      const dy = event.clientY - (box.top + box.height / 2);
      const dist = Math.hypot(dx, dy);
      const scale = dist > STICK_RADIUS ? STICK_RADIUS / dist : 1;
      pointerVec.current = {
        x: (dx * scale) / STICK_RADIUS,
        y: (dy * scale) / STICK_RADIUS,
      };
      recompute();
    },
    [recompute]
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (pointerId.current !== event.pointerId) return;
      pointerId.current = null;
      pointerVec.current = { x: 0, y: 0 };
      recompute();
    },
    [recompute]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const slot = ACTION_KEYS[event.code];
      if (slot !== undefined) {
        event.preventDefault();
        onActionRef.current(slot);
        return;
      }
      if (!MOVE_KEYS[event.code]) return;
      event.preventDefault(); // arrows would otherwise scroll
      heldKeys.current.add(event.code);
      recompute();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (!heldKeys.current.delete(event.code)) return;
      recompute();
    };

    // Releasing a key while the tab is hidden never fires keyup.
    const onBlur = () => {
      heldKeys.current.clear();
      recompute();
    };

    // Safari ignores touch-action for pinch; these are the only way to stop it.
    const swallow = (event: Event) => event.preventDefault();

    // Scope the fullscreen scroll lock to this component's lifetime.
    document.documentElement.classList.add('controls-locked');

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('gesturestart', swallow);
    document.addEventListener('gesturechange', swallow);
    // Non-passive, or preventDefault is ignored and the page still scrolls.
    document.addEventListener('touchmove', swallow, { passive: false });
    document.addEventListener('contextmenu', swallow);

    return () => {
      document.documentElement.classList.remove('controls-locked');
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('gesturestart', swallow);
      document.removeEventListener('gesturechange', swallow);
      document.removeEventListener('touchmove', swallow);
      document.removeEventListener('contextmenu', swallow);
    };
  }, [recompute]);

  return (
    <div className="controls-root">
      <div
        className="controls-stick"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="controls-nub" ref={nubRef} />
      </div>

      <div className="controls-pad">
        {SLOTS.map(slot => (
          <button
            key={slot}
            type="button"
            className="controls-button"
            onPointerDown={event => {
              event.preventDefault();
              onAction(slot);
            }}
          >
            {slot + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

export default Controls;
