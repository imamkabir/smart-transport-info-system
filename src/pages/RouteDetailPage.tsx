import { useMemo, useState } from 'react';
import { ALERTS, MODES } from '../data/network';
import { CATEGORIES, loadFeedback } from '../lib/feedback';
import { money, quoteFare } from '../lib/fares';
import { findRoute, getStop, rideStats, routeLengthKm, routesAtStop } from '../lib/network';
import { destinationOf, nextDepartures, offsetAtStop, serviceState, type Direction } from '../lib/schedule';
import { formatDuration, fromMinutes, nowMinutes } from '../lib/time';
import { href } from '../router';
import TransitMap from '../components/TransitMap';
import { Empty, ModeTag, PageHeader, RouteBadge, Stars } from '../components/ui';

export default function RouteDetailPage({ id }: { id: string }) {
  const route = findRoute(id);
  const [dir, setDir] = useState<Direction>('forward');
  const feedback = useMemo(() => loadFeedback().filter((f) => f.routeId === id), [id]);

  if (!route) {
    return (
      <Empty>
        That route does not exist. <a href={href('/routes')}>See all routes</a>.
      </Empty>
    );
  }

  const now = nowMinutes();
  const stops = dir === 'forward' ? route.stops : [...route.stops].reverse();
  const origin = stops[0];
  const state = serviceState(route, now);
  const alerts = ALERTS.filter((a) => a.routeId === route.id);
  const avg = feedback.length ? feedback.reduce((s, f) => s + f.rating, 0) / feedback.length : 0;
  const fullTrip = rideStats(route, route.stops[0], route.stops[route.stops.length - 1]);

  return (
    <div className="stack-lg">
      <a className="back" href={href('/routes')}>‹ All routes</a>
      <PageHeader title={`${route.code} ${route.name}`} lead={`Operated by ${route.operator}`}>
        <div className="row">
          <RouteBadge route={route} />
          <ModeTag route={route} />
        </div>
      </PageHeader>

      {alerts.map((a) => (
        <div key={a.id} className="alert warning" role="status">
          <strong>{a.title}.</strong> {a.body}
        </div>
      ))}

      <div className="stats">
        <div className="stat"><span>Frequency</span><strong>Every {route.headwayMin} min</strong></div>
        <div className="stat"><span>Hours</span><strong>{route.firstDeparture} to {route.lastDeparture}</strong></div>
        <div className="stat"><span>Full trip</span><strong>{routeLengthKm(route).toFixed(1)} km, {formatDuration(fullTrip.rideMin)}</strong></div>
        <div className="stat"><span>Fare</span><strong>{money(route.baseFare)} + {money(route.perKm)}/km</strong></div>
        <div className="stat"><span>Rating</span><strong>{feedback.length ? <><Stars value={avg} size={14} /> {avg.toFixed(1)}</> : 'No ratings yet'}</strong></div>
      </div>

      <div className="two-col">
        <section className="card">
          <div className="row between">
            <h2>Stops and next departures</h2>
            <div className="segmented small" role="radiogroup" aria-label="Direction">
              {(['forward', 'reverse'] as Direction[]).map((d) => (
                <button key={d} role="radio" aria-checked={dir === d} className={dir === d ? 'on' : ''} onClick={() => setDir(d)}>
                  To {getStop(destinationOf(route, d)).name}
                </button>
              ))}
            </div>
          </div>
          {state !== 'running' && (
            <p className="muted small">
              {state === 'ended' ? 'Service has finished for today.' : 'Service has not started yet.'} First vehicle leaves at {route.firstDeparture}.
            </p>
          )}
          <ol className="stop-list">
            {stops.map((s, i) => {
              const next = nextDepartures(route, dir, s, now, 3);
              const fare = i === 0 ? null : quoteFare(route, rideStats(route, origin, s).distanceKm, now);
              const transfers = routesAtStop(s).filter((r) => r.id !== route.id);
              return (
                <li key={s}>
                  <span className="stop-dot" style={{ borderColor: route.color }} />
                  <div className="grow">
                    <div className="row between">
                      <strong>{getStop(s).name}</strong>
                      <span className="small muted">+{Math.round(offsetAtStop(route, dir, s))} min</span>
                    </div>
                    <div className="row wrap small">
                      {i < stops.length - 1 &&
                        (next.length ? (
                          <span>Next: {next.map((t) => fromMinutes(t)).join(', ')}</span>
                        ) : (
                          <span className="muted">No more departures today</span>
                        ))}
                      {fare && <span className="muted">From start: {money(fare.total)}</span>}
                      {transfers.map((r) => <RouteBadge key={r.id} route={r} link />)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="stack">
          <TransitMap lines={[{ id: route.id, color: route.color, stops: route.stops }]} height={340} />
          <section className="card">
            <div className="row between">
              <h2>Passenger feedback</h2>
              <a className="btn" href={href(`/feedback?route=${route.id}`)}>Rate this route</a>
            </div>
            {feedback.length === 0 ? (
              <p className="muted">Nobody has rated this route yet.</p>
            ) : (
              <ul className="feedback-list">
                {feedback.slice(0, 5).map((f) => (
                  <li key={f.id}>
                    <div className="row between">
                      <Stars value={f.rating} size={14} />
                      <span className="muted small">{new Date(f.createdAt).toLocaleDateString()}</span>
                    </div>
                    <span className="tag">{CATEGORIES.find((c) => c.id === f.category)?.label}</span>
                    {f.comment && <p>{f.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
            <p className="muted small">Vehicle type: {MODES[route.mode].label}.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
