import { useEffect, useState } from 'react';
import { ROUTES } from '../data/network';
import { getRoute, getStop } from '../lib/network';
import { departuresAt, destinationOf, type Direction } from '../lib/schedule';
import { fromMinutes, nowMinutes } from '../lib/time';
import { ModeTag, PageHeader, RouteBadge } from '../components/ui';

/** Re-render every 30 s so countdowns stay current. */
function useNow(): number {
  const [now, setNow] = useState(nowMinutes());
  useEffect(() => {
    const t = setInterval(() => setNow(nowMinutes()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function SchedulesPage() {
  const now = useNow();
  const [routeId, setRouteId] = useState(ROUTES[0].id);
  const [dir, setDir] = useState<Direction>('forward');
  const route = getRoute(routeId);
  const stopsInDir = dir === 'forward' ? route.stops : [...route.stops].reverse();
  const [stopId, setStopId] = useState(stopsInDir[0]);
  const stop = stopsInDir.includes(stopId) ? stopId : stopsInDir[0];

  const times = departuresAt(route, dir, stop);
  const nextIdx = times.findIndex((t) => t >= now);
  const byHour = new Map<number, number[]>();
  for (const t of times) {
    const h = Math.floor(t / 60) % 24;
    byHour.set(h, [...(byHour.get(h) ?? []), t]);
  }

  return (
    <div className="stack-lg">
      <PageHeader title="Schedules" lead="Full timetable for any stop, and a live board of the next vehicles across the network." />

      <section className="card">
        <h2>Departure board</h2>
        <p className="muted small">Next vehicle on every route from its first stop, both directions. Updates on its own.</p>
        <div className="board" role="table" aria-label="Next departures">
          <div className="board-row head" role="row">
            <span role="columnheader">Route</span>
            <span role="columnheader">Towards</span>
            <span role="columnheader">Leaves</span>
            <span role="columnheader">In</span>
          </div>
          {ROUTES.flatMap((r) =>
            (['forward', 'reverse'] as Direction[]).map((d) => {
              const origin = d === 'forward' ? r.stops[0] : r.stops[r.stops.length - 1];
              const next = departuresAt(r, d, origin).find((t) => t >= now);
              return (
                <div className="board-row" role="row" key={r.id + d}>
                  <span role="cell"><RouteBadge route={r} link /></span>
                  <span role="cell">{getStop(destinationOf(r, d)).name}<br /><span className="muted small">from {getStop(origin).name}</span></span>
                  <span role="cell" className="mono">{next !== undefined ? fromMinutes(next) : 'Tomorrow'}</span>
                  <span role="cell" className={next !== undefined && next - now <= 5 ? 'soon' : ''}>
                    {next === undefined ? r.firstDeparture : next - now === 0 ? 'Now' : `${next - now} min`}
                  </span>
                </div>
              );
            }),
          )}
        </div>
      </section>

      <section className="card">
        <h2>Stop timetable</h2>
        <div className="filters">
          <label className="field">
            <span>Route</span>
            <select value={routeId} onChange={(e) => setRouteId(e.target.value)}>
              {ROUTES.map((r) => (
                <option key={r.id} value={r.id}>{r.code} {r.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Direction</span>
            <select value={dir} onChange={(e) => setDir(e.target.value as Direction)}>
              <option value="forward">To {getStop(destinationOf(route, 'forward')).name}</option>
              <option value="reverse">To {getStop(destinationOf(route, 'reverse')).name}</option>
            </select>
          </label>
          <label className="field">
            <span>Stop</span>
            <select value={stop} onChange={(e) => setStopId(e.target.value)}>
              {stopsInDir.slice(0, -1).map((s) => (
                <option key={s} value={s}>{getStop(s).name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="row wrap">
          <RouteBadge route={route} /> <ModeTag route={route} />
          <span className="muted small">Every {route.headwayMin} min, {times.length} departures a day</span>
        </div>

        <table className="timetable">
          <thead>
            <tr><th>Hour</th><th>Minutes past the hour</th></tr>
          </thead>
          <tbody>
            {[...byHour.entries()].map(([h, ts]) => (
              <tr key={h}>
                <th className="mono">{String(h).padStart(2, '0')}</th>
                <td>
                  {ts.map((t) => {
                    const past = t < now;
                    const isNext = times[nextIdx] === t;
                    return (
                      <span key={t} className={`tt ${past ? 'past' : ''} ${isNext ? 'next' : ''}`} title={fromMinutes(t)}>
                        {String(t % 60).padStart(2, '0')}
                      </span>
                    );
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted small">The highlighted time is the next departure. Grey times have already left.</p>
      </section>
    </div>
  );
}
