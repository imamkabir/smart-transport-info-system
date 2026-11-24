import type { Route } from '../data/network';
import { rideStats } from './network';
import { toMinutes } from './time';

export type Direction = 'forward' | 'reverse';

/** Terminal a vehicle starts from for a given direction. */
export function originOf(route: Route, dir: Direction): string {
  return dir === 'forward' ? route.stops[0] : route.stops[route.stops.length - 1];
}

export function destinationOf(route: Route, dir: Direction): string {
  return dir === 'forward' ? route.stops[route.stops.length - 1] : route.stops[0];
}

/** Direction needed to travel from one stop to another on a route. */
export function directionFor(route: Route, fromId: string, toId: string): Direction {
  return route.stops.indexOf(fromId) <= route.stops.indexOf(toId) ? 'forward' : 'reverse';
}

/** Departure times (minutes of day) from the origin terminal. */
export function terminalDepartures(route: Route): number[] {
  const first = toMinutes(route.firstDeparture);
  const last = toMinutes(route.lastDeparture);
  const out: number[] = [];
  for (let t = first; t <= last; t += route.headwayMin) out.push(t);
  return out;
}

/** Minutes after leaving the terminal that a vehicle reaches `stopId`. */
export function offsetAtStop(route: Route, dir: Direction, stopId: string): number {
  const origin = originOf(route, dir);
  if (origin === stopId) return 0;
  return rideStats(route, origin, stopId).rideMin;
}

/** All departure times from a given stop, in a direction. */
export function departuresAt(route: Route, dir: Direction, stopId: string): number[] {
  const offset = offsetAtStop(route, dir, stopId);
  return terminalDepartures(route).map((t) => Math.round(t + offset));
}

/** The next `count` departures from `stopId` at or after `fromMinute`. */
export function nextDepartures(
  route: Route,
  dir: Direction,
  stopId: string,
  fromMinute: number,
  count = 3,
): number[] {
  return departuresAt(route, dir, stopId)
    .filter((t) => t >= fromMinute)
    .slice(0, count);
}

export type ServiceState = 'running' | 'not-started' | 'ended';

export function serviceState(route: Route, minute: number): ServiceState {
  const deps = terminalDepartures(route);
  if (minute < deps[0]) return 'not-started';
  // Service counts as running until the last vehicle leaves its terminal.
  if (minute > deps[deps.length - 1]) return 'ended';
  return 'running';
}
