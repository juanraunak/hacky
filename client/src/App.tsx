import { useEffect, useRef, useState } from 'react';
import { net, useNet } from './net';
import { useRoute, replaceWithRoom } from './routing';
import { NamePrompt } from './lobby/NamePrompt';
import { nameOr, readName } from './lobby/playerName';
import Lobby from './lobby/Lobby';
import NewtonGame from './game/NewtonGame';
import World2 from './game/World2';
import World3 from './game/World3';
import { Journey } from './game/Journey';
import { LeaveRoom } from './game/LeaveRoom';
import { Admin } from './admin/Admin';
import { clearLaws, resetCombat } from './game/world3/combat';
import { connectWorld } from './game/world1/sync';
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
    // ?world3=1 drops straight into the giant apple arena. Testing only.
    world3: params.get('world3') === '1',
    // ?world2=1 drops straight into Newton's study. Testing only.
    world2: params.get('world2') === '1',
  };
}

const flags = gameFlags();

export default function App() {
  const route = useRoute();

  // The admin view is its own thing: no party, no name, no game.
  if (route.kind === 'admin') return <Admin />;
  const [hostError, setHostError] = useState<Error | null>(null);
  const [launching, setLaunching] = useState(false);
  const [myName, setMyName] = useState<string | null>(() => readName());
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

  // World 2 relies on a connection the other worlds open. Landing straight in
  // it -- a refresh, or a late joiner -- would otherwise show an empty room.
  const livePhase = net.room().phase;
  useEffect(() => {
    // Only World 2: World 1 and World 3 open their own, and two connectWorld
    // calls would mean two sockets for one player.
    if (!code || status !== 'connected' || (livePhase !== 'world2' && !flags.world2)) return;
    return connectWorld({ roomCode: code, name: nameOr(net.identity()) });
  }, [code, status, livePhase]);

  // Join once the subscription is live. join_room is idempotent server-side:
  // an identity that already has a row is reconnected, never duplicated.
  useEffect(() => {
    if (!code || status !== 'connected' || flags.world || flags.world3 || flags.world2) return;
    let live = true;
    net.connect(code).then(() => {
      if (live) {
        const who0 = nameOr(net.identity());
        net.callReducer('joinRoom', code, who0);
        net.callReducer('logEvent', 'joined', who0);
      }
    });
    return () => {
      live = false;
    };
  }, [code, status]);

  // Once the room row has been seen, its disappearance means the host
  // disbanded. Before that it just means the subscription has not landed yet.
  const hasRoom = net.hasRoom();
  const everHadRoom = useRef(false);
  const reported = useRef('');
  if (hasRoom) everHadRoom.current = true;
  const disbanded = everHadRoom.current && !hasRoom;

  // Straight into World 1, no lobby, no join on Juan's side. The world's own
  // enter_world creates the room if it does not exist yet.
  // Test flags only apply while the room is still in the lobby; once the
  // party actually advances, the room's phase wins so transitions work.
  //
  // ...and only until the party has actually been somewhere. Finishing a run
  // sets the phase back to 'lobby', and a ?world= flag still in the URL then
  // pulled you straight back into that world -- beat the giant apple, land in
  // Newton's study. net.room() also reports 'lobby' before the row arrives,
  // so this covers a mid-run reload too.
  const everLeftLobby = useRef(false);
  if (livePhase && livePhase !== 'lobby') everLeftLobby.current = true;
  const flagOk = net.room().phase === 'lobby' && !everLeftLobby.current;

  if (code && flags.world2 && flagOk) {
    return (
      <>
        <World2 />
        <Journey world={2} />
        <LeaveRoom />
      </>
    );
  }

  if (code && flags.world3 && flagOk) {
    return (
      <World3 roomCode={code} name={nameOr(net.identity())} forcedCamera={flags.cam} />
    );
  }

  if (code && flags.world && flagOk) {
    return (
      <NewtonGame
        roomCode={code}
        name={nameOr(net.identity())}
        resetOnEntry={flags.reset}
        forcedCamera={flags.cam}
      />
    );
  }

  // Ask once, before any party is created or joined, so the name is yours and
  // not an animal we picked for you.
  if (!myName) {
    return <NamePrompt identity={net.identity()} onDone={setMyName} />;
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
              {/* One line, first: what this is. Everything else is detail. */}
              <p className="title-copy">Turn any topic you want to learn into a game.</p>

              {/* The playable thing leads. Putting the two unbuilt options
                  first made it read as though nothing worked yet -- the
                  opposite of the truth. */}
              <button type="button" className="title-play" onClick={() => setHomeView('games')}>
                Play now
              </button>
              <p className="title-under">a full game, ready to play with your friends</p>

              <ol className="title-how">
                <li>
                  <b>1</b>
                  <span>Pick a game, get a code.</span>
                </li>
                <li>
                  <b>2</b>
                  <span>Friends join on their own phones — no app, no login.</span>
                </li>
                <li>
                  <b>3</b>
                  <span>
                    Work out <em>what beats what</em> together. That is the lesson.
                  </span>
                </li>
              </ol>

              <p className="title-ways">More ways in, soon</p>
              <div className="title-soon-row">
                <button type="button" className="title-soon" disabled>
                  Scan your book
                </button>
                <button type="button" className="title-soon" disabled>
                  Type any topic
                </button>
              </div>
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
  const phase = net.room().phase;
  if (phase === 'lobby') return <Lobby version={version} />;

  const who = nameOr(net.identity());

  // Report the milestone once per phase, so the dashboard shows how far each
  // player actually got.
  if (phase && phase !== 'lobby' && reported.current !== phase) {
    reported.current = phase;
    net.callReducer('logEvent', phase === 'done' ? 'finished' : phase, who);
  }

  if (phase === 'done') {
    return (
      <div className="app-message done-screen">
        <h1>TOPIC COMPLETE</h1>
        <p>Newton's laws of motion — the orchard, the study, and the giant apple.</p>
        <div className="done-laws">
          <span><b>1st</b> inertia</span>
          <span><b>2nd</b> F = ma</span>
          <span><b>3rd</b> action / reaction</span>
        </div>
        <button
          type="button"
          className="app-button"
          onClick={() => {
            resetCombat();
            clearLaws();
            // Send the room back to the lobby for anyone still in it, then
            // leave for the title screen. A real navigation, not a phase
            // change: `flags` is read once at page load, so staying in the
            // room with a ?world= flag still in it landed you straight back
            // in that world the moment the phase became 'lobby'.
            net.callReducer('advanceWorld', 0);
            window.setTimeout(() => {
              window.location.href = '/';
            }, 400);
          }}
        >
          Back to the start
        </button>
      </div>
    );
  }

  if (phase === 'world2') {
    return (
      <>
        <World2 />
        <Journey world={2} />
        <LeaveRoom />
      </>
    );
  }

  if (phase === 'world3') {
    return (
      <>
        <World3 roomCode={code} name={who} forcedCamera={flags.cam} />
        <Journey world={3} />
        <LeaveRoom />
      </>
    );
  }
  return (
    <NewtonGame
      roomCode={code}
      name={nameOr(net.identity())}
      resetOnEntry={flags.reset}
      forcedCamera={flags.cam}
    />
  );
}
