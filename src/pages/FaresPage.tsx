import { useState } from 'react';
import { MODES, PEAK_MULTIPLIER, PEAK_WINDOWS, ROUTES } from '../data/network';
import { money, quoteFare } from '../lib/fares';
import { getRoute, getStop, rideStats } from '../lib/network';
import { fromMinutes, nowMinutes, toMinutes } from '../lib/time';
import { PageHeader, RouteBadge } from '../components/ui';

export default function FaresPage() {
  const [routeId, setRouteId] = useState(ROUTES[0].id);
  const route = getRoute(routeId);
  const [from, setFrom] = useState(route.stops[0]);
  const [to, setTo] = useState(route.stops[route.stops.length - 1]);
  const [time, setTime] = useState(fromMinutes(nowMinutes()));
  const [tableRoute, setTableRoute] = useState(ROUTES[0].id);

  const pickRoute = (id: string) => {
    const r = getRoute(id);
    setRouteId(id);
    setFrom(r.stops[0]);
    setTo(r.stops[r.stops.length - 1]);
  };

  const valid = from !== to && route.stops.includes(from) && route.stops.includes(to);
  const stats = valid ? rideStats(route, from, to) : null;
  const quote = stats ? quoteFare(route, stats.distanceKm, toMinutes(time)) : null;
  const tr = getRoute(tableRoute);

  return (
    <div className="stack-lg">
      <PageHeader title="Fare estimates" lead="Know what to pay before you board. Fares are a boarding charge plus a charge per kilometre." />

      <div className="two-col">
        <section className="card">
          <h2>Estimate a fare</h2>
          <div className="stack">
            <label className="field">
              <span>Route</span>
              <select value={routeId} onChange={(e) => pickRoute(e.target.value)}>
                {ROUTES.map((r) => <option key={r.id} value={r.id}>{r.code} {r.name}</option>)}
              </select>
            </label>
            <div className="filters">
              <label className="field">
                <span>Board at</span>
                <select value={from} onChange={(e) => setFrom(e.target.value)}>
                  {route.stops.map((s) => <option key={s} value={s}>{getStop(s).name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Get off at</span>
                <select value={to} onChange={(e) => setTo(e.target.value)}>
                  {route.stops.map((s) => <option key={s} value={s}>{getStop(s).name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Time</span>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </label>
            </div>
          </div>

          {!valid && <p className="form-error">Choose two different stops.</p>}
          {quote && stats && (
            <div className="quote">
              <div className="quote-total">
                <span className="muted small">Estimated fare</span>
                <strong>{money(quote.total)}</strong>
              </div>
              <dl className="breakdown">
                <dt>Boarding charge</dt><dd>{money(quote.base)}</dd>
                <dt>Distance ({stats.distanceKm.toFixed(1)} km × {money(route.perKm)})</dt><dd>{money(quote.distanceCharge)}</dd>
                {quote.peak && (<><dt>Peak hour surcharge</dt><dd>{money(quote.surcharge)}</dd></>)}
                <dt>Rounded up to the nearest {money(50)}</dt><dd>{money(quote.total)}</dd>
              </dl>
              <p className="muted small">{stats.stops.length - 1} stops on the {route.code} {MODES[route.mode].label.toLowerCase()}.</p>
            </div>
          )}
        </section>

        <section className="card">
          <h2>How fares work</h2>
          <ul className="plain">
            {ROUTES.map((r) => (
              <li key={r.id} className="row between">
                <span className="row"><RouteBadge route={r} /> {MODES[r.mode].label}</span>
                <span className="mono">{money(r.baseFare)} + {money(r.perKm)}/km</span>
              </li>
            ))}
          </ul>
          <p className="muted small">
            Minibuses and shared cabs cost {Math.round((PEAK_MULTIPLIER - 1) * 100)}% more at peak times (
            {PEAK_WINDOWS.map(([a, b]) => `${a} to ${b}`).join(' and ')}). BRT, city buses and the airport shuttle keep the same price all day.
          </p>
        </section>
      </div>

      <section className="card">
        <div className="row between wrap">
          <h2>Fare table</h2>
          <select value={tableRoute} onChange={(e) => setTableRoute(e.target.value)} aria-label="Fare table route">
            {ROUTES.map((r) => <option key={r.id} value={r.id}>{r.code} {r.name}</option>)}
          </select>
        </div>
        <p className="muted small">Off-peak fare between any two stops on the route.</p>
        <div className="table-scroll">
          <table className="matrix">
            <thead>
              <tr>
                <th />
                {tr.stops.map((s) => <th key={s} scope="col">{getStop(s).name}</th>)}
              </tr>
            </thead>
            <tbody>
              {tr.stops.map((a) => (
                <tr key={a}>
                  <th scope="row">{getStop(a).name}</th>
                  {tr.stops.map((b) => (
                    <td key={b} className="mono">
                      {a === b ? '·' : money(quoteFare(tr, rideStats(tr, a, b).distanceKm, toMinutes('12:00')).total)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
