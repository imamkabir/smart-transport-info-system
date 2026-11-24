/**
 * Sample transport network.
 *
 * Everything the app shows comes from this one file. To use the system for a
 * different city, replace the stops, routes and alerts below. Coordinates are
 * [latitude, longitude]. Times are "HH:MM" in 24h format.
 */

export type Mode = 'brt' | 'bus' | 'minibus' | 'shuttle' | 'cab';

export interface Stop {
  id: string;
  name: string;
  area: string;
  pos: [number, number];
}

export interface Route {
  id: string;
  code: string;
  name: string;
  mode: Mode;
  color: string;
  /** Stop ids in travel order. Vehicles run both directions. */
  stops: string[];
  /** Minutes between departures. */
  headwayMin: number;
  firstDeparture: string;
  lastDeparture: string;
  /** Flat charge for boarding, in the local currency. */
  baseFare: number;
  /** Extra charge per kilometre travelled. */
  perKm: number;
  operator: string;
}

export interface ServiceAlert {
  id: string;
  routeId?: string;
  level: 'info' | 'warning';
  title: string;
  body: string;
}

export interface ModeInfo {
  label: string;
  /** Average speed including traffic, km/h. Used for travel time estimates. */
  speedKmh: number;
  /** Whether a peak-hour surcharge applies. */
  peakSurcharge: boolean;
}

export const CURRENCY = { code: 'NGN', symbol: '₦' };

export const MAP_CENTER: [number, number] = [9.06, 7.42];

export const MODES: Record<Mode, ModeInfo> = {
  brt: { label: 'BRT bus', speedKmh: 28, peakSurcharge: false },
  bus: { label: 'City bus', speedKmh: 22, peakSurcharge: false },
  minibus: { label: 'Minibus', speedKmh: 26, peakSurcharge: true },
  shuttle: { label: 'Airport shuttle', speedKmh: 40, peakSurcharge: false },
  cab: { label: 'Shared cab', speedKmh: 30, peakSurcharge: true },
};

/** Peak periods, used for the surcharge on modes that have one. */
export const PEAK_WINDOWS: Array<[string, string]> = [
  ['07:00', '09:30'],
  ['16:30', '19:30'],
];
export const PEAK_MULTIPLIER = 1.25;

export const STOPS: Stop[] = [
  { id: 'gwagwalada', name: 'Gwagwalada Park', area: 'Gwagwalada', pos: [8.9426, 7.0839] },
  { id: 'zuba', name: 'Zuba Junction', area: 'Zuba', pos: [9.1046, 7.2093] },
  { id: 'airport', name: 'Airport Terminal', area: 'Airport', pos: [9.0068, 7.2632] },
  { id: 'kubwa', name: 'Kubwa Village', area: 'Kubwa', pos: [9.155, 7.322] },
  { id: 'lugbe', name: 'Lugbe Junction', area: 'Lugbe', pos: [8.979, 7.381] },
  { id: 'gwarinpa', name: 'Gwarinpa Estate Gate', area: 'Gwarinpa', pos: [9.103, 7.406] },
  { id: 'jabi', name: 'Jabi Lake', area: 'Jabi', pos: [9.07, 7.424] },
  { id: 'utako', name: 'Utako Market', area: 'Utako', pos: [9.07, 7.44] },
  { id: 'berger', name: 'Berger Roundabout', area: 'Wuse II', pos: [9.0765, 7.458] },
  { id: 'wuse', name: 'Wuse Market', area: 'Wuse', pos: [9.064, 7.471] },
  { id: 'maitama', name: 'Maitama Junction', area: 'Maitama', pos: [9.088, 7.495] },
  { id: 'area1', name: 'Area 1 Roundabout', area: 'Garki', pos: [9.037, 7.473] },
  { id: 'central', name: 'Central Area Terminal', area: 'Central Business District', pos: [9.055, 7.49] },
  { id: 'garki', name: 'Garki Park', area: 'Garki II', pos: [9.03, 7.489] },
  { id: 'aya', name: 'AYA Junction', area: 'Asokoro', pos: [9.043, 7.52] },
  { id: 'nyanya', name: 'Nyanya Park', area: 'Nyanya', pos: [9.013, 7.58] },
  { id: 'mararaba', name: 'Mararaba Market', area: 'Mararaba', pos: [9.03, 7.617] },
];

export const ROUTES: Route[] = [
  {
    id: 'r1',
    code: 'B1',
    name: 'Kubwa Express',
    mode: 'brt',
    color: '#2563eb',
    stops: ['kubwa', 'gwarinpa', 'berger', 'wuse', 'central'],
    headwayMin: 10,
    firstDeparture: '05:30',
    lastDeparture: '22:00',
    baseFare: 300,
    perKm: 20,
    operator: 'City Mass Transit',
  },
  {
    id: 'r2',
    code: 'G2',
    name: 'Nyanya Corridor',
    mode: 'bus',
    color: '#16a34a',
    stops: ['mararaba', 'nyanya', 'aya', 'central', 'wuse', 'berger'],
    headwayMin: 12,
    firstDeparture: '05:45',
    lastDeparture: '21:30',
    baseFare: 250,
    perKm: 18,
    operator: 'City Mass Transit',
  },
  {
    id: 'r3',
    code: 'A3',
    name: 'Airport Link',
    mode: 'shuttle',
    color: '#9333ea',
    stops: ['airport', 'lugbe', 'area1', 'garki', 'central'],
    headwayMin: 30,
    firstDeparture: '06:00',
    lastDeparture: '21:00',
    baseFare: 1000,
    perKm: 35,
    operator: 'SkyLine Shuttles',
  },
  {
    id: 'r4',
    code: 'M4',
    name: 'Zuba to Berger',
    mode: 'minibus',
    color: '#ea580c',
    stops: ['gwagwalada', 'zuba', 'kubwa', 'gwarinpa', 'jabi', 'utako', 'berger'],
    headwayMin: 15,
    firstDeparture: '05:00',
    lastDeparture: '21:00',
    baseFare: 200,
    perKm: 22,
    operator: 'Union Minibus Co-op',
  },
  {
    id: 'r5',
    code: 'C5',
    name: 'City Loop',
    mode: 'cab',
    color: '#db2777',
    stops: ['utako', 'jabi', 'maitama', 'central', 'garki', 'area1', 'wuse'],
    headwayMin: 8,
    firstDeparture: '06:00',
    lastDeparture: '23:00',
    baseFare: 400,
    perKm: 45,
    operator: 'Green Cab Riders',
  },
];

export const ALERTS: ServiceAlert[] = [
  {
    id: 'a1',
    routeId: 'r2',
    level: 'warning',
    title: 'Slow traffic near Nyanya Park',
    body: 'Road works on the expressway. Allow about 10 extra minutes on the G2 Nyanya Corridor during peak hours.',
  },
  {
    id: 'a2',
    level: 'info',
    title: 'Sample data',
    body: 'Routes, fares and timetables in this demo are illustrative. An operator would replace them with its own data.',
  },
];
