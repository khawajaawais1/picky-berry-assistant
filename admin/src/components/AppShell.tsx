import type { ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { API_BASE } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button } from './ui';

type IconName =
  | 'overview'
  | 'operations'
  | 'analytics'
  | 'zones'
  | 'map'
  | 'jobs'
  | 'reports'
  | 'users'
  | 'lab'
  | 'audit';

const ICONS: Record<IconName, ReactNode> = {
  overview: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  operations: (
    <>
      <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />
    </>
  ),
  analytics: (
    <>
      <path d="M4 19V5" />
      <path d="M4 15l5-5 4 3 7-8" />
      <path d="M16 5h4v4" />
    </>
  ),
  zones: (
    <>
      <path d="M12 2.5l8.5 5v9l-8.5 5-8.5-5v-9z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  map: (
    <>
      <path d="M9 4.5l-5 2v13l5-2 6 2 5-2v-13l-5 2z" />
      <path d="M9 4.5v13M15 6.5v13" />
    </>
  ),
  jobs: (
    <>
      <path d="M12 3l9 5-9 5-9-5z" />
      <path d="M3 12l9 5 9-5" />
      <path d="M3 16l9 5 9-5" />
    </>
  ),
  reports: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h11l-2 4 2 4H5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 5.5a3 3 0 010 5.8" />
      <path d="M18 14.5c2 .8 3 2.6 3 5.5" />
    </>
  ),
  lab: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 9l3 3-3 3" />
      <path d="M13 15h4" />
    </>
  ),
  audit: (
    <>
      <path d="M6 3h12v18l-6-3-6 3z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
    </>
  ),
};

function Icon({ name }: { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

const NAV = [
  {
    label: 'Monitor',
    items: [
      { to: '/', label: 'Overview', icon: 'overview' as const, end: true },
      { to: '/operations', label: 'Operations', icon: 'operations' as const },
      { to: '/analytics', label: 'Analytics', icon: 'analytics' as const },
    ],
  },
  {
    label: 'Operate',
    items: [
      { to: '/map', label: 'Map', icon: 'map' as const },
      { to: '/zones', label: 'Zones', icon: 'zones' as const },
      { to: '/jobs', label: 'Queue', icon: 'jobs' as const },
      { to: '/moderation', label: 'Moderation', icon: 'reports' as const },
      { to: '/users', label: 'Accounts', icon: 'users' as const },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/lab', label: 'Feature lab', icon: 'lab' as const },
      { to: '/audit', label: 'Audit log', icon: 'audit' as const },
    ],
  },
];

function pageMeta(pathname: string): { title: string; description: string } {
  if (pathname === '/') {
    return {
      title: 'Overview',
      description: 'What the service is doing right now.',
    };
  }
  if (pathname === '/operations') {
    return {
      title: 'Operations',
      description: 'Pipeline health, freshness and the next operator action.',
    };
  }
  if (pathname === '/map') {
    return {
      title: 'Map',
      description: 'Every spot in the pilot area, coloured by its best current score.',
    };
  }
  if (pathname === '/zones') {
    return {
      title: 'Zones',
      description: 'Search the pilot geography and open a zone.',
    };
  }
  if (pathname.startsWith('/zones/')) {
    return {
      title: 'Zone detail',
      description: 'Scores, evidence and recent activity for one zone.',
    };
  }
  if (pathname === '/jobs') {
    return {
      title: 'Queue',
      description: 'What the pipeline has queued, finished or failed.',
    };
  }
  if (pathname === '/moderation') {
    return {
      title: 'Moderation',
      description: 'Triage field reports without inventing a verdict.',
    };
  }
  if (pathname.startsWith('/users/')) {
    return {
      title: 'Account detail',
      description: 'Identity, sessions, activity and the audit trail.',
    };
  }
  if (pathname === '/users') {
    return {
      title: 'Accounts',
      description: 'Who can sign in, and what they have recorded.',
    };
  }
  if (pathname === '/analytics') {
    return {
      title: 'Analytics',
      description: 'Daily volume, coverage and score distribution.',
    };
  }
  if (pathname === '/lab') {
    return {
      title: 'Feature lab',
      description: 'Exercise the API and trigger pipeline work.',
    };
  }
  if (pathname === '/audit') {
    return {
      title: 'Audit log',
      description: 'Every privileged change, with its request id.',
    };
  }
  return { title: 'Not found', description: 'This route does not exist.' };
}

export function AppShell() {
  const { session, signOut } = useAuth();
  const location = useLocation();
  const meta = pageMeta(location.pathname);
  const initials = (session?.user.nickname ?? session?.user.email ?? '?')
    .trim()
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link to="/" className="brand">
          <img src="/berry.svg" alt="" width={34} height={34} />
          <span>
            <strong>Picky</strong>
            <small>Operator console</small>
          </span>
        </Link>

        <nav className="nav" aria-label="Console sections">
          {NAV.map((group) => (
            <div key={group.label} className="nav-group">
              <p className="nav-label">{group.label}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={'end' in item ? item.end : false}
                  className={({ isActive }) =>
                    `nav-link${isActive ? ' active' : ''}`
                  }
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="conn-dot" aria-hidden="true" />
          <span className="mono small truncate" title={API_BASE}>
            {API_BASE}
          </span>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">
            <p className="eyebrow">E5 · Admin</p>
            <p className="topbar-heading">{meta.title}</p>
          </div>
          <div className="topbar-actions">
            <div className="account-chip">
              <span className="avatar" aria-hidden="true">
                {initials}
              </span>
              <span className="account-name">
                <strong>{session?.user.nickname ?? session?.user.email}</strong>
                <small>{session?.user.role}</small>
              </span>
            </div>
            <Button variant="ghost" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </header>

        <main id="main" className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
