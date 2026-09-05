// THROWAWAY. Ean replaces this entirely with /client/src/game.
// It exists to prove the party layer works: everyone sees everyone move.
//
// Rules it demonstrates, which the real view should keep:
//   - the local player moves on input, never waiting for the round trip
//   - set_position is sent at most 15Hz, and only when the position changed
//   - remote players are smoothed between updates; no prediction, no rollback

import { useEffect, useRef } from 'react';
import { net } from '../net';
import { Controls } from '../controls/Controls';
import './game-view.css';

const WORLD = 320; // world units across
const HALF = WORLD / 2;
const BOUND = HALF - 10;
const SPEED = 90; // units per second
const SEND_INTERVAL = 1000 / 15;
const SEND_EPSILON = 0.5; // world units
const SMOOTHING = 12; // higher converges faster on the server position

export function GameView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const input = useRef({ x: 0, y: 0 });
  const local = useRef<{ x: number; y: number } | null>(null);
  const rendered = useRef(new Map<string, { x: number; y: number }>());
  const lastSent = useRef({ x: 0, y: 0, at: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let previous = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const dt = Math.min((now - previous) / 1000, 0.05);
      previous = now;

      const me = net.identity();
      const players = net.players();
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const scale = Math.min(width, height) / WORLD;
      const originX = width / 2;
      const originY = height / 2;

      // Local player: move immediately from input, then reconcile nothing.
      const server = players.find(p => p.identity === me);
      if (local.current === null && server) {
        local.current = { x: server.x, y: server.y };
      }
      if (local.current) {
        const vec = input.current;
        if (vec.x !== 0 || vec.y !== 0) {
          local.current.x = clamp(local.current.x + vec.x * SPEED * dt, -BOUND, BOUND);
          local.current.y = clamp(local.current.y + vec.y * SPEED * dt, -BOUND, BOUND);
        }

        const moved =
          Math.abs(local.current.x - lastSent.current.x) > SEND_EPSILON ||
          Math.abs(local.current.y - lastSent.current.y) > SEND_EPSILON;
        if (moved && now - lastSent.current.at >= SEND_INTERVAL) {
          lastSent.current = { x: local.current.x, y: local.current.y, at: now };
          net.callReducer('setPosition', local.current.x, local.current.y);
        }
      }

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#10131a';
      ctx.fillRect(0, 0, width, height);

      // arena
      ctx.strokeStyle = '#28303f';
      ctx.lineWidth = 2;
      ctx.strokeRect(originX - HALF * scale, originY - HALF * scale, WORLD * scale, WORLD * scale);

      const seen = new Set<string>();
      for (const player of players) {
        seen.add(player.identity);
        const isMe = player.identity === me;

        let px: number;
        let py: number;
        if (isMe && local.current) {
          px = local.current.x;
          py = local.current.y;
        } else {
          // Smooth remote players toward their last known server position.
          const prev = rendered.current.get(player.identity) ?? { x: player.x, y: player.y };
          const k = Math.min(1, dt * SMOOTHING);
          prev.x += (player.x - prev.x) * k;
          prev.y += (player.y - prev.y) * k;
          rendered.current.set(player.identity, prev);
          px = prev.x;
          py = prev.y;
        }

        const sx = originX + px * scale;
        const sy = originY + py * scale;

        ctx.globalAlpha = player.connected ? 1 : 0.35;
        ctx.beginPath();
        ctx.arc(sx, sy, 14, 0, Math.PI * 2);
        ctx.fillStyle = player.color || '#888';
        ctx.fill();
        if (isMe) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#fff';
          ctx.stroke();
        }

        ctx.fillStyle = '#e8ecf4';
        ctx.font = '600 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(player.name || '?', sx, sy - 21);
        ctx.globalAlpha = 1;
      }

      for (const id of rendered.current.keys()) {
        if (!seen.has(id)) rendered.current.delete(id);
      }
    };

    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="game-view">
      <canvas ref={canvasRef} className="game-canvas" />
      <button
        type="button"
        className="game-disband"
        onClick={() => net.callReducer('disbandRoom')}
      >
        Disband
      </button>
      <Controls
        onInput={vec => {
          input.current = vec;
        }}
        onAction={slot => {
          const monsters = net.monsters();
          const me = net.players().find(p => p.identity === net.identity());
          const tool = me?.tools[slot];
          if (!tool || monsters.length === 0) {
            console.log('[game] action', slot, 'no tool or no monsters');
            return;
          }
          net.callReducer('swing', monsters[0].id, tool);
        }}
      />
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export default GameView;
