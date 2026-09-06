// The lobby, in World 1's visual language: paper panels on the meadow sky,
// 3px ink borders, hard offset shadows, Bangers for anything shouted.
// Fonts come from index.html; the palette comes from Ean's palette.ts so the
// two screens cannot drift apart.

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { net } from '../net';
import { roomUrl } from '../routing';
import { animalName } from './names';
import { Avatars } from './Avatars';
import content from '../../../content/newton.json';
import './lobby.css';

// content/newton.json is the contract: the filename is fixed, the contents are
// Ean's. The option label reads the file's own topic so it cannot drift from
// what actually gets sent to start_game.
const BUNDLED_CONTENT = content;

export interface LobbyProps {
  /** Stage demo: Start goes straight to the boss. */
  demo?: boolean;
  /** Bump to re-render; the lobby reads live data from net on each pass. */
  version: number;
}

export function Lobby({ version, demo = false }: LobbyProps) {
  void version;

  const room = net.room();
  const players = net.players();
  const isHost = net.isHost();
  const me = net.identity();

  // Keep the demo flag in the invite link and QR: everyone who scans has to
  // land in the same two-screen demo, not the full journey.
  const url = useMemo(
    () => (room.code ? roomUrl(room.code) + (demo ? '?demo=1' : '') : ''),
    [room.code, demo]
  );
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!url) return;
    let live = true;
    QRCode.toDataURL(url, {
      margin: 1,
      width: 320,
      color: { dark: '#111111', light: '#fff8e7' },
    })
      .then(dataUrl => live && setQr(dataUrl))
      .catch(() => live && setQr(''));
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
    if (demo) {
      // advance_world takes any player, unlike start_game which insists on
      // being the host. So the demo never depends on the server agreeing
      // about who owns the party.
      net.callReducer('advanceWorld', 3);
      return;
    }
    net.callReducer('startGame', JSON.stringify(BUNDLED_CONTENT));
  };

  const ordered = [...players].sort((a, b) => a.identity.localeCompare(b.identity));

  return (
    <div className="lobby">
      <button
        type="button"
        className="lobby-disband"
        onClick={() => {
          net.callReducer(isHost ? 'disbandRoom' : 'leaveRoom');
          // Either way you land back on the home screen, not in a party.
          window.setTimeout(() => {
            window.location.href = '/';
          }, 150);
        }}
      >
        {isHost ? 'Disband' : 'Leave'}
      </button>

      <div className="lobby-top">
        <div className="panel lobby-code-panel">
          <span className="kicker">Your party code</span>
          <div className="lobby-code">{room.code || '······'}</div>
          <button type="button" className="btn btn-gold lobby-copy" onClick={copy} disabled={!url}>
            {copied ? 'Link copied!' : 'Invite friends'}
          </button>
        </div>
        <div className="panel lobby-qr-panel">
          {qr ? <img src={qr} alt={`QR code for ${url}`} /> : <div className="lobby-qr-wait" />}
        </div>
      </div>

      <div className="panel lobby-party">
        <div className="lobby-party-heading">
          <span className="kicker">The orchard crew</span>
          <b>{players.length} {players.length === 1 ? 'player' : 'players'}</b>
        </div>
        <div className="lobby-stage">
          {ordered.length > 0 ? (
            <Avatars players={ordered.map(p => ({ identity: p.identity, connected: p.connected }))} />
          ) : (
            <p className="lobby-empty">waiting for friends…</p>
          )}
        </div>
        <div className="lobby-names">
          {ordered.map(player => (
            <span key={player.identity} className="lobby-name" data-off={!player.connected}>
              {player.name || animalName(player.identity)}
              {player.identity === me && <i className="tag">you</i>}
              {player.identity === me && isHost && <i className="tag tag-host">host</i>}
            </span>
          ))}
        </div>
      </div>

      {isHost ? (
        <>
          <div className="panel lobby-mission">
            <span className="kicker">Tonight’s expedition</span>
            <strong>{BUNDLED_CONTENT.topic}</strong>
            <p>Meet Newton beneath the tree, then learn the laws by playing together.</p>
          </div>

          <button
            type="button"
            className="btn btn-gold lobby-start"
            onClick={start}
            disabled={starting || !room.code}
          >
            {starting ? 'Opening the orchard…' : demo ? 'Start the boss battle' : 'Start the adventure'}
          </button>
        </>
      ) : (
        <div className="panel lobby-waiting">waiting for host</div>
      )}
    </div>
  );
}

export default Lobby;
