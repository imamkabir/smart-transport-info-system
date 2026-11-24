# SmartTransit: Smart Transport Information System

A web app that gives commuters reliable transport information in one place: route search, fare estimates, vehicle schedules and a passenger feedback mechanism. It helps passengers make informed travel decisions, reduces uncertainty at the stop, and gives operators a way to hear from riders.

**Live demo:** https://imamkabir.github.io/smart-transport-info-system/

## Features

| Feature | What it does |
|---|---|
| **Journey planner** | Pick a start and destination stop and a departure time. The planner finds the fastest trips, including trips that need a change of vehicle, and shows departure and arrival times, every stop, distance, and the total fare. |
| **Route information** | Every route with its stops, vehicle type, frequency, operating hours, live running status, service alerts and passenger rating. Each route has a map and a stop list with the next three departures at each stop. |
| **Fare estimates** | Fare calculator with a full breakdown (boarding charge, distance charge, peak surcharge, rounding), a fare rules table, and a fare matrix between every pair of stops on a route. |
| **Vehicle schedules** | A live departure board for the whole network that counts down to the next vehicle, plus a full timetable for any stop, with past departures greyed out and the next one highlighted. |
| **Passenger feedback** | Rate a route from 1 to 5 stars, choose a topic (punctuality, comfort, safety, staff, fare), and leave a comment. Ratings are averaged per route and shown across the app. |
| **Maps** | Google Maps JavaScript API when a key is configured, with an automatic fallback to free OpenStreetMap tiles. |

It also works on phones, supports dark mode, and is keyboard accessible.

## How it works

- **`src/data/network.ts`** holds all the network data: stops (with coordinates), routes, vehicle types, fares and alerts. Replace this file to use the system in another city.
- **`src/lib/planner.ts`** is the journey planner. It runs Dijkstra's shortest path algorithm over (stop, route) states. The cost of a trip is expected minutes: half a headway of waiting when boarding, riding time from distance and vehicle speed, and a penalty for each change. Alternative trips come from re-running the search with routes from the best trip excluded. The chosen trips are then matched against the real timetable for exact times.
- **`src/lib/fares.ts`**: fare = boarding charge + (per km rate × road distance), plus a peak surcharge on minibuses and shared cabs, rounded up to the nearest ₦50.
- **`src/lib/schedule.ts`** generates timetables from each route's first departure, last departure and headway, offset by travel time to each stop, in both directions.
- **`src/lib/feedback.ts`** stores feedback in the browser (localStorage) so the demo runs without a server. It is the only file that touches storage, so moving to a real database means changing this one file.
- Road distance is estimated as straight-line (haversine) distance × 1.3.

## Run it locally

Requires Node.js 18 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests for planner, fares, schedules, feedback
npm run build      # production build in dist/
```

### Google Maps

Create a `.env` file in the project root:

```
VITE_GOOGLE_MAPS_API_KEY=your_key_here
```

Get a key from the [Google Cloud console](https://console.cloud.google.com/google/maps-apis) with the **Maps JavaScript API** enabled, and restrict it to your site's domain. Without a key the app uses OpenStreetMap automatically.

For the live GitHub Pages site, add the key as a repository secret named `VITE_GOOGLE_MAPS_API_KEY` (Settings, Secrets and variables, Actions). The deploy workflow passes it to the build.

## Deployment

Every push to `main` runs the tests, builds the site and deploys it to GitHub Pages (`.github/workflows/deploy.yml`).

## Tech stack

React 18, TypeScript, Vite, Google Maps JavaScript API (`@vis.gl/react-google-maps`), Leaflet with OpenStreetMap, Vitest.

## Note on data

The stops, routes, fares and timetables are sample data for demonstration. A transport operator would replace `src/data/network.ts` with its own data or load it from an API.

## License

MIT
