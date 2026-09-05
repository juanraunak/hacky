import { useEffect, useState } from 'react';
import { net, useNet } from './net';
import { useRoute, replaceWithRoom } from './routing';
import { animalName } from './lobby/names';
import Lobby from './lobby/Lobby';
import GameView from './placeholder/GameView';
import './app-shell.css';

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
    if (!code || status !== 'connected') return;
    let live = true;
    net.connect(code).then(() => {
      if (live) net.callReducer('joinRoom', code, animalName(net.identity()));
    });
    return () => {
      live = false;
    };
  }, [code, status]);

  const failure = hostError ?? error;
  if (failure) {
    return (
      <div className="app-message">
        <h1>Could not connect</h1>
        <p>{failure.message}</p>
      </div>
    );
  }

  if (!code || status !== 'connected') {
    return <div className="app-message">connecting...</div>;
  }

  // Everyone watches phase and transitions together. The lobby hands off as
  // soon as phase leaves 'lobby'; which world it is, is the game's business.
  return net.room().phase === 'lobby' ? <Lobby version={version} /> : <GameView />;
}
