import { useMemo, useState } from 'react';
import { ALERTS, STOPS } from '../data/network';
import { money } from '../lib/fares';
import { getStop } from '../lib/network';
import { planJourneys, type Journey } from '../lib/planner';
import { formatDuration, fromMinutes, nowMinutes, toMinutes } from '../lib/time';
import TransitMap, { type MapLine } from '../components/TransitMap';
import { Empty, ModeTag, RouteBadge } from '../components/ui';

const sortedStops = [...STOPS].sort((a, b) => a.name.localeCompare(b.name));

function StopSelect({ label, value, onChange, id }: { label: string; value: string; onChange: (v: string) => void; id: string }) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose a stop</option>
        {sortedStops.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.area})
          </option>
        ))}
      </select>
    </label>
  );
}

export default function PlanPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [leaveNow, setLeaveNow] = useState(true);
  const [time, setTime] = useState(fromMinutes(nowMinutes()));
  const [submitted, setSubmitted] = useState<{ from: string; to: string; minute: number } | null>(null);
  const [selected, setSelected] = useState(0);

  const result = useMemo(
    () => (submitted ? planJourneys(submitted.from, submitted.to, submitted.minute) : null),
    [submitted],
  );

  const error = from && to && from === to ? 'Start and destination are the same stop.' : '';

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    if (!from || !to || error) return;
    setSelected(0);
    setSubmitted({ from, to, minute: leaveNow ? nowMinutes() : toMinutes(time) });
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const journey = result?.journeys[selected];
  const lines: MapLine[] = journey
    ? journey.legs.map((l, i) => ({ id: `${l.route.id}-${i}`, color: l.route.color, stops: l.stops }))
    : [];

  return (
    <div className="stack-lg">
      <section className="hero">
        <h1>Where are you going?</h1>
        <p className="lead">
          Compare routes, see what a trip will cost and when the next vehicle leaves, before you get to the stop.
        </p>

        <form className="planner card" onSubmit={search}>
          <div className="planner-stops">
            <StopSelect id="from" label="From" value={from} onChange={setFrom} />
            <button type="button" className="swap" onClick={swap} aria-label="Swap start and destination" title="Swap">
              ⇅
            </button>
            <StopSelect id="to" label="To" value={to} onChange={setTo} />
          </div>
          <div className="planner-time">
            <div className="segmented" role="radiogroup" aria-label="Departure time">
              <button type="button" role="radio" aria-checked={leaveNow} className={leaveNow ? 'on' : ''} onClick={() => setLeaveNow(true)}>
                Leave now
              </button>
              <button type="button" role="radio" aria-checked={!leaveNow} className={!leaveNow ? 'on' : ''} onClick={() => setLeaveNow(false)}>
                Leave at
              </button>
            </div>
            {!leaveNow && (
              <input type="time" aria-label="Departure time" value={time} onChange={(e) => setTime(e.target.value)} />
            )}
            <button className="btn primary" type="submit" disabled={!from || !to || !!error}>
              Find routes
            </button>
          </div>
          {error && <p className="form-error">{error}</p>}
        </form>
      </section>

      {ALERTS.filter((a) => a.level === 'warning').map((a) => (
        <div key={a.id} className="alert warning" role="status">
          <strong>{a.title}.</strong> {a.body}
        </div>
      ))}

      {result && submitted && (
        <section className="results">
          <div className="results-list">
            <h2>
              {getStop(submitted.from).name} to {getStop(submitted.to).name}
            </h2>
            <p className="muted">Leaving {fromMinutes(submitted.minute)}</p>
            {result.journeys.length === 0 ? (
              <Empty>
                {result.outOfService
                  ? 'No vehicles run at this time. Services start from about 05:00. Try an earlier or later time.'
                  : 'No route connects these stops yet.'}
              </Empty>
            ) : (
              result.journeys.map((j, i) => (
                <JourneyCard key={i} journey={j} best={i === 0} active={i === selected} onSelect={() => setSelected(i)} />
              ))
            )}
          </div>
          {journey && (
            <div className="results-map">
              <TransitMap
                lines={lines}
                highlight={[submitted.from, submitted.to]}
                height={460}
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function JourneyCard({ journey, best, active, onSelect }: { journey: Journey; best: boolean; active: boolean; onSelect: () => void }) {
  return (
    <article className={`card journey ${active ? 'active' : ''}`}>
      <button className="journey-head" onClick={onSelect} aria-expanded={active}>
        <div>
          <div className="journey-times">
            {fromMinutes(journey.depart)} to {fromMinutes(journey.arrive)}
            {best && <span className="pill">Fastest</span>}
          </div>
          <div className="journey-badges">
            {journey.legs.map((l, i) => (
              <span key={i} className="leg-chip">
                {i > 0 && <span className="arrow" aria-hidden>›</span>}
                <RouteBadge route={l.route} />
              </span>
            ))}
            <span className="muted small">
              {journey.transfers === 0 ? 'Direct' : `${journey.transfers} change${journey.transfers > 1 ? 's' : ''}`}
            </span>
          </div>
        </div>
        <div className="journey-summary">
          <strong>{money(journey.fare)}</strong>
          <span className="muted small">{formatDuration(journey.totalMin)}</span>
        </div>
      </button>

      {active && (
        <ol className="timeline">
          {journey.legs.map((l, i) => (
            <li key={i}>
              <div className="timeline-dot" style={{ borderColor: l.route.color }} />
              <div className="timeline-body">
                <div className="row">
                  <strong>{fromMinutes(l.depart)}</strong>
                  <span>Board at {getStop(l.from).name}</span>
                </div>
                <div className="row muted small">
                  <RouteBadge route={l.route} link /> {l.route.name} <ModeTag route={l.route} />
                </div>
                <div className="muted small">
                  {l.stops.length - 1} stop{l.stops.length > 2 ? 's' : ''} · {l.distanceKm.toFixed(1)} km · {formatDuration(l.arrive - l.depart)} ·{' '}
                  {money(l.fare.total)}
                  {l.fare.peak && ' (peak fare)'}
                </div>
                <div className="row">
                  <strong>{fromMinutes(l.arrive)}</strong>
                  <span>Get off at {getStop(l.to).name}</span>
                </div>
              </div>
            </li>
          ))}
          <li className="timeline-foot muted small">
            Total {journey.distanceKm.toFixed(1)} km, {formatDuration(journey.waitMin)} waiting. Times come from the timetable and can change with traffic.
          </li>
        </ol>
      )}
    </article>
  );
}
