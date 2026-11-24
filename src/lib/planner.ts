import { ROUTES, type Route } from '../data/network';
import { quoteFare, type FareQuote } from './fares';
import { DWELL_MIN, getRoute, rideStats, segmentMin } from './network';
import { directionFor, nextDepartures, type Direction } from './schedule';

/** Extra minutes counted against every change of vehicle (walking, uncertainty). */
export const TRANSFER_PENALTY_MIN = 5;
/** Minimum time allowed to get from one vehicle to the next. */
export const TRANSFER_WALK_MIN = 3;
export const MAX_TRANSFERS = 2;

export interface Leg {
  route: Route;
  from: string;
  to: string;
  direction: Direction;
  stops: string[];
  distanceKm: number;
  rideMin: number;
}

export interface TimedLeg extends Leg {
  depart: number;
  arrive: number;
  fare: FareQuote;
}

export interface Journey {
  legs: TimedLeg[];
  depart: number;
  arrive: number;
  totalMin: number;
  waitMin: number;
  distanceKm: number;
  fare: number;
  transfers: number;
}

export interface PlanResult {
  journeys: Journey[];
  /** Routes exist but no vehicle runs at the requested time. */
  outOfService: boolean;
}

interface State {
  stop: string;
  route: string | null;
  transfers: number;
}

const key = (s: State) => `${s.stop}|${s.route ?? '-'}|${s.transfers}`;

/**
 * Dijkstra over (stop, current route) states. The cost is expected minutes:
 * half a headway of waiting to board, riding time, and a penalty per transfer.
 * Returns the stop/route sequence of the cheapest path, or null.
 */
function shortestPath(from: string, to: string, banned: Set<string>): Leg[] | null {
  const routes = ROUTES.filter((r) => !banned.has(r.id));
  const dist = new Map<string, number>();
  const prev = new Map<string, State>();
  const start: State = { stop: from, route: null, transfers: 0 };
  dist.set(key(start), 0);
  const queue: Array<{ state: State; cost: number }> = [{ state: start, cost: 0 }];

  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const { state, cost } = queue.shift()!;
    if (cost > (dist.get(key(state)) ?? Infinity)) continue;
    if (state.stop === to && state.route) return buildLegs(state, prev);

    const relax = (next: State, add: number) => {
      const c = cost + add;
      if (c < (dist.get(key(next)) ?? Infinity)) {
        dist.set(key(next), c);
        prev.set(key(next), state);
        queue.push({ state: next, cost: c });
      }
    };

    // Board a different route at this stop.
    for (const r of routes) {
      if (r.id === state.route || !r.stops.includes(state.stop)) continue;
      const transfers = state.route ? state.transfers + 1 : 0;
      if (transfers > MAX_TRANSFERS) continue;
      const penalty = state.route ? TRANSFER_PENALTY_MIN : 0;
      relax({ stop: state.stop, route: r.id, transfers }, r.headwayMin / 2 + penalty);
    }

    // Ride the current route one stop in either direction.
    if (state.route) {
      const r = getRoute(state.route);
      const i = r.stops.indexOf(state.stop);
      for (const j of [i - 1, i + 1]) {
        if (j < 0 || j >= r.stops.length) continue;
        relax(
          { stop: r.stops[j], route: r.id, transfers: state.transfers },
          segmentMin(r, state.stop, r.stops[j]) + DWELL_MIN,
        );
      }
    }
  }
  return null;
}

function buildLegs(end: State, prev: Map<string, State>): Leg[] {
  const path: State[] = [end];
  let cur = prev.get(key(end));
  while (cur) {
    path.unshift(cur);
    cur = prev.get(key(cur));
  }
  // Group consecutive states on the same route into legs.
  const legs: Leg[] = [];
  let i = 0;
  while (i < path.length) {
    const routeId = path[i].route;
    if (!routeId) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < path.length && path[j + 1].route === routeId) j++;
    const from = path[i].stop;
    const to = path[j].stop;
    if (from !== to) {
      const route = getRoute(routeId);
      const stats = rideStats(route, from, to);
      legs.push({ route, from, to, direction: directionFor(route, from, to), ...stats });
    }
    i = j + 1;
  }
  return legs;
}

/** Attach real departure times from the timetable, starting at `minute`. */
export function timeJourney(legs: Leg[], minute: number): Journey | null {
  let t = minute;
  const timed: TimedLeg[] = [];
  for (const [n, leg] of legs.entries()) {
    const earliest = n === 0 ? t : t + TRANSFER_WALK_MIN;
    const [depart] = nextDepartures(leg.route, leg.direction, leg.from, earliest, 1);
    if (depart === undefined) return null;
    const arrive = Math.round(depart + leg.rideMin);
    timed.push({ ...leg, depart, arrive, fare: quoteFare(leg.route, leg.distanceKm, depart) });
    t = arrive;
  }
  const depart = timed[0].depart;
  const arrive = timed[timed.length - 1].arrive;
  const rideMin = timed.reduce((s, l) => s + (l.arrive - l.depart), 0);
  return {
    legs: timed,
    depart,
    arrive,
    totalMin: arrive - minute,
    waitMin: arrive - minute - rideMin,
    distanceKm: timed.reduce((s, l) => s + l.distanceKm, 0),
    fare: timed.reduce((s, l) => s + l.fare.total, 0),
    transfers: timed.length - 1,
  };
}

const signature = (legs: Leg[]) => legs.map((l) => `${l.route.id}:${l.from}>${l.to}`).join('/');

/**
 * Plan up to `limit` journeys between two stops leaving at or after `minute`.
 * Alternatives come from re-running the search with each route of the best
 * path banned in turn.
 */
export function planJourneys(from: string, to: string, minute: number, limit = 3): PlanResult {
  if (from === to) return { journeys: [], outOfService: false };

  const candidates = new Map<string, Leg[]>();
  const best = shortestPath(from, to, new Set());
  if (!best) return { journeys: [], outOfService: false };
  candidates.set(signature(best), best);

  const banSets: Array<Set<string>> = best.map((l) => new Set([l.route.id]));
  while (banSets.length && candidates.size < limit + 2) {
    const banned = banSets.shift()!;
    const alt = shortestPath(from, to, banned);
    if (!alt) continue;
    const sig = signature(alt);
    if (candidates.has(sig)) continue;
    candidates.set(sig, alt);
    if (banned.size < 2) for (const l of alt) banSets.push(new Set([...banned, l.route.id]));
  }

  const journeys = [...candidates.values()]
    .map((legs) => timeJourney(legs, minute))
    .filter((j): j is Journey => j !== null)
    .sort((a, b) => a.arrive - b.arrive || a.fare - b.fare)
    .slice(0, limit);

  return { journeys, outOfService: journeys.length === 0 };
}
