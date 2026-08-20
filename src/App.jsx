import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Spinner } from './components/ui';
import AppShell from './components/AppShell';

import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import Subjects from './pages/Subjects';
import Timetable from './pages/Timetable';
import Attendance from './pages/Attendance';
import CalendarPage from './pages/CalendarPage';
import Analytics from './pages/Analytics';
import Tools from './pages/Tools';
import Holidays from './pages/Holidays';
import Rooms from './pages/Rooms';
import Settings from './pages/Settings';

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
              <Route path="/rooms" element={<Rooms />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
