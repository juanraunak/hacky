// Phone input. The thumb is the stick: drag anywhere on the left 45% of the
// screen to walk, on the right 55% to orbit. A tap (no drag) is an interaction
// and gets raycast into the world. A faint ring appears under the walking
// thumb while it is down and nowhere else.
//
// With a mouse (desktop third person) a drag orbits and a click is a tap.

import { useCallback, useEffect, useRef, useState } from 'react';
import { beginHold, endHold, input } from './local';

const STICK_RADIUS_PX = 64;
const TAP_MAX_MS = 260;
const TAP_MAX_PX = 10;
const MOVE_ZONE = 0.45;

interface Pointer {
  id: number;
  role: 'move' | 'look';
  x0: number;
  y0: number;
  x: number;
  y: number;
  t0: number;
  moved: boolean;
}

export function TouchInput() {
  const pointers = useRef<Map<number, Pointer>>(new Map());
  const [ring, setRing] = useState<{ x: number; y: number; nx: number; ny: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);

  const setMove = useCallback((p: Pointer | null) => {
    if (!p) {
      input.move.x = 0;
      input.move.y = 0;
      setRing(null);
      return;
    }
    let dx = p.x - p.x0;
    let dy = p.y - p.y0;
    const d = Math.hypot(dx, dy);
    if (d > STICK_RADIUS_PX) {
      dx = (dx / d) * STICK_RADIUS_PX;
      dy = (dy / d) * STICK_RADIUS_PX;
    }
    input.move.x = dx / STICK_RADIUS_PX;
    input.move.y = -dy / STICK_RADIUS_PX; // up on screen is forward
    setRing({ x: p.x0, y: p.y0, nx: dx, ny: dy });
  }, []);

  const onDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = root.current;
    if (!el) return;
    const isMouse = e.pointerType === 'mouse';
    if (isMouse && e.button !== 0) return;
    const w = el.clientWidth;
    let role: Pointer['role'] = 'look';
    if (!isMouse && e.clientX < w * MOVE_ZONE) role = 'move';
    // one pointer per role
    for (const p of pointers.current.values()) if (p.role === role) return;
    el.setPointerCapture(e.pointerId);
    const p: Pointer = {
      id: e.pointerId,
      role,
      x0: e.clientX,
      y0: e.clientY,
      x: e.clientX,
      y: e.clientY,
      t0: performance.now(),
      moved: false,
    };
    pointers.current.set(e.pointerId, p);
    if (role === 'move') setMove(p);
    else beginHold();
  }, [setMove]);

  const onMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointers.current.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (Math.hypot(p.x - p.x0, p.y - p.y0) > TAP_MAX_PX) p.moved = true;
    if (p.role === 'move') {
      setMove(p);
    } else {
      input.look.x += dx;
      input.look.y += dy;
    }
  }, [setMove]);

  const onUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointers.current.get(e.pointerId);
    if (!p) return;
    pointers.current.delete(e.pointerId);
    const el = root.current;
    if (el && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    if (p.role === 'move') setMove(null);
    else endHold();
    const quick = performance.now() - p.t0 < TAP_MAX_MS;
    if (!p.moved && quick && el) {
      input.taps.push({
        x: (p.x / el.clientWidth) * 2 - 1,
        y: -(p.y / el.clientHeight) * 2 + 1,
      });
    }
  }, [setMove]);

  useEffect(() => {
    // Safari ignores touch-action for pinch; these are the only way to stop it.
    const swallow = (event: Event) => event.preventDefault();
    document.addEventListener('gesturestart', swallow);
    document.addEventListener('gesturechange', swallow);
    document.addEventListener('touchmove', swallow, { passive: false });
    document.addEventListener('contextmenu', swallow);
    return () => {
      document.removeEventListener('gesturestart', swallow);
      document.removeEventListener('gesturechange', swallow);
      document.removeEventListener('touchmove', swallow);
      document.removeEventListener('contextmenu', swallow);
      input.move.x = 0;
      input.move.y = 0;
    };
  }, []);

  return (
    <div
      ref={root}
      className="touch-overlay"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {ring && (
        <div className="touch-ring" style={{ left: ring.x, top: ring.y }}>
          <div className="touch-nub" style={{ transform: `translate(${ring.nx}px, ${ring.ny}px)` }} />
        </div>
      )}
    </div>
  );
}
