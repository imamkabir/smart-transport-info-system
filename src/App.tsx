import { useState } from 'react';
import { href, useHashPath } from './router';
import { mapProvider } from './components/TransitMap';
import PlanPage from './pages/PlanPage';
import RoutesPage from './pages/RoutesPage';
import RouteDetailPage from './pages/RouteDetailPage';
import SchedulesPage from './pages/SchedulesPage';
import FaresPage from './pages/FaresPage';
import FeedbackPage from './pages/FeedbackPage';

const NAV = [
  { path: '/', label: 'Plan a trip' },
  { path: '/routes', label: 'Routes' },
  { path: '/schedules', label: 'Schedules' },
  { path: '/fares', label: 'Fares' },
  { path: '/feedback', label: 'Feedback' },
];

function page(path: string) {
  const routeMatch = path.match(/^\/routes\/([\w-]+)$/);
  if (routeMatch) return <RouteDetailPage id={routeMatch[1]} />;
  switch (path) {
    case '/routes':
      return <RoutesPage />;
    case '/schedules':
      return <SchedulesPage />;
    case '/fares':
      return <FaresPage />;
    case '/feedback':
      return <FeedbackPage />;
    default:
      return <PlanPage />;
  }
}

export default function App() {
  const full = useHashPath();
  const path = full.split('?')[0];
  const [menuOpen, setMenuOpen] = useState(false);
  const active = (p: string) => (p === '/' ? path === '/' : path.startsWith(p));

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="topbar">
        <div className="container topbar-inner">
          <a className="brand" href={href('/')}>
            <span className="brand-mark" aria-hidden>
              <svg viewBox="0 0 32 32" width="28" height="28">
                <rect width="32" height="32" rx="8" fill="currentColor" />
                <path d="M9 21V11a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v10M9 17h14M12 24v-3M20 24v-3" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
            </span>
            SmartTransit
          </a>
          <button className="menu-btn" aria-expanded={menuOpen} aria-controls="nav" onClick={() => setMenuOpen((o) => !o)}>
            Menu
          </button>
          <nav id="nav" className={menuOpen ? 'open' : ''} aria-label="Main">
            {NAV.map((n) => (
              <a key={n.path} href={href(n.path)} className={active(n.path) ? 'active' : ''} onClick={() => setMenuOpen(false)} aria-current={active(n.path) ? 'page' : undefined}>
                {n.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main id="main" className="container">{page(path)}</main>

      <footer className="footer">
        <div className="container row between wrap">
          <span>SmartTransit · Smart Transport Information System</span>
          <span className="muted small">Sample network data · Map by {mapProvider}</span>
        </div>
      </footer>
    </>
  );
}
