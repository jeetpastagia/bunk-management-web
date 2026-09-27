import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useAuth } from '../context/AuthContext';
import { usePrefersReducedMotion } from '../hooks/useMotionPreferences';
import NotificationBell from './NotificationBell';
import PageTransition from './PageTransition';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: GaugeIcon },
  { to: '/subjects', label: 'Subjects', icon: BookIcon },
  { to: '/timetable', label: 'Timetable', icon: GridIcon },
  { to: '/attendance', label: 'Mark Attendance', icon: CheckIcon },
  { to: '/calendar', label: 'Calendar', icon: CalendarIcon },
  { to: '/analytics', label: 'Analytics', icon: ChartIcon },
  { to: '/tools', label: 'Smart Tools', icon: BoltIcon },
  { to: '/holidays', label: 'Holidays', icon: SunIcon },
  { to: '/exams', label: 'Exams', icon: ExamIcon },
  { to: '/rooms', label: 'Study Room', icon: RoomIcon },
  { to: '/settings', label: 'Settings', icon: GearIcon },
];

/**
 * A solid brass highlight that slides/resizes to sit behind whichever
 * NavLink currently has aria-current="page" (set automatically by NavLink
 * itself, so this never needs its own copy of the active-route matching
 * logic). Reading layout via getBoundingClientRect after each route change
 * and animating a single absolutely-positioned div is far cheaper than
 * animating every nav item individually.
 */
function ActiveNavIndicator({ containerRef }) {
  const indicatorRef = useRef(null);
  const location = useLocation();
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    const indicator = indicatorRef.current;
    if (!container || !indicator) return;
    const activeLink = container.querySelector('a[aria-current="page"]');
    if (!activeLink) {
      indicator.style.opacity = '0';
      return;
    }
    const cRect = container.getBoundingClientRect();
    const aRect = activeLink.getBoundingClientRect();
    const top = aRect.top - cRect.top;

    if (reducedMotion) {
      indicator.style.transition = 'none';
      indicator.style.transform = `translateY(${top}px)`;
      indicator.style.height = `${aRect.height}px`;
      indicator.style.opacity = '1';
      return;
    }
    gsap.to(indicator, { y: top, height: aRect.height, opacity: 1, duration: 0.35, ease: 'power2.out' });
  }, [location.pathname, containerRef, reducedMotion]);

  return (
    <div
      ref={indicatorRef}
      aria-hidden="true"
      className="absolute left-0 right-0 rounded-xl bg-[var(--color-brand)] pointer-events-none opacity-0"
      style={{ top: 0, height: 0 }}
    />
  );
}

/** Top-right avatar + name, opening a small dropdown with Settings/Logout — replaces the old sidebar-bottom user block to match the reference's top navbar layout. */
function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 pl-1.5 pr-2 py-1 rounded-xl hover:bg-[var(--tint-5)] transition-colors"
      >
        <div className="w-9 h-9 rounded-full bg-[var(--color-brand)] flex items-center justify-center font-display font-semibold text-sm text-[var(--color-sidebar)]">
          {(user?.studentName || 'U')[0].toUpperCase()}
        </div>
        <span className="hidden sm:block text-sm font-medium">{user?.studentName?.split(' ')[0] || 'Student'}</span>
        <ChevronDownIcon className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 glass-raised rounded-2xl overflow-hidden z-30">
          <button
            onClick={() => { setOpen(false); navigate('/settings'); }}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left hover:bg-[var(--tint-5)] transition-colors"
          >
            <GearIcon className="w-4 h-4 text-[var(--color-text-muted)]" /> Settings
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left text-[var(--color-danger)] hover:bg-[var(--tint-5)] transition-colors"
          >
            <LogoutIcon className="w-4 h-4" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppShell() {
  const navigate = useNavigate();
  const sidebarNavRef = useRef(null);
  const [searchValue, setSearchValue] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchValue.trim();
    navigate(q ? `/subjects?search=${encodeURIComponent(q)}` : '/subjects');
  };

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-[var(--color-sidebar)] border-r border-[var(--color-border)] p-5 sticky top-0 h-screen">
        <div className="flex items-center gap-2.5 px-1 mb-8">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-brand)] flex items-center justify-center text-[var(--color-sidebar)]">
            <CapIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="font-display font-semibold leading-tight">Bunk Manager</div>
            <div className="text-[10px] text-[var(--color-text-faint)] tracking-wide">TRACK SMART · BUNK SMARTER</div>
          </div>
        </div>

        <nav ref={sidebarNavRef} className="relative flex flex-col gap-1 flex-1">
          <ActiveNavIndicator containerRef={sidebarNavRef} />
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'text-[var(--color-sidebar)] font-semibold' : 'text-[var(--color-text-muted)] hover:bg-[var(--tint-5)] hover:text-[var(--color-text)]'
                }`
              }
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <div className="hidden md:flex items-center gap-4 px-8 py-4 bg-[var(--color-sidebar)] border-b border-[var(--color-border)] sticky top-0 z-20">
          <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
            <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
            <input
              type="search"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search subjects, classes…"
              className="w-full bg-[var(--tint-5)] border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-[var(--color-brand)] transition-colors placeholder:text-[var(--color-text-faint)]"
            />
          </form>
          <div className="flex-1" />
          <NotificationBell />
          <UserMenu />
        </div>

        <div className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
          <div className="flex md:hidden justify-end items-center gap-2 mb-4">
            <NotificationBell />
            <UserMenu />
          </div>
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </main>

      {/* Mobile bottom nav: solid (not glass) so scrolling content behind it never bleeds through, and scrollable so all screens are reachable, not just the first 5. */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--color-sidebar)] border-t border-[var(--color-border)] flex overflow-x-auto py-2 z-20">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium shrink-0 ${
                isActive ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-faint)]'
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
function ExamIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" strokeLinejoin="round"/><path d="M14 3v5h5" strokeLinejoin="round"/><path d="M8 12.5h6M8 15.5h8M9 9.5h2" strokeLinecap="round"/></svg>; }
function CapIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M2 9.5 12 5l10 4.5-10 4.5-10-4.5Z" strokeLinejoin="round"/><path d="M6 11.5V16c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 10v5" strokeLinecap="round"/></svg>; }
function SearchIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2" strokeLinecap="round"/></svg>; }
function ChevronDownIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
