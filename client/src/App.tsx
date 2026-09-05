import { useEffect, useRef, useState } from 'react';
import { net, useNet } from './net';
import { useRoute, replaceWithRoom } from './routing';
import { animalName } from './lobby/names';
import Lobby from './lobby/Lobby';
import World1 from './game/World1';
import World3 from './game/World3';
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
  const [launching, setLaunching] = useState(false);
  const [homeView, setHomeView] = useState<'home' | 'games'>('home');

  // The title screen deliberately creates nothing until the player presses
  // play. Once requested, createRoom is idempotent under StrictMode.
  useEffect(() => {
    if (route.kind !== 'host' || !launching) return;
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
  }, [route.kind, launching]);

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

  if (route.kind === 'host' && !launching) {
    return (
      <main className="title-screen">
        <div className="title-orbit title-orbit--one" aria-hidden="true" />
        <div className="title-orbit title-orbit--two" aria-hidden="true" />
        <section className="title-card" aria-labelledby="game-title">
          <h1 id="game-title">Hacky</h1>
          {homeView === 'home' ? (
            <>
              <p className="title-copy">Learning games made to play with your people.</p>
              <button type="button" className="title-play" onClick={() => setHomeView('games')}>
                See current games
              </button>
              <p className="title-note">More ways to start are coming soon</p>
            </>
          ) : (
            <div className="games-panel" aria-label="Current games">
              <button type="button" className="back-button" onClick={() => setHomeView('home')}>
                Back
              </button>
              <p className="title-kicker">Current games</p>
              <button type="button" className="game-choice" onClick={() => setLaunching(true)}>
                <span className="game-choice-art" aria-hidden="true"><i /></span>
                <span><strong>Newton’s Apple</strong><small>Explore Newton’s laws together</small></span>
                <b>Play</b>
              </button>
            </div>
          )}
        </section>
      </main>
    );
  }

  if (!code || status !== 'connected') {
    return <div className="app-message">Opening your party…</div>;
  }

  // Everyone watches phase and transitions together. The lobby hands off as
  // soon as phase leaves 'lobby'; which world it is, is the game's business.
  // For now every phase past the lobby is World 1.
  if (net.room().phase === 'lobby') return <Lobby version={version} />;
  if (net.room().phase === 'world3') return <World3 version={version} />;
  return (
    <World1
      roomCode={code}
      name={animalName(net.identity())}
      resetOnEntry={flags.reset}
      forcedCamera={flags.cam}
    />
  );
}
