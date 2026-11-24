import { describe, expect, it } from 'vitest';
import { ROUTES, STOPS } from '../data/network';
import { addFeedback, loadFeedback, ratingsByRoute, validateFeedback, type Storage } from './feedback';
import { haversineKm } from './geo';
import { isPeak, quoteFare } from './fares';
import { getRoute, rideStats, stopsBetween } from './network';
import { planJourneys } from './planner';
import { departuresAt, nextDepartures, serviceState, terminalDepartures } from './schedule';
import { formatDuration, fromMinutes, toMinutes } from './time';

const memory = (): Storage => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};

describe('data integrity', () => {
  it('every route stop exists and ids are unique', () => {
    const ids = new Set(STOPS.map((s) => s.id));
    expect(ids.size).toBe(STOPS.length);
    for (const r of ROUTES) for (const s of r.stops) expect(ids.has(s), `${r.code}:${s}`).toBe(true);
  });
});

describe('time and geo', () => {
  it('converts times both ways', () => {
    expect(toMinutes('07:45')).toBe(465);
    expect(fromMinutes(465)).toBe('07:45');
    expect(fromMinutes(1450)).toBe('00:10');
    expect(formatDuration(75)).toBe('1 h 15 min');
  });
  it('measures distance', () => {
    // One degree of latitude is about 111 km.
    expect(haversineKm([0, 0], [1, 0])).toBeCloseTo(111.2, 0);
  });
});

describe('network', () => {
  it('lists stops between in travel order, both ways', () => {
    const r = getRoute('r1');
    expect(stopsBetween(r, 'gwarinpa', 'wuse')).toEqual(['gwarinpa', 'berger', 'wuse']);
    expect(stopsBetween(r, 'wuse', 'gwarinpa')).toEqual(['wuse', 'berger', 'gwarinpa']);
  });
  it('ride stats are symmetric', () => {
    const r = getRoute('r4');
    const a = rideStats(r, 'zuba', 'utako');
    const b = rideStats(r, 'utako', 'zuba');
    expect(a.distanceKm).toBeCloseTo(b.distanceKm, 6);
    expect(a.rideMin).toBeGreaterThan(0);
  });
});

describe('fares', () => {
  it('detects peak hours', () => {
    expect(isPeak(toMinutes('08:00'))).toBe(true);
    expect(isPeak(toMinutes('12:00'))).toBe(false);
  });
  it('rounds up to the fare step and adds surcharge only where it applies', () => {
    const cab = getRoute('r5');
    const off = quoteFare(cab, 4, toMinutes('12:00'));
    const peak = quoteFare(cab, 4, toMinutes('08:00'));
    expect(off.total % 50).toBe(0);
    expect(off.total).toBeGreaterThanOrEqual(400 + 45 * 4);
    expect(peak.total).toBeGreaterThan(off.total);
    const brt = getRoute('r1');
    expect(quoteFare(brt, 4, toMinutes('08:00')).peak).toBe(false);
  });
});

describe('schedule', () => {
  it('builds departures from first to last at the headway', () => {
    const r = getRoute('r3');
    const deps = terminalDepartures(r);
    expect(deps[0]).toBe(toMinutes('06:00'));
    expect(deps[deps.length - 1]).toBe(toMinutes('21:00'));
    expect(deps[1] - deps[0]).toBe(30);
  });
  it('later stops are served later', () => {
    const r = getRoute('r1');
    expect(departuresAt(r, 'forward', 'wuse')[0]).toBeGreaterThan(departuresAt(r, 'forward', 'kubwa')[0]);
  });
  it('returns upcoming departures only', () => {
    const r = getRoute('r1');
    const next = nextDepartures(r, 'forward', 'kubwa', toMinutes('10:03'), 2);
    expect(next).toEqual([toMinutes('10:10'), toMinutes('10:20')]);
    expect(nextDepartures(r, 'forward', 'kubwa', toMinutes('23:30'))).toEqual([]);
  });
  it('reports service state', () => {
    const r = getRoute('r1');
    expect(serviceState(r, toMinutes('04:00'))).toBe('not-started');
    expect(serviceState(r, toMinutes('12:00'))).toBe('running');
    expect(serviceState(r, toMinutes('23:00'))).toBe('ended');
  });
});

describe('journey planner', () => {
  const noon = toMinutes('12:00');

  it('finds a direct trip on one route', () => {
    const { journeys } = planJourneys('kubwa', 'central', noon);
    expect(journeys.length).toBeGreaterThan(0);
    expect(journeys[0].transfers).toBe(0);
    expect(journeys[0].legs[0].route.id).toBe('r1');
  });

  it('finds a trip that needs a transfer', () => {
    const { journeys } = planJourneys('airport', 'mararaba', noon);
    expect(journeys.length).toBeGreaterThan(0);
    const j = journeys[0];
    expect(j.transfers).toBeGreaterThanOrEqual(1);
    expect(j.legs[0].from).toBe('airport');
    expect(j.legs[j.legs.length - 1].to).toBe('mararaba');
    // Legs connect end to end, in time order.
    for (let i = 1; i < j.legs.length; i++) {
      expect(j.legs[i].from).toBe(j.legs[i - 1].to);
      expect(j.legs[i].depart).toBeGreaterThanOrEqual(j.legs[i - 1].arrive);
    }
    expect(j.fare).toBe(j.legs.reduce((s, l) => s + l.fare.total, 0));
  });

  it('offers distinct alternatives sorted by arrival', () => {
    const { journeys } = planJourneys('gwarinpa', 'central', noon);
    expect(journeys.length).toBeGreaterThan(1);
    for (let i = 1; i < journeys.length; i++) expect(journeys[i].arrive).toBeGreaterThanOrEqual(journeys[i - 1].arrive);
  });

  it('every stop can reach every other stop', () => {
    for (const a of STOPS) for (const b of STOPS) {
      if (a.id === b.id) continue;
      expect(planJourneys(a.id, b.id, noon, 1).journeys.length, `${a.id}>${b.id}`).toBe(1);
    }
  });

  it('reports out of service late at night', () => {
    const r = planJourneys('kubwa', 'central', toMinutes('23:50'));
    expect(r.journeys).toEqual([]);
    expect(r.outOfService).toBe(true);
  });
});

describe('feedback', () => {
  it('validates input', () => {
    expect(validateFeedback({ routeId: '', rating: 5, category: 'safety', comment: '' })).toMatch(/route/);
    expect(validateFeedback({ routeId: 'r1', rating: 0, category: 'safety', comment: '' })).toMatch(/rating/);
    expect(validateFeedback({ routeId: 'r1', rating: 4, category: 'safety', comment: 'ok' })).toBeNull();
  });
  it('stores feedback and computes averages', () => {
    const s = memory();
    addFeedback({ routeId: 'r1', rating: 5, category: 'punctuality', comment: ' On time ' }, s);
    addFeedback({ routeId: 'r1', rating: 2, category: 'comfort', comment: '' }, s);
    const all = loadFeedback(s);
    expect(all).toHaveLength(2);
    expect(all[1].comment).toBe('On time');
    expect(ratingsByRoute(all).get('r1')).toEqual({ count: 2, average: 3.5 });
  });
  it('survives corrupted storage', () => {
    const s = memory();
    s.setItem('smarttransit.feedback.v1', '{not json');
    expect(loadFeedback(s)).toEqual([]);
  });
});
