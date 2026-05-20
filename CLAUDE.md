# Layover — CLAUDE.md

## Project Overview

Layover is an airport layover itinerary generator. You're stuck at an airport with 2–4 hours — enter your airport, terminal, layover duration, and 2–3 preference tags. The app fetches real POI data from Google Places, passes it to Claude as context, and generates a timed itinerary of stops with walking time between each, a mandatory TSA re-entry buffer at the end, and renders your route as a walking path on a Mapbox map.

**Core user journey:**
1. Enter airport, terminal, layover duration, and preference tags (food, quiet, drinks, shopping, walking)
2. Server fetches POIs from Google Places filtered by airport and terminal
3. Claude generates a structured JSON itinerary from the POI data
4. Constraint scheduler validates total time fits within layover minus TSA buffer
5. Mapbox renders the route as an animated walking path with numbered stop markers
6. User tweaks the itinerary via a chat interface — natural language patches the JSON, map re-renders

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + TailwindCSS + Mapbox GL JS |
| Backend | Python + FastAPI |
| ORM | SQLAlchemy 2.0 (async) + Alembic (migrations) |
| Database | Supabase (hosted PostgreSQL) |
| Auth | Supabase Auth — JWT verified server-side in FastAPI middleware |
| LLM | Claude API (claude-sonnet-4-20250514) via anthropic Python SDK |
| POI Data | Google Places API (Nearby Search) |
| Routing | Mapbox Directions API (walking profile) |
| Deployment | Railway (FastAPI backend), Vercel (Next.js frontend) |

---

## Project Structure

```
layover/
├── client/                          # Next.js frontend (App Router)
│   ├── app/
│   │   ├── layout.tsx               # Root layout — navbar, auth provider
│   │   ├── page.tsx                 # Landing page (/)
│   │   ├── app/
│   │   │   └── page.tsx             # Main app page (/app)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── history/
│   │       └── page.tsx
│   ├── components/
│   │   ├── Map/                     # Mapbox map, markers, route layer
│   │   ├── Itinerary/               # Timeline, stop cards
│   │   └── Chat/                    # Chat input, message list
│   ├── lib/
│   │   ├── api.ts                   # Typed fetch wrapper — attaches Supabase token
│   │   ├── supabase.ts              # Supabase browser client singleton
│   │   └── types.ts                 # Shared TypeScript types
│   ├── context/
│   │   └── AuthContext.tsx          # Supabase Auth session state
│   └── next.config.ts
│
├── server/                          # FastAPI backend
│   ├── main.py                      # FastAPI app, router mounts, CORS
│   ├── database.py                  # SQLAlchemy async engine + session factory
│   ├── models.py                    # SQLAlchemy ORM models
│   ├── schemas.py                   # Pydantic request/response schemas
│   ├── middleware/
│   │   └── auth.py                  # Supabase JWT verification — require_user + optional_user
│   ├── routers/
│   │   ├── airports.py
│   │   ├── pois.py
│   │   └── itineraries.py
│   ├── services/
│   │   ├── places_service.py        # Google Places API + POI caching
│   │   ├── claude_service.py        # Claude API — generate_itinerary + patch_itinerary
│   │   ├── scheduler_service.py     # Constraint scheduling — pure function
│   │   └── directions_service.py    # Mapbox Directions API
│   ├── alembic/                     # Alembic migration files
│   ├── alembic.ini
│   ├── seed.py                      # Airport seed data script
│   └── requirements.txt
│
└── CLAUDE.md
```

---

## Database Schema

Migrations are managed by Alembic. The schema below maps directly to SQLAlchemy ORM models in `server/models.py`. There is **no `users` table** — user identity is owned entirely by Supabase Auth. We store Supabase's `auth.users.id` as a plain `UUID` in our tables without a foreign key constraint (Supabase Auth lives in a separate schema).

```sql
-- Airport reference data (seeded manually via seed.py)
CREATE TABLE airports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iata_code VARCHAR(3) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  city VARCHAR(100) NOT NULL,
  terminal_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- POI cache — populated from Google Places, refreshed every 7 days
CREATE TABLE pois (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_iata VARCHAR(3) NOT NULL REFERENCES airports(iata_code),
  terminal VARCHAR(20) NOT NULL,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL,   -- 'food', 'drinks', 'shopping', 'quiet', 'walking'
  lat DECIMAL(10, 7) NOT NULL,
  lng DECIMAL(10, 7) NOT NULL,
  google_place_id VARCHAR(255) UNIQUE NOT NULL,
  rating DECIMAL(2, 1),
  address TEXT,
  cached_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated itineraries
CREATE TABLE itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,                          -- NULL for anonymous; Supabase auth.users.id
  airport_iata VARCHAR(3) NOT NULL,
  terminal VARCHAR(20) NOT NULL,
  duration_minutes INT NOT NULL,
  preferences TEXT[] NOT NULL,
  itinerary_json JSONB NOT NULL,
  route_geojson JSONB,                   -- cached Mapbox Directions route
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat message history per itinerary (for context window management)
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,             -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Conventions

### General
- Use `async`/`await` throughout — FastAPI is async-native, all DB calls use SQLAlchemy async sessions
- All exceptions must be caught and raised as FastAPI `HTTPException` with appropriate status codes — never let unhandled exceptions bubble to the client
- Never expose stack traces or internal error detail in production responses
- Use environment variables for all secrets — never hardcode API keys or tokens
- Commit messages follow Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`

### Backend (FastAPI / Python)
- Routers handle HTTP request/response only — all business logic lives in `services/`
- All DB access goes through the SQLAlchemy async session injected via FastAPI's `Depends()` — never import the engine directly in a router
- Use SQLAlchemy ORM or `text()` with bound parameters always — never f-strings or string concatenation in SQL
- Pydantic schemas in `schemas.py` define all request bodies and response shapes — never return raw ORM model instances from a route
- The LLM never touches Mapbox directly — `claude_service.py` outputs structured JSON only, the frontend handles all map rendering
- `claude_service.py` has exactly two exported functions: `generate_itinerary()` and `patch_itinerary()` — keep them separate, no shared state
- `scheduler_service.py` is a pure function module with no side effects — receives stops and constraints, returns a validated list or raises `SchedulingError`
- Google Places results are always written to the `pois` table before being forwarded to Claude — never pass raw uncached Place data to the LLM
- POI cache is stale after 7 days — check `cached_at` before deciding whether to call the Places API
- `directions_service.py` calls the Mapbox Directions API server-side — the Mapbox secret token never leaves the server

### Auth (Supabase)
- Supabase Auth owns all user identity — we have no `users` table
- The frontend uses `@supabase/ssr` (`createBrowserClient`) for sign-up, sign-in, and session management
- Every authenticated API request from the frontend includes `Authorization: Bearer <supabase_access_token>`
- FastAPI's `auth.py` verifies the JWT using `SUPABASE_JWT_SECRET` — no Supabase API call on every request, just local JWT verification
- Two FastAPI dependencies exported from `auth.py`:
  - `require_user` — raises `HTTPException(401)` if token is missing or invalid, returns `{"sub": uuid, "email": str}`
  - `optional_user` — returns the same dict if a valid token is present, returns `None` if not — used on routes that work anonymously but can optionally save to a user's account
- Use `user["sub"]` as the `user_id` UUID stored in our tables

### Frontend (Next.js / TypeScript)
- All backend API calls go through `client/lib/api.ts` — never call `fetch` directly in a component
- `api.ts` reads the current Supabase session and attaches `Authorization: Bearer <token>` on every request automatically
- Supabase client initialized once in `client/lib/supabase.ts` via `createBrowserClient()` — import this singleton everywhere, never call `createBrowserClient()` inside a component
- Auth session managed in `AuthContext.tsx` via Supabase's `onAuthStateChange` listener
- Mapbox GL JS initialized once in `MapView.tsx` — map instance lives in a `useRef`, never in React state
- Route rendering: `map.addSource` + `map.addLayer` with a GeoJSON LineString — never use the `mapbox-gl-directions` plugin
- Stop markers: `map.addSource` (GeoJSON FeatureCollection) + circle layer + symbol layer for numbers — not `new mapbox.Marker()` in a loop
- On marker click: `map.on('click', layerId, ...)` popup — not per-marker event listeners
- On itinerary patch: `map.getSource('route').setData()` and `map.getSource('stops').setData()` — never remove and re-add layers
- Itinerary JSON is the single source of truth — chat patches the JSON, `useEffect` triggers map re-render
- TailwindCSS utility classes only — no inline styles, no separate CSS files
- All components and pages are TypeScript — no `any`, use shared types from `lib/types.ts`
- Every page must handle loading state and error state explicitly

### Naming
- Python files: `snake_case.py`
- TypeScript files: `camelCase.ts` for utilities, `PascalCase.tsx` for components and pages
- DB columns: `snake_case`
- Python variables/functions: `snake_case`
- TypeScript variables/functions: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE` in both languages
- React components: `PascalCase`

---

## Core Algorithm — Constraint-Based Itinerary Scheduler

Lives in `server/services/scheduler_service.py` as a pure function module. Receives stops from Claude's JSON output, layover duration, and TSA buffer. Returns a validated list of stops or raises `SchedulingError` if no valid schedule can be built.

**Itinerary JSON shape (output from Claude, validated by scheduler):**
```json
[
  {
    "stop_number": 1,
    "name": "Caffe Bene",
    "category": "food",
    "description": "Grab a coffee and a sandwich before your flight.",
    "duration_minutes": 25,
    "lat": 40.6413,
    "lng": -73.7781,
    "walking_minutes_to_next": 4
  }
]
```

**Constraint scheduling logic:**
```
1. Receive: stops[] from Claude JSON, layover_minutes, tsa_buffer_minutes (default 30)
2. Compute available_minutes = layover_minutes - tsa_buffer_minutes
3. Compute total_time = sum of all stop duration_minutes + sum of all walking_minutes_to_next
4. If total_time <= available_minutes: itinerary is valid, return as-is
5. If total_time > available_minutes: enter trim loop
   a. Sort stops by priority: preference-matched stops ranked higher, then by duration ascending
   b. Remove the lowest-priority stop
   c. Recompute total_time (also drop that stop's outbound walking leg)
   d. Repeat until total_time <= available_minutes or stop count < 2
   e. If stop count < 2 and still over budget: raise SchedulingError("Layover too short to build a valid itinerary")
6. Return trimmed stops list
```

**Walking time injection:**
- Walking times come from Mapbox Directions API (walking profile), called in `directions_service.py`
- `directions_service.py` fetches the full multi-stop route and returns per-leg durations in minutes
- The scheduler receives stops with `walking_minutes_to_next` already populated — it never calls the Directions API itself

**TSA buffer rule:**
- Never include the TSA buffer sentinel in JSON passed to Claude or the scheduler
- The frontend timeline renderer always appends `{ "name": "Return to Security", "duration_minutes": tsa_buffer, "is_tsa_buffer": true }` as a UI-only display row — it is never part of the stored itinerary JSON

---

## API Integrations

### Google Places API
- Server-side only — key never sent to client
- Endpoint: `https://maps.googleapis.com/maps/api/place/nearbysearch/json`
- Params: `location={lat,lng}`, `radius=1000`, `keyword={airport terminal name}`, `type` mapped from preference tag
- Preference tag → Places `type` mapping:
  - `food` → `restaurant|cafe|meal_takeaway`
  - `drinks` → `bar|cafe`
  - `shopping` → `clothing_store|book_store|convenience_store`
  - `quiet` → `library|spa`
  - `walking` → no type filter, radius expanded to 1500m
- Always write results to `pois` table before forwarding to Claude
- On subsequent requests: check `pois` table first, only call Places API if `cached_at` is older than 7 days or no matching rows exist

### Claude API
- Python SDK: `anthropic` (in `requirements.txt`)
- Model: `claude-sonnet-4-20250514`
- Two functions in `claude_service.py`:
  1. **`generate_itinerary(pois, preferences, duration_minutes)`** — system prompt instructs Claude to output ONLY a valid JSON array matching the stop schema above. No prose, no markdown fences, no extra keys. Parse with `json.loads()`, raise `ValueError` if malformed.
  2. **`patch_itinerary(current_itinerary, chat_history, user_message)`** — system prompt instructs Claude to apply the user's natural language request to `current_itinerary` and return ONLY the full updated JSON array. `chat_history` is a list of `{"role": str, "content": str}` passed in full on every call — Claude has no memory between requests. Parse and validate the same way.

### Mapbox Directions API
- Server-side only — secret token never sent to client
- Endpoint: `https://api.mapbox.com/directions/v5/mapbox/walking/{coordinates}`
- Coordinates: `lng,lat;lng,lat;...` semicolon-separated
- GeoJSON LineString in `routes[0]["geometry"]`
- Leg durations in `routes[0]["legs"][i]["duration"]` (seconds → divide by 60)
- Called once after initial generation and once after every patch
- Full GeoJSON stored in `itineraries.route_geojson`

### Mapbox GL JS (client-side)
- Public token only: `NEXT_PUBLIC_MAPBOX_TOKEN` — never the secret token
- Map style: `mapbox://styles/mapbox/dark-v11`
- Route: `map.addSource('route', { type: 'geojson', data: lineStringGeoJSON })` + `map.addLayer({ id: 'route', type: 'line', paint: { 'line-color': '#0066FF', 'line-width': 4 }, layout: { 'line-cap': 'round', 'line-join': 'round' } })`
- Stops: `map.addSource('stops', GeoJSON FeatureCollection)` + circle layer (white fill, `#0066FF` stroke, radius 14) + symbol layer (stop number label)
- On patch update: `map.getSource('route').setData(newGeoJSON)` and `map.getSource('stops').setData(newFeatureCollection)` — never remove and re-add layers

### Supabase Auth (client-side)
- Client initialized in `client/lib/supabase.ts` via `createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)` from `@supabase/ssr`
- `supabase.auth.signUp({ email, password })` and `supabase.auth.signInWithPassword({ email, password })` called from auth form components
- `supabase.auth.onAuthStateChange` listener in `AuthContext.tsx` keeps session in sync across tabs
- `session.access_token` attached as `Authorization: Bearer <token>` by `api.ts` on every backend request
- On sign-out: `supabase.auth.signOut()` — Supabase client clears the session automatically

---

## UI Design Direction

Split screen layout. Left panel (40% width): input form on first load; replaced by itinerary timeline + chat panel after generation. Right panel (60% width): Mapbox map, full height.

Light theme. Background `#F8F9FA`, navy text `#0A1628`, accent `#0066FF`. Map style `mapbox://styles/mapbox/dark-v11`. Route line `#0066FF`, 4px, `line-cap: round`, `line-join: round`. Subtle animated dash offset on the route line for a travel feel.

Stop markers: white circles, navy number, `#0066FF` border. Active marker: solid `#0066FF` fill, white number. Clicking a marker opens a Mapbox popup with stop name, category badge, and duration.

Left panel timeline: each stop is a row — time of day on the left (calculated from now + cumulative durations + walking), stop name + category pill + duration in the center. Walking connectors: dashed vertical line, walking icon, minute count. Final row: red-bordered TSA sentinel — "🛡 Return to Security — 30 min."

Chat input: single-line, pinned to bottom of left panel, send button. Message history scrolls above. User messages right-aligned (navy bg, white text). Assistant messages left-aligned (light grey bg, navy text).

Mobile (< 768px): stack vertically. Map on top at 40vh, left panel fills remaining height. Chat input fixed to bottom of screen.

---

## Environment Variables

```
# server/.env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_JWT_SECRET=...              # Supabase dashboard → Settings → API → JWT Secret
DATABASE_URL=postgresql+asyncpg://postgres:password@db.your-project.supabase.co:5432/postgres
GOOGLE_PLACES_KEY=...
ANTHROPIC_API_KEY=...
MAPBOX_SECRET_TOKEN=sk...
CLIENT_URL=http://localhost:3000
PORT=8000

# client/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_MAPBOX_TOKEN=pk...
```

---

## Build Order

Build strictly in this sequence. Do not move forward until the current step works end to end.

1. DB schema + FastAPI scaffold + SQLAlchemy async setup + Alembic migration + airport seed data (YYZ, JFK, LAX)
2. Supabase Auth — sign-up/sign-in in Next.js using Supabase client, JWT verification middleware in FastAPI, `require_user` + `optional_user` dependencies
3. Google Places integration — `places_service.py`, POI fetching by airport/terminal/preferences, cache in `pois` table
4. Claude itinerary generation — `claude_service.generate_itinerary()`, `scheduler_service.schedule_itinerary()`, `POST /itineraries` endpoint
5. Mapbox map setup — `MapView.tsx`, route line layer, stop markers, popup on click
6. Full generate flow end to end — form → FastAPI → Claude → scheduler → Directions API → map render
7. Chat patch interface — `claude_service.patch_itinerary()`, chat UI, map re-render on patch
8. Auth-gated itinerary saving — persist `user_id` on itinerary rows, `GET /itineraries/my` history page
9. Polish — loading states, error states, empty states, mobile layout
10. Deploy to Railway (FastAPI) + Vercel (Next.js)