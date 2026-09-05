import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { net } from '../net';
import { roomUrl } from '../routing';
import { animalName } from './names';
import duality from '../../../content/duality.json';
import './lobby.css';

// The only content file we have. Its own `topic` field labels the option, so
// the label cannot drift from what actually gets sent to start_game.
const BUNDLED_CONTENT = duality;

type TopicMode = 'scan' | 'enter' | 'fixed';

export interface LobbyProps {
  /** Bump this to re-render; the lobby reads live data from net on each pass. */
  version: number;
}

export function Lobby({ version }: LobbyProps) {
  void version;

  const room = net.room();
  const players = net.players();
  const isHost = net.isHost();
  const me = net.identity();

  const url = useMemo(() => (room.code ? roomUrl(room.code) : ''), [room.code]);
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<TopicMode>('fixed');
  const [typedTopic, setTypedTopic] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!url) return;
    let live = true;
    QRCode.toDataURL(url, { margin: 1, width: 336 })
      .then(dataUrl => {
        if (live) setQr(dataUrl);
      })
      .catch(() => {
        if (live) setQr('');
      });
    return () => {
      live = false;
    };
  }, [url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  const start = () => {
    setStarting(true);
    net.callReducer('startGame', JSON.stringify(BUNDLED_CONTENT));
  };

  return (
    <div className="lobby">
      <div>
        <h2>Room {room.code || '...'}</h2>
        <div className="lobby-card">
          <div className="lobby-url">{url || 'connecting...'}</div>
          <button type="button" onClick={copy} disabled={!url}>
            {copied ? 'Copied' : 'Copy link'}
          </button>
          {qr && <img className="lobby-qr" src={qr} alt={`QR code for ${url}`} />}
        </div>
      </div>

      <div>
        <h2>
          Players ({players.length})
        </h2>
        <div className="lobby-card">
          <ul className="lobby-players">
            {players.map(player => (
              <li className="lobby-player" key={player.identity}>
                <span
                  className="lobby-dot"
                  style={{ background: player.color }}
                  data-offline={!player.connected}
                />
                <span>
                  {player.name || animalName(player.identity)}
                  {player.identity === me ? ' (you)' : ''}
                </span>
                {player.identity === me && isHost && <span className="lobby-badge">Host</span>}
              </li>
            ))}
            {players.length === 0 && <li className="lobby-note">waiting for players to join</li>}
          </ul>
        </div>
      </div>

      {isHost ? (
        <>
          <div>
            <h2>Topic</h2>
            <div className="lobby-card">
              <label className="lobby-option" data-disabled="true">
                <input type="radio" name="topic" disabled checked={mode === 'scan'} readOnly />
                <span>
                  Scan topic
                  <p className="lobby-note">Not wired yet.</p>
                </span>
              </label>

              <label className="lobby-option">
                <input
                  type="radio"
                  name="topic"
                  checked={mode === 'enter'}
                  onChange={() => setMode('enter')}
                />
                <span style={{ flex: 1 }}>
                  Enter topic
                  <input
                    className="lobby-topic-field"
                    value={typedTopic}
                    placeholder="e.g. Newton's laws"
                    onChange={event => setTypedTopic(event.target.value)}
                    onFocus={() => setMode('enter')}
                  />
                  <p className="lobby-note">
                    Needs content generation, which is not wired yet.
                  </p>
                </span>
              </label>

              <label className="lobby-option">
                <input
                  type="radio"
                  name="topic"
                  checked={mode === 'fixed'}
                  onChange={() => setMode('fixed')}
                />
                <span>
                  Fixed topic: {BUNDLED_CONTENT.topic}
                  <p className="lobby-note">
                    The bundled content file. The only option wired end to end.
                  </p>
                </span>
              </label>
            </div>
          </div>

          <button
            type="button"
            className="lobby-start"
            onClick={start}
            disabled={mode !== 'fixed' || starting || !room.code}
          >
            {starting ? 'Starting...' : 'Start game'}
          </button>
        </>
      ) : (
        <div className="lobby-card lobby-waiting">waiting for host</div>
      )}
    </div>
  );
}

export default Lobby;
