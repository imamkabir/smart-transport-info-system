const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two [lat, lng] points, in kilometres. */
export function haversineKm(a: [number, number], b: [number, number]): number {
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Roads are rarely straight. Multiplying straight-line distance by a detour
 * factor gives a more honest estimate of road distance.
 */
export const ROAD_DETOUR_FACTOR = 1.3;

export function roadKm(a: [number, number], b: [number, number]): number {
  return haversineKm(a, b) * ROAD_DETOUR_FACTOR;
}
