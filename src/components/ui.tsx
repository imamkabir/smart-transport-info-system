import type { ReactNode } from 'react';
import { MODES, type Route } from '../data/network';
import { href } from '../router';

export function RouteBadge({ route, link = false }: { route: Route; link?: boolean }) {
  const badge = (
    <span className="badge" style={{ background: route.color }} title={`${route.code} ${route.name}`}>
      {route.code}
    </span>
  );
  return link ? <a href={href(`/routes/${route.id}`)}>{badge}</a> : badge;
}

export function ModeTag({ route }: { route: Route }) {
  return <span className="tag">{MODES[route.mode].label}</span>;
}

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="stars" aria-label={`${value.toFixed(1)} out of 5`} style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= Math.round(value) ? 'on' : ''} aria-hidden>
          ★
        </span>
      ))}
    </span>
  );
}

export function PageHeader({ title, lead, children }: { title: string; lead?: string; children?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {lead && <p className="lead">{lead}</p>}
      </div>
      {children}
    </header>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
