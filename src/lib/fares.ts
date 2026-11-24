import { CURRENCY, MODES, PEAK_MULTIPLIER, PEAK_WINDOWS, type Route } from '../data/network';
import { toMinutes } from './time';

/** Fares are rounded up to the nearest coin/note step. */
export const FARE_STEP = 50;

export function isPeak(minutesOfDay: number): boolean {
  return PEAK_WINDOWS.some(([start, end]) => {
    const s = toMinutes(start);
    const e = toMinutes(end);
    return minutesOfDay >= s && minutesOfDay < e;
  });
}

export interface FareQuote {
  base: number;
  distanceCharge: number;
  surcharge: number;
  total: number;
  peak: boolean;
}

/**
 * Fare for riding `distanceKm` on `route`, boarding at `minutesOfDay`.
 * base + per-km charge, a peak surcharge on modes that have one, rounded up.
 */
export function quoteFare(route: Route, distanceKm: number, minutesOfDay: number): FareQuote {
  const base = route.baseFare;
  const distanceCharge = route.perKm * distanceKm;
  const peak = MODES[route.mode].peakSurcharge && isPeak(minutesOfDay);
  const subtotal = base + distanceCharge;
  const surcharge = peak ? subtotal * (PEAK_MULTIPLIER - 1) : 0;
  const total = Math.ceil((subtotal + surcharge) / FARE_STEP) * FARE_STEP;
  return {
    base,
    distanceCharge: Math.round(distanceCharge),
    surcharge: Math.round(surcharge),
    total,
    peak,
  };
}

export function money(amount: number): string {
  return `${CURRENCY.symbol}${Math.round(amount).toLocaleString('en-US')}`;
}
