// The landing page. Split layout: what it is on the left, what it looks like
// on the right. On a phone the preview goes underneath and the call to action
// stays above the fold.

import { useEffect, useState } from 'react';
import './landing.css';

const SHOTS: { caption: string; art: 'orchard' | 'study' | 'apple' }[] = [
  { caption: 'Meet Newton. He is not having a good day.', art: 'orchard' },
  { caption: 'He hands you the three laws, one at a time.', art: 'study' },
  { caption: 'Then something enormous falls on the party.', art: 'apple' },
];

function Art({ kind }: { kind: string }) {
  // A real frame from the game. The other two are still drawn until I can
  // capture them cleanly.
  if (kind === 'orchard') {
    return <img className="shot-img" src="/shots/orchard.jpg" alt="Newton under the tree in World 1" />;
  }
  if (kind === 'orchard-drawn') {
    return (
      <svg viewBox="0 0 320 200" className="shot-svg" aria-hidden="true">
        <rect width="320" height="200" fill="#ffd79b" />
        <rect y="120" width="320" height="80" fill="#5cc24a" />
        <ellipse cx="96" cy="150" rx="70" ry="10" fill="#4fae45" />
        <rect x="150" y="70" width="16" height="60" fill="#7a4a2a" stroke="#111" strokeWidth="3" />
        <circle cx="158" cy="58" r="42" fill="#3fae3a" stroke="#111" strokeWidth="3" />
        <circle cx="196" cy="76" r="26" fill="#4bbd44" stroke="#111" strokeWidth="3" />
        <circle cx="122" cy="78" r="24" fill="#36a233" stroke="#111" strokeWidth="3" />
        <circle cx="176" cy="96" r="7" fill="#ff4d4d" stroke="#111" strokeWidth="3" />
        {/* kid */}
        <g>
          <rect x="80" y="112" width="22" height="26" rx="3" fill="#b06cff" stroke="#111" strokeWidth="3" />
          <circle cx="91" cy="100" r="14" fill="#ffd6b0" stroke="#111" strokeWidth="3" />
          <path d="M83 90 l5 -12 l4 10 l5 -12 l4 14 z" fill="#ff8c3a" stroke="#111" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="87" cy="101" r="2.5" fill="#111" />
          <circle cx="96" cy="101" r="2.5" fill="#111" />
        </g>
      </svg>
    );
  }
  if (kind === 'study') {
    return (
      <svg viewBox="0 0 320 200" className="shot-svg" aria-hidden="true">
        <rect width="320" height="200" fill="#2a1f18" />
        <rect y="140" width="320" height="60" fill="#7a4a2a" />
        <rect x="180" y="112" width="120" height="12" fill="#8a5a30" stroke="#111" strokeWidth="3" />
        <rect x="196" y="124" width="10" height="24" fill="#5a3a1e" />
        <rect x="274" y="124" width="10" height="24" fill="#5a3a1e" />
        <rect x="214" y="92" width="8" height="20" fill="#fff8e7" stroke="#111" strokeWidth="2" />
        <circle cx="218" cy="88" r="6" fill="#ffb03a" />
        {/* newton */}
        <g>
          <rect x="96" y="96" width="30" height="44" rx="4" fill="#5b6b8f" stroke="#111" strokeWidth="3" />
          <circle cx="111" cy="80" r="16" fill="#ffd6b0" stroke="#111" strokeWidth="3" />
          <path d="M95 74 q16 -20 32 0 q-16 -8 -32 0z" fill="#8a6a4a" stroke="#111" strokeWidth="3" />
          <circle cx="106" cy="81" r="2.5" fill="#111" />
          <circle cx="116" cy="81" r="2.5" fill="#111" />
          <rect x="126" y="104" width="22" height="10" rx="2" fill="#3a4a6e" stroke="#111" strokeWidth="3" />
        </g>
        <rect x="34" y="86" width="42" height="54" rx="5" fill="#3aa0ff" stroke="#111" strokeWidth="3" />
        <rect x="30" y="106" width="50" height="8" fill="#111" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 320 200" className="shot-svg" aria-hidden="true">
      <rect width="320" height="200" fill="#2a1020" />
      <rect y="132" width="320" height="68" fill="#6b4152" />
      <rect y="126" width="320" height="8" fill="#ff5a1f" />
      <polygon points="16,132 44,84 72,132" fill="#3d2434" />
      <polygon points="252,132 286,72 320,132" fill="#3d2434" />
      <polygon points="278,80 286,72 294,80" fill="#ffb02e" />
      {/* the apple */}
      <g>
        <circle cx="200" cy="86" r="52" fill="#ff4d4d" stroke="#111" strokeWidth="4" />
        <rect x="196" y="30" width="8" height="16" fill="#5a3a1e" stroke="#111" strokeWidth="3" />
        <ellipse cx="218" cy="34" rx="16" ry="6" fill="#4be36b" stroke="#111" strokeWidth="3" />
        <rect x="170" y="62" width="24" height="7" rx="2" fill="#111" transform="rotate(-22 182 65)" />
        <rect x="208" y="62" width="24" height="7" rx="2" fill="#111" transform="rotate(22 220 65)" />
        <ellipse cx="182" cy="82" rx="9" ry="6" fill="#ffc72c" stroke="#111" strokeWidth="3" />
        <ellipse cx="220" cy="82" rx="9" ry="6" fill="#ffc72c" stroke="#111" strokeWidth="3" />
        <path d="M178 104 h44 v16 h-44z" fill="#2a2438" stroke="#111" strokeWidth="3" />
        <path d="M182 104 l4 8 l5 -8 l5 8 l5 -8 l5 8 l5 -8" fill="none" stroke="#fff8e7" strokeWidth="3" />
      </g>
      {/* kid, small, for scale */}
      <g>
        <rect x="66" y="120" width="18" height="22" rx="3" fill="#b06cff" stroke="#111" strokeWidth="3" />
        <circle cx="75" cy="110" r="11" fill="#ffd6b0" stroke="#111" strokeWidth="3" />
        <path d="M68 102 l4 -9 l3 8 l4 -9 l3 11z" fill="#ff8c3a" stroke="#111" strokeWidth="3" strokeLinejoin="round" />
        <rect x="84" y="116" width="18" height="5" fill="#d8dbe6" stroke="#111" strokeWidth="2" />
      </g>
    </svg>
  );
}

export interface LandingProps {
  onPlay: () => void;
}

export function Landing({ onPlay }: LandingProps) {
  const [shot, setShot] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setShot(s => (s + 1) % SHOTS.length), 3200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <main className="lp">
      <header className="lp-top">
        <span className="lp-mark">HACKY</span>
      </header>

      <div className="lp-grid">
        <section className="lp-left">
          <h1 className="lp-head">
            <span className="lp-head-a">Any topic</span>
            <span className="lp-head-b">you want to learn,</span>
            <span className="lp-head-c">playable.</span>
          </h1>

          <p className="lp-line">
            Turn the topic you want to learn into a game you want to play.
          </p>

          <p className="lp-meta"><i /> 5 MINUTES · ONE LINK · NO APP</p>

          {/* Three ways in. Scanning leads because that is the pitch; the
              preset games are the one that works today. */}
          <div className="lp-ways">
            <button type="button" className="lp-cta lp-cta--main" disabled>
              Scan your textbook
              <i>coming soon</i>
            </button>
            <button type="button" className="lp-cta lp-cta--live" onClick={onPlay}>
              See preset games
              <i>play now</i>
            </button>
            <button type="button" className="lp-cta" disabled>
              Type a topic
              <i>coming soon</i>
            </button>
          </div>
        </section>

        <section className="lp-right" aria-label="What the game looks like">
          <div className="lp-card">
            <div className="lp-shot">
              {SHOTS.map((s, i) => (
                <div key={s.art} className="lp-frame" data-on={i === shot}>
                  <Art kind={s.art} />
                </div>
              ))}
            </div>
            <div className="lp-cap">
              <p>{SHOTS[shot].caption}</p>
              <div className="lp-dots">
                {SHOTS.map((s, i) => (
                  <span key={s.art} data-on={i === shot} />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Landing;
