// Admin view: who got on, and how far they got.
//
// Counts are by distinct player, not by row, so a refresh or a replay does not
// inflate them. Reached-world numbers are cumulative: anyone who finished also
// counts as having reached World 3.

import { useEffect, useState } from 'react';
import { net, useNet } from '../net';
import './admin.css';

const ORDER = ['joined', 'world1', 'world2', 'world3', 'finished'] as const;
const LABEL: Record<string, string> = {
  joined: 'Got on',
  world1: 'Reached World 1',
  world2: 'Reached World 2',
  world3: 'Reached World 3',
  finished: 'Finished',
};

export function Admin() {
  const { status, version } = useNet('ADMIN0');
  void version;
  const [, bump] = useState(0);

  useEffect(() => {
    if (status !== 'connected') return;
    net.watchRunEvents();
    const id = window.setInterval(() => bump(n => n + 1), 1500);
    return () => window.clearInterval(id);
  }, [status]);

  const events = net.runEvents();

  // Distinct players per milestone.
  const byKind = new Map<string, Set<string>>();
  const people = new Map<string, { name: string; furthest: string; last: number; room: string }>();
  for (const e of events) {
    if (!byKind.has(e.kind)) byKind.set(e.kind, new Set());
    byKind.get(e.kind)!.add(e.identity);

    const rank = ORDER.indexOf(e.kind as (typeof ORDER)[number]);
    const cur = people.get(e.identity);
    const curRank = cur ? ORDER.indexOf(cur.furthest as (typeof ORDER)[number]) : -1;
    people.set(e.identity, {
      name: e.name || cur?.name || 'anon',
      furthest: rank > curRank ? e.kind : (cur?.furthest ?? e.kind),
      last: Math.max(cur?.last ?? 0, e.at),
      room: e.room || cur?.room || '',
    });
  }

  const count = (kind: string) => byKind.get(kind)?.size ?? 0;
  const got = count('joined');
  const done = count('finished');
  const rows = [...people.entries()].sort((a, b) => b[1].last - a[1].last);

  return (
    <div className="admin">
      <h1>hacky · who played</h1>
      {status !== 'connected' && <p className="admin-note">connecting…</p>}

      <div className="admin-cards">
        <div className="admin-card admin-big">
          <b>{got}</b>
          <span>got on the game</span>
        </div>
        <div className="admin-card admin-big">
          <b>{done}</b>
          <span>finished it</span>
        </div>
        <div className="admin-card">
          <b>{got ? Math.round((done / got) * 100) : 0}%</b>
          <span>completion</span>
        </div>
      </div>

      <div className="admin-funnel">
        {ORDER.map(k => (
          <div key={k} className="admin-step">
            <span className="admin-step-n">{count(k)}</span>
            <span className="admin-step-l">{LABEL[k]}</span>
            <div className="admin-bar">
              <div style={{ width: got ? `${(count(k) / got) * 100}%` : '0%' }} />
            </div>
          </div>
        ))}
      </div>

      <h2>{rows.length} players</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Got as far as</th>
            <th>Room</th>
            <th>Last seen</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([id, p]) => (
            <tr key={id} data-done={p.furthest === 'finished'}>
              <td>{p.name}</td>
              <td>{LABEL[p.furthest] ?? p.furthest}</td>
              <td className="admin-mono">{p.room}</td>
              <td>{p.last ? new Date(p.last).toLocaleString() : '—'}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="admin-empty">nobody yet</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Admin;
