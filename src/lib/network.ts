import { MODES, ROUTES, STOPS, type Route, type Stop } from '../data/network';
import { roadKm } from './geo';

/** Time a vehicle spends at each intermediate stop, minutes. */
export const DWELL_MIN = 1;

const stopIndex = new Map(STOPS.map((s) => [s.id, s]));
const routeIndex = new Map(ROUTES.map((r) => [r.id, r]));

export function getStop(id: string): Stop {
  const s = stopIndex.get(id);
  if (!s) throw new Error(`Unknown stop: ${id}`);
  return s;
}

export function getRoute(id: string): Route {
  const r = routeIndex.get(id);
  if (!r) throw new Error(`Unknown route: ${id}`);
  return r;
}

export function findRoute(id: string): Route | undefined {
  return routeIndex.get(id);
}

export function routesAtStop(stopId: string): Route[] {
  return ROUTES.filter((r) => r.stops.includes(stopId));
}

/** Road distance of one hop between consecutive stops. */
export function segmentKm(fromId: string, toId: string): number {
  return roadKm(getStop(fromId).pos, getStop(toId).pos);
}

/** Riding time for one hop on a route, minutes (excluding dwell). */
export function segmentMin(route: Route, fromId: string, toId: string): number {
  return (segmentKm(fromId, toId) / MODES[route.mode].speedKmh) * 60;
}

/** Ordered stop ids ridden between two stops on a route, in either direction. */
export function stopsBetween(route: Route, fromId: string, toId: string): string[] {
  const a = route.stops.indexOf(fromId);
  const b = route.stops.indexOf(toId);
  if (a < 0 || b < 0) throw new Error(`Route ${route.code} does not serve both stops`);
  return a <= b ? route.stops.slice(a, b + 1) : route.stops.slice(b, a + 1).reverse();
}

export interface RideStats {
  stops: string[];
  distanceKm: number;
  rideMin: number;
}

export function rideStats(route: Route, fromId: string, toId: string): RideStats {
  const stops = stopsBetween(route, fromId, toId);
  let distanceKm = 0;
  let rideMin = 0;
  for (let i = 1; i < stops.length; i++) {
    distanceKm += segmentKm(stops[i - 1], stops[i]);
    rideMin += segmentMin(route, stops[i - 1], stops[i]);
  }
  rideMin += Math.max(0, stops.length - 2) * DWELL_MIN;
  return { stops, distanceKm, rideMin };
}

/** Full end-to-end length of a route, km. */
export function routeLengthKm(route: Route): number {
  return rideStats(route, route.stops[0], route.stops[route.stops.length - 1]).distanceKm;
}
