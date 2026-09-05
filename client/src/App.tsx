import { useEffect, useRef, useState } from 'react';
import { net, useNet } from './net';
import { useRoute, replaceWithRoom } from './routing';
import { animalName } from './lobby/names';
import Lobby from './lobby/Lobby';
import World1 from './game/World1';
import './app-shell.css';

// Query flags the game reads on top of Juan's /r/CODE routing. Both are demo
// conveniences: ?reset=1 replays the apple, ?cam=first|third forces a camera.
function gameFlags() {
  const params = new URLSearchParams(window.location.search);
  const cam = params.get('cam');
  return {
    reset: params.get('reset') === '1',
    cam: cam === 'first' ? ('first' as const) : cam === 'third' ? ('third' as const) : null,
    // ?world=1 skips the lobby and drops straight into the meadow. Testing only.
    world: params.get('world') === '1',
  };
}

const flags = gameFlags();

export default function App() {
  const route = useRoute();
  const [hostError, setHostError] = useState<Error | null>(null);

  // "/" creates a room and swaps the URL for /r/CODE. net.createRoom is
  // idempotent, so StrictMode's second mount reuses the first room.
  useEffect(() => {
    if (route.kind !== 'host') return;
    let live = true;
    net
      .createRoom()
      .then(code => {
        if (live) replaceWithRoom(code);
      })
      .catch((err: unknown) => {
        if (live) setHostError(err instanceof Error ? err : new Error(String(err)));
      });
    return () => {
      live = false;
    };
  }, [route.kind]);

  const code = route.kind === 'room' ? route.code : null;
  const { status, error, version } = useNet(code);

  // Join once the subscription is live. join_room is idempotent server-side:
  // an identity that already has a row is reconnected, never duplicated.
  useEffect(() => {
    if (!code || status !== 'connected' || flags.world) return;
    let live = true;
    net.connect(code).then(() => {
      if (live) net.callReducer('joinRoom', code, animalName(net.identity()));
    });
    return () => {
      live = false;
    };
  }, [code, status]);

  // Once the room row has been seen, its disappearance means the host
  // disbanded. Before that it just means the subscription has not landed yet.
  const hasRoom = net.hasRoom();
  const everHadRoom = useRef(false);
  if (hasRoom) everHadRoom.current = true;
  const disbanded = everHadRoom.current && !hasRoom;

  // Straight into World 1, no lobby, no join on Juan's side. The world's own
  // enter_world creates the room if it does not exist yet.
  if (code && flags.world) {
    return (
      <World1
        roomCode={code}
        name={animalName(net.identity())}
        resetOnEntry={flags.reset}
        forcedCamera={flags.cam}
      />
    );
  }

  const failure = hostError ?? error;
  if (failure) {
    return (
      <div className="app-message">
        <h1>Could not connect</h1>
        <p>{failure.message}</p>
      </div>
    );
  }

  if (disbanded) {
    return (
      <div className="app-message">
        <h1>Party disbanded</h1>
        <p>The host ended this party.</p>
        <button type="button" className="app-button" onClick={() => (window.location.href = '/')}>
          Start a new party
        </button>
      </div>
    );
  }

  if (!code || status !== 'connected') {
    return <div className="app-message">connecting...</div>;
  }

  // Everyone watches phase and transitions together. The lobby hands off as
  // soon as phase leaves 'lobby'; which world it is, is the game's business.
  // For now every phase past the lobby is World 1.
  if (net.room().phase === 'lobby') return <Lobby version={version} />;
  return (
    <World1
      roomCode={code}
      name={animalName(net.identity())}
      resetOnEntry={flags.reset}
      forcedCamera={flags.cam}
    />
  );
}
