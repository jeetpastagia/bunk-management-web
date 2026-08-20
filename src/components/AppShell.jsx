import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: GaugeIcon },
  { to: '/subjects', label: 'Subjects', icon: BookIcon },
  { to: '/timetable', label: 'Timetable', icon: GridIcon },
  { to: '/attendance', label: 'Mark Attendance', icon: CheckIcon },
  { to: '/calendar', label: 'Calendar', icon: CalendarIcon },
  { to: '/analytics', label: 'Analytics', icon: ChartIcon },
  { to: '/tools', label: 'Smart Tools', icon: BoltIcon },
  { to: '/holidays', label: 'Holidays', icon: SunIcon },
  { to: '/rooms', label: 'Rooms', icon: RoomIcon },
  { to: '/settings', label: 'Settings', icon: GearIcon },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-64 shrink-0 flex-col glass-raised border-r border-[var(--color-border)] p-5 sticky top-0 h-screen">
        <div className="flex items-center gap-2.5 px-1 mb-8">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-brand)] flex items-center justify-center font-display font-bold text-white">B</div>
          <div>
            <div className="font-display font-semibold leading-tight">Bunk Manager</div>
            <div className="text-[10px] text-[var(--color-text-faint)] tracking-wide">TRACK SMART · BUNK SMARTER</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-[var(--color-brand)]/15 text-[var(--color-brand-soft)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--tint-5)] hover:text-[var(--color-text)]'
                }`
              }
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="pt-4 border-t border-[var(--color-border-soft)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--tint-8)] flex items-center justify-center font-display font-semibold text-sm">
            {(user?.studentName || 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user?.studentName || 'Student'}</div>
            <div className="text-xs text-[var(--color-text-faint)] truncate">{user?.collegeName || ''}</div>
          </div>
          <button onClick={handleLogout} aria-label="Log out" className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors">
            <LogoutIcon className="w-4.5 h-4.5" />
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-4 md:p-8 pb-24 md:pb-8">
        <div className="flex justify-end items-center gap-2 mb-4 md:mb-6">
          <NotificationBell />
          <button
            onClick={handleLogout}
            aria-label="Log out"
            className="md:hidden w-10 h-10 rounded-xl bg-[var(--tint-5)] hover:bg-[var(--tint-10)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
          >
            <LogoutIcon className="w-4.5 h-4.5" />
          </button>
        </div>
        <Outlet />
      </main>

      {/* Mobile bottom nav: solid (not glass) so scrolling content behind it never bleeds through, and scrollable so all screens are reachable, not just the first 5. */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--color-bg)] border-t border-[var(--color-border)] flex overflow-x-auto py-2 z-20">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium shrink-0 ${
                isActive ? 'text-[var(--color-brand-soft)]' : 'text-[var(--color-text-faint)]'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label.split(' ')[0]}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function GaugeIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M4 14a8 8 0 1 1 16 0" strokeLinecap="round"/><path d="M12 14l4-4" strokeLinecap="round"/><circle cx="12" cy="14" r="1.3" fill="currentColor" stroke="none"/></svg>; }
function BookIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"/><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20"/></svg>; }
function GridIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>; }
function CheckIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 12l3 3 5-6" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function CalendarIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round"/></svg>; }
function ChartIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round"/></svg>; }
function BoltIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" strokeLinejoin="round"/></svg>; }
function SunIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8" strokeLinecap="round"/></svg>; }
function GearIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.6V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.6 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>; }
function LogoutIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M9 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function RoomIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="3.5"/><path d="M20.5 20v-2a4 4 0 0 0-3-3.87M14.5 3.3a3.5 3.5 0 0 1 0 6.7" strokeLinecap="round"/></svg>; }
