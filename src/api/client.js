// In local dev this stays '/api' and Vite's dev-server proxy forwards it to
// the backend (see vite.config.js). In production the frontend and backend
// are deployed to different domains (Vercel + Render), so VITE_API_BASE_URL
// points straight at the deployed backend, e.g. https://your-api.onrender.com/api
const BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const TOKEN_KEY = 'bunkmanager_token';

// "Stay signed in" (checked, default) keeps the token in localStorage, so it
// survives closing the browser. Unchecked stores it in sessionStorage
// instead, so it's gone once the tab/browser closes.
function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed: ${res.status}`);
    err.status = res.status;
    err.details = data && data.details;
    throw err;
  }
  return data;
}

export const api = {
  // Auth
  signup: (payload) => request('/auth/signup', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  requestOtp: (mobileNumber) =>
    request('/auth/forgot-password/request-otp', { method: 'POST', body: { mobileNumber }, auth: false }),
  resetPassword: (payload) =>
    request('/auth/forgot-password/reset', { method: 'POST', body: payload, auth: false }),
  me: () => request('/auth/me'),
  updateProfile: (payload) => request('/auth/me', { method: 'PUT', body: payload }),
  logout: (fcmToken) => request('/auth/logout', { method: 'POST', body: fcmToken ? { fcmToken } : undefined }),

  // Setup
  completeSetup: (payload) => request('/setup', { method: 'POST', body: payload }),
  startNewSemester: (payload) => request('/setup/new-semester', { method: 'POST', body: payload }),
  listSemesters: () => request('/setup/semesters'),

  // Subjects
  listSubjects: (search) => request(`/subjects${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  createSubject: (payload) => request('/subjects', { method: 'POST', body: payload }),
  bulkCreateSubjects: (subjects) => request('/subjects/bulk', { method: 'POST', body: { subjects } }),
  updateSubject: (id, payload) => request(`/subjects/${id}`, { method: 'PUT', body: payload }),
  deleteSubject: (id) => request(`/subjects/${id}`, { method: 'DELETE' }),

  // Timetable
  getTimetable: () => request('/timetable'),
  setTimetable: (slots) => request('/timetable', { method: 'POST', body: { slots } }),
  weeklyAnalysis: () => request('/timetable/weekly-analysis'),

  // Attendance
  getDayLectures: (date) => request(`/attendance/day/${date}`),
  addExtraLecture: (payload) => request('/attendance/extra', { method: 'POST', body: payload }),
  markLecture: (id, status) => request(`/attendance/${id}`, { method: 'PATCH', body: { status } }),
  markDay: (date, status) => request('/attendance/mark-day', { method: 'POST', body: { date, status } }),
  backfillBunks: (subjectId, bunked) =>
    request(`/attendance/subjects/${subjectId}/backfill-bunks`, { method: 'POST', body: { bunked } }),
  overview: () => request('/attendance/overview'),
  subjectAnalytics: () => request('/attendance/subjects'),
  facultyAnalytics: () => request('/attendance/faculty'),
  monthlyReport: () => request('/attendance/reports/monthly'),
  calendar: (month, year) => request(`/attendance/calendar?month=${month}&year=${year}`),
  calculator: () => request('/attendance/calculator'),
  simulate: (date) => request(`/attendance/simulate?date=${date}`),
  insights: () => request('/attendance/insights'),

  // Holidays
  listHolidays: () => request('/holidays'),
  createHoliday: (payload) => request('/holidays', { method: 'POST', body: payload }),
  deleteHoliday: (id) => request(`/holidays/${id}`, { method: 'DELETE' }),

  // Notifications
  registerFcmToken: (fcmToken) => request('/notifications/register-token', { method: 'POST', body: { fcmToken } }),
  removeFcmToken: (fcmToken) => request('/notifications/token', { method: 'DELETE', body: { fcmToken } }),
  listNotifications: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/notifications${qs ? `?${qs}` : ''}`);
  },
  unreadNotificationCount: () => request('/notifications/unread-count'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PATCH' }),
};

export function setToken(token, staySignedIn = true) {
  if (staySignedIn) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
  }
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}
export { getToken };
