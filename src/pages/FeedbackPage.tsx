import { useMemo, useState } from 'react';
import { ROUTES } from '../data/network';
import { addFeedback, CATEGORIES, loadFeedback, MAX_COMMENT, ratingsByRoute, validateFeedback, type CategoryId, type Feedback } from '../lib/feedback';
import { getRoute } from '../lib/network';
import { Empty, PageHeader, RouteBadge, Stars } from '../components/ui';

function initialRoute(): string {
  const q = window.location.hash.split('?')[1];
  const id = new URLSearchParams(q).get('route') ?? '';
  return ROUTES.some((r) => r.id === id) ? id : '';
}

export default function FeedbackPage() {
  const [all, setAll] = useState<Feedback[]>(() => loadFeedback());
  const [routeId, setRouteId] = useState(initialRoute);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [category, setCategory] = useState<CategoryId>('punctuality');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [thanks, setThanks] = useState(false);

  const ratings = useMemo(() => ratingsByRoute(all), [all]);
  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of all) m.set(f.category, (m.get(f.category) ?? 0) + 1);
    return m;
  }, [all]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const entry = { routeId, rating, category, comment };
    const problem = validateFeedback(entry);
    if (problem) return setError(problem);
    addFeedback(entry);
    setAll(loadFeedback());
    setError('');
    setRating(0);
    setComment('');
    setThanks(true);
  };

  return (
    <div className="stack-lg">
      <PageHeader
        title="Passenger feedback"
        lead="Tell operators how your trip went. Ratings show on each route so other passengers can choose with confidence."
      />

      <div className="two-col">
        <section className="card">
          <h2>Rate a trip</h2>
          {thanks ? (
            <div className="thanks" role="status">
              <strong>Thank you.</strong> Your feedback was saved and now counts toward the route's rating.
              <button className="btn" onClick={() => setThanks(false)}>Send more feedback</button>
            </div>
          ) : (
            <form className="stack" onSubmit={submit} noValidate>
              <label className="field">
                <span>Route you travelled on</span>
                <select value={routeId} onChange={(e) => setRouteId(e.target.value)} required>
                  <option value="">Choose a route</option>
                  {ROUTES.map((r) => <option key={r.id} value={r.id}>{r.code} {r.name}</option>)}
                </select>
              </label>

              <fieldset className="field">
                <legend>Overall rating</legend>
                <div className="star-input" onMouseLeave={() => setHover(0)}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      type="button"
                      key={n}
                      className={(hover || rating) >= n ? 'on' : ''}
                      onMouseEnter={() => setHover(n)}
                      onClick={() => setRating(n)}
                      aria-label={`${n} star${n > 1 ? 's' : ''}`}
                      aria-pressed={rating === n}
                    >
                      ★
                    </button>
                  ))}
                  <span className="muted small">{['', 'Very poor', 'Poor', 'Okay', 'Good', 'Excellent'][hover || rating]}</span>
                </div>
              </fieldset>

              <fieldset className="field">
                <legend>What is it mostly about?</legend>
                <div className="chips">
                  {CATEGORIES.map((c) => (
                    <button type="button" key={c.id} className={`chip ${category === c.id ? 'on' : ''}`} onClick={() => setCategory(c.id)} aria-pressed={category === c.id}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="field">
                <span>Comment (optional)</span>
                <textarea
                  rows={4}
                  maxLength={MAX_COMMENT}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What went well, or what should change?"
                />
                <span className="muted small right">{comment.length}/{MAX_COMMENT}</span>
              </label>

              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="btn primary" type="submit">Submit feedback</button>
              <p className="muted small">Feedback is stored on this device in the demo. No account or personal details are needed.</p>
            </form>
          )}
        </section>

        <section className="card">
          <h2>Route ratings</h2>
          <ul className="plain">
            {ROUTES.map((r) => {
              const rr = ratings.get(r.id);
              return (
                <li key={r.id} className="row between">
                  <span className="row"><RouteBadge route={r} link /> {r.name}</span>
                  {rr ? (
                    <span className="row small"><Stars value={rr.average} size={14} /> {rr.average.toFixed(1)} <span className="muted">({rr.count})</span></span>
                  ) : (
                    <span className="muted small">No ratings</span>
                  )}
                </li>
              );
            })}
          </ul>
          {all.length > 0 && (
            <>
              <h3>Topics passengers raise</h3>
              <ul className="bars">
                {CATEGORIES.map((c) => {
                  const n = byCategory.get(c.id) ?? 0;
                  return (
                    <li key={c.id}>
                      <span className="small">{c.label}</span>
                      <span className="bar"><span style={{ width: `${(n / all.length) * 100}%` }} /></span>
                      <span className="small mono">{n}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      </div>

      <section className="card">
        <h2>Recent feedback</h2>
        {all.length === 0 ? (
          <Empty>No feedback yet. Be the first to rate a route.</Empty>
        ) : (
          <ul className="feedback-list">
            {all.slice(0, 20).map((f) => (
              <li key={f.id}>
                <div className="row between">
                  <span className="row"><RouteBadge route={getRoute(f.routeId)} link /> <Stars value={f.rating} size={14} /></span>
                  <span className="muted small">{new Date(f.createdAt).toLocaleString()}</span>
                </div>
                <span className="tag">{CATEGORIES.find((c) => c.id === f.category)?.label}</span>
                {f.comment && <p>{f.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
