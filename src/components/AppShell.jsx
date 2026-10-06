import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { usePrefersReducedMotion } from '../hooks/useMotionPreferences';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import NotificationBell from './NotificationBell';
import PageTransition from './PageTransition';
import BunkAI, { BunkAIIcon } from './BunkAI';

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

/**
 * Top-right avatar + name, opening a small dropdown with Settings/Logout —
 * replaces the old sidebar-bottom user block to match the reference's top
 * navbar layout. Rendered both in the desktop top bar (permanently dark,
 * `chrome` true) and the mobile row (follows the page's own light/dark
 * theme, `chrome` false) — only the trigger's classes differ between the
 * two; the dropdown menu always uses the normal theme-flipping tokens
 * since it floats as a card over the page, not over the dark bar.
 */
function UserMenu({ chrome = false }) {
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
        className={`flex items-center gap-2.5 pl-1.5 pr-2 py-1 rounded-xl transition-colors ${chrome ? 'hover:bg-[var(--chrome-hover)]' : 'hover:bg-[var(--tint-5)]'}`}
      >
        <div className="w-9 h-9 rounded-full bg-[var(--color-brand)] flex items-center justify-center font-display font-semibold text-sm text-[var(--color-sidebar)]">
          {(user?.studentName || 'U')[0].toUpperCase()}
        </div>
        <span className={`hidden sm:block text-sm font-medium ${chrome ? 'text-[var(--chrome-text)]' : ''}`}>{user?.studentName?.split(' ')[0] || 'Student'}</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${chrome ? 'text-[var(--chrome-text-muted)]' : 'text-[var(--color-text-muted)]'} ${open ? 'rotate-180' : ''}`} />
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

const MAX_SEARCH_RESULTS = 8;

/**
 * Omni-search over everything actually in the app: every nav page (by
 * label — typing "analytics" surfaces the Analytics page) plus every real
 * subject (by name/code/faculty — typing "ardbms" surfaces that subject),
 * fetched once per session since the list is small and rarely changes
 * mid-session. Selecting a subject deep-links into Analytics and
 * scrolls/highlights that exact subject's card (see Analytics.jsx).
 */
function GlobalSearch({ chrome = false }) {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    api.listSubjects().then((res) => setSubjects(res.subjects || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const results = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];

    const pageMatches = NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(q)).map((item) => ({
      type: 'page',
      key: `page-${item.to}`,
      label: item.label,
      sub: 'Page',
      icon: item.icon,
      go: () => navigate(item.to),
    }));

    const subjectMatches = subjects
      .filter((s) => [s.name, s.code, s.facultyName].filter(Boolean).some((f) => f.toLowerCase().includes(q)))
      .map((s) => ({
        type: 'subject',
        key: `subject-${s._id}`,
        label: s.name,
        sub: s.facultyName ? `Subject · ${s.facultyName}` : 'Subject',
        icon: BookIcon,
        go: () => navigate(`/analytics?subject=${s._id}`),
      }));

    return [...pageMatches, ...subjectMatches].slice(0, MAX_SEARCH_RESULTS);
  }, [value, subjects, navigate]);

  const select = (result) => {
    if (!result) return;
    result.go();
    setValue('');
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      select(results[activeIndex] || results[0]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="flex-1 max-w-md relative" ref={containerRef}>
      <SearchIcon className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${chrome ? 'text-[var(--chrome-text-faint)]' : 'text-[var(--color-text-faint)]'}`} />
      <input
        type="search"
        value={value}
        onChange={(e) => { setValue(e.target.value); setOpen(true); setActiveIndex(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search subjects, pages…"
        className={`w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-[var(--color-brand)] transition-colors ${
          chrome
            ? 'bg-[var(--chrome-hover)] border border-[var(--chrome-border)] text-[var(--chrome-text)] placeholder:text-[var(--chrome-text-faint)]'
            : 'bg-[var(--tint-5)] border border-[var(--color-border)] placeholder:text-[var(--color-text-faint)]'
        }`}
      />

      {open && value.trim() && (
        <div className="absolute left-0 right-0 mt-2 glass-raised rounded-2xl overflow-hidden z-30 max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[var(--color-text-faint)]">No matches for "{value.trim()}"</p>
          ) : (
            results.map((r, i) => (
              <button
                key={r.key}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => select(r)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === activeIndex ? 'bg-[var(--tint-8)]' : 'hover:bg-[var(--tint-5)]'}`}
              >
                <r.icon className="w-4 h-4 text-[var(--color-brand)] shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium truncate">{r.label}</span>
                  <span className="block text-xs text-[var(--color-text-faint)] truncate">{r.sub}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Only renders at all when the browser has actually offered an install
 * prompt (Chrome/Edge/Android) — Safari/iOS and Firefox never fire
 * beforeinstallprompt, so there'd be nothing for a button to trigger
 * there; a dead "Install" button is worse than no button.
 */
function InstallButton({ chrome = false }) {
  const { canInstall, promptInstall } = useInstallPrompt();
  if (!canInstall) return null;

  return (
    <button
      onClick={promptInstall}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
        chrome
          ? 'bg-[var(--chrome-hover)] hover:bg-[var(--chrome-border)] border border-[var(--chrome-border)] text-[var(--chrome-text)]'
          : 'bg-[var(--tint-5)] hover:bg-[var(--tint-10)] border border-[var(--color-border)] text-[var(--color-text)]'
      }`}
    >
      <DownloadIcon className="w-4 h-4 text-[var(--color-brand)]" />
      <span className="hidden sm:inline">Install app</span>
    </button>
  );
}

export default function AppShell() {
  const sidebarNavRef = useRef(null);
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      <aside className="chrome-glass hidden md:flex w-64 shrink-0 flex-col border-r border-[var(--chrome-border)] p-5 sticky top-0 h-screen overflow-y-auto">
        <div className="flex items-center gap-2.5 px-1 mb-6">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-brand)] flex items-center justify-center text-[var(--color-sidebar)] shrink-0">
            <CapIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="font-display font-semibold leading-tight text-[var(--chrome-text)]">Bunk Manager</div>
            <div className="text-[10px] text-[var(--chrome-text-faint)] tracking-wide">TRACK SMART · BUNK SMARTER</div>
          </div>
        </div>

        <nav ref={sidebarNavRef} className="relative flex flex-col gap-0.5">
          <ActiveNavIndicator containerRef={sidebarNavRef} />
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'text-[var(--color-sidebar)] font-semibold' : 'text-[var(--chrome-text-muted)] hover:bg-[var(--chrome-hover)] hover:text-[var(--chrome-text)]'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bunk AI launcher — deliberately bigger icon + its own glass-tinted
            pill, so it reads as a distinct feature rather than another page
            link in the list above. */}
        <button
          onClick={() => setAiOpen(true)}
          className="flex items-center gap-3 px-3 py-2.5 mt-2 rounded-xl text-sm font-medium bg-[var(--chrome-hover)] hover:bg-[var(--chrome-border)] border border-[var(--chrome-border)] text-[var(--chrome-text)] transition-colors"
        >
          <BunkAIIcon className="w-6 h-6 shrink-0" />
          Bunk AI
        </button>

        <div className="flex-1 min-h-4" />

        <div className="relative overflow-hidden rounded-2xl bg-[var(--chrome-hover)] border border-[var(--chrome-border)] p-4 shrink-0">
          <LeafIcon className="absolute -right-3 -bottom-3 w-20 h-20 text-[var(--color-brand)]/15" />
          <p className="relative font-display font-semibold text-sm leading-snug text-[var(--chrome-text)]">Smarter Students<br />Bunk Better.</p>
          <p className="relative text-[10px] text-[var(--chrome-text-faint)] mt-1.5 tracking-wide">BUNK MANAGER — TRACK SMART. BUNK SMARTER.</p>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <div className="chrome-glass hidden md:flex items-center gap-4 px-8 py-4 border-b border-[var(--chrome-border)] sticky top-0 z-20">
          <GlobalSearch chrome />
          <div className="flex-1" />
          <InstallButton chrome />
          <NotificationBell chrome />
          <UserMenu chrome />
        </div>

        <div className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
          <div className="flex md:hidden flex-col gap-3 mb-4">
            <GlobalSearch />
            <div className="flex justify-end items-center gap-2">
              <InstallButton />
              <NotificationBell />
              <UserMenu />
            </div>
          </div>
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </main>

      {/* Mobile bottom nav: solid (not glass) so scrolling content behind it never bleeds through, and scrollable so all screens are reachable, not just the first 5. */}
      <nav className="chrome-glass md:hidden fixed bottom-0 left-0 right-0 border-t border-[var(--chrome-border)] flex overflow-x-auto py-2 z-20">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium shrink-0 ${
                isActive ? 'text-[var(--color-brand)]' : 'text-[var(--chrome-text-faint)]'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label.split(' ')[0]}
          </NavLink>
        ))}
        <button
          onClick={() => setAiOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium shrink-0 text-[var(--chrome-text-faint)]"
        >
          <BunkAIIcon className="w-7 h-7" />
          Bunk AI
        </button>
      </nav>

      <BunkAI open={aiOpen} onClose={() => setAiOpen(false)} />
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
function LeafIcon(props) { return <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M20 4C11 4 4 11 4 20c9 0 16-7 16-16Z" /></svg>; }
function SearchIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2" strokeLinecap="round"/></svg>; }
function ChevronDownIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function DownloadIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M12 3v12m0 0 4-4m-4 4-4-4" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
