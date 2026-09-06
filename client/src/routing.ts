// Two routes, no router library.
//   /          host: create a room, then replace the URL with /r/CODE
//   /r/:CODE   join that room, in any phase

import { useEffect, useState } from 'react';

export type Route = { kind: 'host' } | { kind: 'room'; code: string } | { kind: 'admin' };

export function parseRoute(pathname: string): Route {
  if (/^\/admin\/?$/.test(pathname)) return { kind: 'admin' };
  const match = /^\/r\/([A-Za-z0-9]{1,12})\/?$/.exec(pathname);
  if (match) return { kind: 'room', code: match[1].toUpperCase() };
  return { kind: 'host' };
}

export function roomUrl(code: string): string {
  return `${window.location.origin}/r/${code}`;
}

/** Host landing -> room URL, without adding a history entry to go back to. */
export function replaceWithRoom(code: string): void {
  // Keep the query: the demo link carries ?demo=1, and losing it on the
  // redirect would drop the host back into the full three-world journey.
  window.history.replaceState({}, '', `/r/${code}${window.location.search}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.pathname));
  useEffect(() => {
    const onPop = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return route;
}
