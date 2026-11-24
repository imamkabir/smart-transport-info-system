import { useMemo, useState } from 'react';
import { ALERTS, MODES, ROUTES, type Mode } from '../data/network';
import { loadFeedback, ratingsByRoute } from '../lib/feedback';
import { money } from '../lib/fares';
import { getStop, routeLengthKm } from '../lib/network';
import { serviceState } from '../lib/schedule';
import { nowMinutes } from '../lib/time';
import { href } from '../router';
import TransitMap from '../components/TransitMap';
import { ModeTag, PageHeader, RouteBadge, Stars } from '../components/ui';

export default function RoutesPage() {
  const [mode, setMode] = useState<Mode | 'all'>('all');
  const [query, setQuery] = useState('');
  const ratings = useMemo(() => ratingsByRoute(loadFeedback()), []);
  const now = nowMinutes();

  const q = query.trim().toLowerCase();
  const routes = ROUTES.filter((r) => mode === 'all' || r.mode === mode).filter(
    (r) =>
      !q ||
      r.code.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.stops.some((s) => getStop(s).name.toLowerCase().includes(q) || getStop(s).area.toLowerCase().includes(q)),
  );

  return (
    <div className="stack-lg">
      <PageHeader title="Routes" lead="Every route in the network, the stops it serves and how often it runs." />

      <TransitMap lines={routes.map((r) => ({ id: r.id, color: r.color, stops: r.stops }))} height={380} />

      <div className="filters">
        <input
          type="search"
          placeholder="Search by route, stop or area"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search routes"
        />
        <select value={mode} onChange={(e) => setMode(e.target.value as Mode | 'all')} aria-label="Filter by vehicle type">
          <option value="all">All vehicle types</option>
          {Object.entries(MODES).map(([id, m]) => (
            <option key={id} value={id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid">
        {routes.map((r) => {
          const state = serviceState(r, now);
          const rating = ratings.get(r.id);
          const alert = ALERTS.find((a) => a.routeId === r.id);
          return (
            <a key={r.id} className="card route-card" href={href(`/routes/${r.id}`)}>
              <div className="row between">
                <div className="row">
                  <RouteBadge route={r} />
                  <strong>{r.name}</strong>
                </div>
                <span className={`status ${state}`}>{state === 'running' ? 'Running' : state === 'ended' ? 'Finished for today' : 'Not started'}</span>
              </div>
              <p className="muted small">
                {getStop(r.stops[0]).name} to {getStop(r.stops[r.stops.length - 1]).name}
              </p>
              <div className="row wrap small">
                <ModeTag route={r} />
                <span>Every {r.headwayMin} min</span>
                <span>·</span>
                <span>
                  {r.firstDeparture} to {r.lastDeparture}
                </span>
                <span>·</span>
                <span>{routeLengthKm(r).toFixed(0)} km</span>
                <span>·</span>
                <span>From {money(r.baseFare)}</span>
              </div>
              <div className="row small">
                {rating ? (
                  <>
                    <Stars value={rating.average} size={14} /> <span className="muted">{rating.average.toFixed(1)} ({rating.count})</span>
                  </>
                ) : (
                  <span className="muted">No ratings yet</span>
                )}
              </div>
              {alert && <div className="alert warning small">{alert.title}</div>}
            </a>
          );
        })}
        {routes.length === 0 && <p className="muted">No routes match your search.</p>}
      </div>
    </div>
  );
}
