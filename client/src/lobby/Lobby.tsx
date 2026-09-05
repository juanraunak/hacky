import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { net } from '../net';
import { roomUrl } from '../routing';
import { animalName } from './names';
import content from '../../../content/newton.json';
import './lobby.css';

// content/newton.json is the contract: the filename is fixed, the contents are
// Ean's. It still holds the wave-particle placeholder until he rewrites it for
// Newton's laws. The option label reads the file's own `topic` field so it can
// never drift from what actually gets sent to start_game.
const BUNDLED_CONTENT = content;

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
  const [topicSaved, setTopicSaved] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (room.topic) setTypedTopic(current => current || room.topic);
  }, [room.topic]);

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

  // Persist the typed topic on blur or Enter. Start stays disabled for this
  // option: the field is real, generating content from it is not.
  const commitTopic = () => {
    const next = typedTopic.trim();
    if (!next || next === room.topic) return;
    net.callReducer('setTopic', next);
    setTopicSaved(true);
    setTimeout(() => setTopicSaved(false), 1400);
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
                    onBlur={commitTopic}
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        commitTopic();
                      }
                    }}
                  />
                  <p className="lobby-note">
                    {topicSaved
                      ? 'Saved.'
                      : room.topic
                        ? `Saved topic: ${room.topic}. Generating content from it is not wired yet.`
                        : 'Saved to the room on blur or Enter. Generating content from it is not wired yet.'}
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

      <button
        type="button"
        className="lobby-leave"
        onClick={() => {
          net.callReducer(isHost ? 'disbandRoom' : 'leaveRoom');
          if (!isHost) window.location.href = '/';
        }}
      >
        {isHost ? 'Disband party' : 'Leave party'}
      </button>
    </div>
  );
}

export default Lobby;
