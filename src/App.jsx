import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Spinner } from './components/ui';
import AppShell from './components/AppShell';

// Lazy-loaded so the very first paint only has to download/parse the
// current route's code (plus whatever AppShell/context always needs) —
// previously every page was bundled eagerly into one ~900KB chunk, so
// opening the site paid for Analytics' recharts and Timetable's OCR
// engine before you'd even seen the login screen. Each import() becomes
// its own chunk, fetched only when that route is actually visited.
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Setup = lazy(() => import('./pages/Setup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Subjects = lazy(() => import('./pages/Subjects'));
const Timetable = lazy(() => import('./pages/Timetable'));
const Attendance = lazy(() => import('./pages/Attendance'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Tools = lazy(() => import('./pages/Tools'));
const Holidays = lazy(() => import('./pages/Holidays'));
const Exams = lazy(() => import('./pages/Exams'));
const Rooms = lazy(() => import('./pages/Rooms'));
const Settings = lazy(() => import('./pages/Settings'));

const START_PAGE_PATH = { dashboard: '/', timetable: '/timetable', rooms: '/rooms' };

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.setupCompleted) return <Navigate to="/setup" replace />;
  return children;
}

/** Honors Settings > "Default starting page" for the bare "/" route only — direct links to /timetable etc. always work regardless of the preference. */
function DefaultStartPage({ children }) {
  const { user } = useAuth();
  const target = START_PAGE_PATH[user?.defaultStartPage] || '/';
  if (target !== '/') return <Navigate to={target} replace />;
  return children;
}

function RequireSetup({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RedirectIfAuthed({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenSpinner />;
  if (user) return <Navigate to={user.setupCompleted ? START_PAGE_PATH[user.defaultStartPage] || '/' : '/setup'} replace />;
  return children;
}

function FullScreenSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size={32} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <Suspense fallback={<FullScreenSpinner />}>
            <Routes>
              <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
              <Route path="/signup" element={<RedirectIfAuthed><Signup /></RedirectIfAuthed>} />
              <Route path="/forgot-password" element={<RedirectIfAuthed><ForgotPassword /></RedirectIfAuthed>} />
              <Route path="/setup" element={<RequireSetup><Setup /></RequireSetup>} />

              <Route element={<RequireAuth><AppShell /></RequireAuth>}>
                <Route path="/" element={<DefaultStartPage><Dashboard /></DefaultStartPage>} />
                <Route path="/subjects" element={<Subjects />} />
                <Route path="/timetable" element={<Timetable />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/tools" element={<Tools />} />
                <Route path="/holidays" element={<Holidays />} />
                <Route path="/exams" element={<Exams />} />
                <Route path="/rooms" element={<Rooms />} />
                <Route path="/settings" element={<Settings />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
