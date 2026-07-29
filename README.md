# Bunk Manager — Web App (Phase 2)

The responsive React website, built against the tested backend API from
Phase 1. Every screen calls real endpoints — nothing here is mocked or
hardcoded.

## Design

- **Palette**: deep charcoal-navy (`#0B0E14` / `#131720`) with glass cards,
  electric indigo brand (`#6E5BFF`) + amber accent (`#F2B84B`), and a
  separate semantic safe/risky/danger scale so attendance status is never
  confused with brand color.
- **Type**: Space Grotesk (headers), Inter (body), JetBrains Mono (every
  number — percentages, counts, dates read like instrument data).
- **Signature element — the Bunk Gauge**: a semicircular fuel-gauge dial
  with Safe/Risky/Danger zones and a needle at the current percentage
  (`src/components/BunkGauge.jsx`). It's the dashboard hero and reappears
  wherever a percentage needs to be read at a glance.

## Screens

- Login / Signup / Forgot password (OTP flow)
- First-time setup wizard (mandatory semester start date)
- Dashboard — Bunk Gauge, monthly/safe-bunks/lectures-needed stat cards,
  today's lectures with one-tap marking, AI insights
- Subjects — CRUD, bulk add (line-per-subject), search
- Timetable — weekly grid editor (day × lecture number → subject), weekly
  analysis
- Mark Attendance — date picker, lecture-wise status buttons, mark-whole-day
- Calendar — color-coded month grid (green/red/grey/blue per spec), tap a
  date for its lecture history
- Analytics — subject bar chart + cards, faculty ranking with
  most-attended/most-bunked
- Smart Tools — next-lecture calculator, safe-bunk predictor,
  lectures-needed-per-target, future lecture simulator (Safe/Risky/Danger)
- Holidays — manual/college/national entries
- Settings — profile, semester archive & rollover (with optional
  timetable/subject reuse)

## Running it

```bash
npm install
npm run dev      # proxies /api to http://localhost:5000 by default
```

Point it at a different backend with `VITE_API_PROXY_TARGET`:

```bash
VITE_API_PROXY_TARGET=https://your-api.example.com npm run dev
```

For production, `npm run build` outputs static files in `dist/` — deploy
behind any static host, with `/api` reverse-proxied to the backend.

## Verified

`npm run build` completes clean (616 modules, no errors/warnings) — the
same "prove it before shipping it" standard used for the backend's test
suite. This sandbox has no live backend to exercise the network calls
against yet; run it against the Phase 1 API with a real `MONGO_URI` as your
next step, and treat that first end-to-end pass as the thing to test
manually.

## Not in this phase

Android app (Flutter), Admin Panel, OCR timetable upload, push
notifications, PDF export, home-screen widgets — each is its own focused
build, listed as follow-ups in the backend README.
