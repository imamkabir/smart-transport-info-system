import { useEffect, useMemo } from 'react';
import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap as useLeafletMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_CENTER, STOPS } from '../data/network';
import { getStop } from '../lib/network';

export interface MapLine {
  id: string;
  color: string;
  stops: string[];
  dashed?: boolean;
}

interface Props {
  lines: MapLine[];
  /** Stops to draw. Defaults to every stop on the given lines. */
  stops?: string[];
  highlight?: string[];
  height?: number;
}

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export const mapProvider = GOOGLE_KEY ? 'Google Maps' : 'OpenStreetMap';

/**
 * Network map. Uses the Google Maps JavaScript API when
 * VITE_GOOGLE_MAPS_API_KEY is set, and free OpenStreetMap tiles otherwise.
 */
export default function TransitMap({ lines, stops, highlight = [], height = 360 }: Props) {
  const stopIds = useMemo(
    () => stops ?? [...new Set(lines.flatMap((l) => l.stops))],
    [stops, lines],
  );
  const points = stopIds.map((id) => getStop(id).pos);

  return (
    <div className="map" style={{ height }} role="region" aria-label="Route map">
      {GOOGLE_KEY ? (
        <GoogleTransitMap lines={lines} stopIds={stopIds} highlight={highlight} points={points} />
      ) : (
        <LeafletTransitMap lines={lines} stopIds={stopIds} highlight={highlight} points={points} />
      )}
    </div>
  );
}

interface InnerProps {
  lines: MapLine[];
  stopIds: string[];
  highlight: string[];
  points: Array<[number, number]>;
}

/* ---------- Google Maps ---------- */

function GoogleTransitMap({ lines, stopIds, highlight, points }: InnerProps) {
  return (
    <APIProvider apiKey={GOOGLE_KEY!}>
      <Map
        defaultCenter={{ lat: MAP_CENTER[0], lng: MAP_CENTER[1] }}
        defaultZoom={11}
        gestureHandling="cooperative"
        disableDefaultUI={false}
        streetViewControl={false}
        mapTypeControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <GooglePolylines lines={lines} points={points} />
        {stopIds.map((id) => {
          const s = getStop(id);
          const big = highlight.includes(id);
          return (
            <Marker
              key={id}
              position={{ lat: s.pos[0], lng: s.pos[1] }}
              title={s.name}
              icon={{
                path: 0, // google.maps.SymbolPath.CIRCLE
                scale: big ? 8 : 5,
                fillColor: big ? '#0f766e' : '#ffffff',
                fillOpacity: 1,
                strokeColor: '#0f172a',
                strokeWeight: 2,
              }}
            />
          );
        })}
      </Map>
    </APIProvider>
  );
}

/** Polylines are drawn imperatively: the React wrapper has no Polyline component. */
function GooglePolylines({ lines, points }: { lines: MapLine[]; points: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const g = window.google.maps;
    const drawn = lines.map(
      (l) =>
        new g.Polyline({
          map,
          path: l.stops.map((id) => ({ lat: getStop(id).pos[0], lng: getStop(id).pos[1] })),
          strokeColor: l.color,
          strokeWeight: 5,
          strokeOpacity: l.dashed ? 0 : 0.85,
          icons: l.dashed
            ? [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '14px' }]
            : undefined,
        }),
    );
    if (points.length > 1) {
      const bounds = new g.LatLngBounds();
      points.forEach((p) => bounds.extend({ lat: p[0], lng: p[1] }));
      map.fitBounds(bounds, 40);
    }
    return () => drawn.forEach((p) => p.setMap(null));
  }, [map, lines, points]);
  return null;
}

/* ---------- OpenStreetMap (Leaflet) ---------- */

function LeafletTransitMap({ lines, stopIds, highlight, points }: InnerProps) {
  return (
    <MapContainer center={MAP_CENTER} zoom={11} scrollWheelZoom={false} style={{ height: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitLeaflet points={points} />
      {lines.map((l) => (
        <Polyline
          key={l.id}
          positions={l.stops.map((id) => getStop(id).pos)}
          pathOptions={{ color: l.color, weight: 5, opacity: 0.85, dashArray: l.dashed ? '6 8' : undefined }}
        />
      ))}
      {stopIds.map((id) => {
        const s = getStop(id);
        const big = highlight.includes(id);
        return (
          <CircleMarker
            key={id}
            center={s.pos}
            radius={big ? 8 : 5}
            pathOptions={{ color: '#0f172a', weight: 2, fillColor: big ? '#0f766e' : '#ffffff', fillOpacity: 1 }}
          >
            <Tooltip>{s.name}</Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

function FitLeaflet({ points }: { points: Array<[number, number]> }) {
  const map = useLeafletMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [30, 30] });
  }, [map, points]);
  return null;
}

export const ALL_STOP_IDS = STOPS.map((s) => s.id);
