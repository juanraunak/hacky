// The sole SpacetimeDB boundary. The game layer imports from here and never
// touches the SDK or module_bindings directly.
//
// This is a STUB: fake data, final signatures. Every export below keeps its
// shape when the real connection lands, so the game layer will not change.

import duality from '../../../content/duality.json';

// Types mirror the generated bindings, which are camelCase on the client even
// though the module declares snake_case columns.
export interface Player {
  identity: string;
  name: string;
  color: string;
  x: number;
  y: number;
  tools: string[];
  connected: boolean;
}

export interface Monster {
  id: number;
  kind: string;
  x: number;
  y: number;
  hp: number;
}

export interface Room {
  code: string;
  topic: string;
  contentJson: string;
  phase: string;
}

// --- scaling ------------------------------------------------------------
// slotsPerPlayer = clamp(6 - floor(playerCount / 3), 2, 4)
// Two players carry nearly every tool; fifteen carry two each and have to
// specialise. Real assignment happens in joinRoom off room.content_json.

export function slotsPerPlayer(playerCount: number): number {
  return Math.min(4, Math.max(2, 6 - Math.floor(playerCount / 3)));
}

export function assignTools(
  toolIds: string[],
  playerIndex: number,
  playerCount: number
): string[] {
  const slots = Math.min(slotsPerPlayer(playerCount), toolIds.length);
  return Array.from(
    { length: slots },
    (_, i) => toolIds[(playerIndex + i) % toolIds.length]
  );
}

// --- fake state ---------------------------------------------------------

const MATRIX = duality.matrix as Record<string, Record<string, string>>;
const TOOL_IDS = duality.tools.map(tool => tool.id);
const STRONG_DAMAGE = 40;
const WEAK_DAMAGE = 10;

const LOCAL_IDENTITY = '0xfakelocal00000000000000000000000000000000000000000000000000000';
const FAKE_PLAYER_COUNT = 3;

interface FakePlayer extends Player {
  driftPhase: number;
  driftRadius: number;
  baseX: number;
  baseY: number;
}

const players: FakePlayer[] = [
  { identity: LOCAL_IDENTITY, name: 'you', color: '#4363d8', baseX: -40, baseY: 10 },
  { identity: '0xfakeremote1', name: 'mira', color: '#3cb44b', baseX: 30, baseY: -25 },
  { identity: '0xfakeremote2', name: 'osk', color: '#f58231', baseX: 5, baseY: 45 },
].map((seed, i) => ({
  ...seed,
  x: seed.baseX,
  y: seed.baseY,
  tools: assignTools(TOOL_IDS, i, FAKE_PLAYER_COUNT),
  connected: true,
  driftPhase: (i * Math.PI * 2) / 3,
  driftRadius: 14 + i * 4,
}));

const monsters: Monster[] = [
  { id: 1, kind: 'photon', x: -70, y: -50, hp: 100 },
  { id: 2, kind: 'electron', x: 60, y: -40, hp: 100 },
  { id: 3, kind: 'buckyball', x: 80, y: 55, hp: 120 },
  { id: 4, kind: 'water_wave', x: -85, y: 60, hp: 80 },
  { id: 5, kind: 'decohered_beam', x: 0, y: -80, hp: 100 },
];

const room: Room = {
  code: 'HACKY7',
  topic: duality.topic,
  contentJson: JSON.stringify(duality),
  phase: 'playing',
};

// Set once setPosition is called, so the local player follows the thumbstick
// instead of drifting. Remote fakes keep drifting either way.
let localOverride: { x: number; y: number } | null = null;

const START = Date.now();

function damageFor(toolId: string, kind: string): number {
  switch (MATRIX[toolId]?.[kind]) {
    case 'strong':
      return STRONG_DAMAGE;
    case 'weak':
      return WEAK_DAMAGE;
    default:
      return 0;
  }
}

// --- the boundary -------------------------------------------------------

export const net = {
  async connect(roomCode: string): Promise<void> {
    console.log('[net stub] connect', roomCode);
    room.code = roomCode || room.code;
    await new Promise(resolve => setTimeout(resolve, 150));
  },

  players(): Player[] {
    const t = (Date.now() - START) / 1000;
    return players.map(p => {
      const isLocal = p.identity === LOCAL_IDENTITY;
      if (isLocal && localOverride) {
        return { ...p, x: localOverride.x, y: localOverride.y };
      }
      return {
        ...p,
        x: p.baseX + Math.cos(t * 0.35 + p.driftPhase) * p.driftRadius,
        y: p.baseY + Math.sin(t * 0.27 + p.driftPhase) * p.driftRadius,
      };
    });
  },

  monsters(): Monster[] {
    return monsters.map(m => ({ ...m }));
  },

  room(): Room {
    return { ...room };
  },

  callReducer(name: string, ...args: unknown[]): void {
    console.log('[net stub] callReducer', name, args);

    switch (name) {
      case 'swing': {
        const [monsterId, toolId] = args as [number, string];
        const monster = monsters.find(m => m.id === monsterId);
        if (!monster) return;
        const damage = damageFor(toolId, monster.kind);
        monster.hp = Math.max(0, monster.hp - damage);
        console.log(
          `[net stub] ${toolId} vs ${monster.kind}: ` +
            `${MATRIX[toolId]?.[monster.kind] ?? 'missing'} -> -${damage} (hp ${monster.hp})`
        );
        return;
      }
      case 'setPosition': {
        const [x, y] = args as [number, number];
        localOverride = { x, y };
        return;
      }
      default:
        return;
    }
  },

  identity(): string {
    return LOCAL_IDENTITY;
  },
};

export default net;
