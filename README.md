# Paint Client

A web application for assessing residential property paint conditions. It uses computer vision models (Moondream) to analyze house images and determine whether properties need repainting.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Configure the backend URL in `.env`:

```
NEXT_PUBLIC_API_BASE=http://localhost:8080
```

---

## Tech Stack

- **Next.js 15 / React 19** — App Router, mostly client components
- **TypeScript** — strict types throughout
- **Tailwind CSS 4** — utility-first styling
- **Recharts** — charts in the analytics dashboard
- **Server-Sent Events (SSE)** — real-time job streaming
- **Cookie-based sessions** — no localStorage tokens

---

## Routes

| Route | Purpose |
|---|---|
| `/` | Main search interface |
| `/login` | Login page |
| `/register` | Registration page |
| `/analytics` | Analytics & usage dashboards |

All routes except `/login` and `/register` are protected by `AuthGuard`, which calls `GET /auth/me` and redirects unauthenticated users.

---

## File Structure

```
app/
  page.tsx                  # Home — renders ZipcodeClient
  ZipcodeClient.tsx         # Core search/results component
  login/page.tsx            # Login page
  register/page.tsx         # Register page
  analytics/
    page.tsx                # Analytics hub
    AnalyticsDashboard.tsx  # Model/condition analytics
    Usagedashboard.tsx      # API usage/cost metrics
    Sidebar.tsx             # Tab navigation

components/
  auth/
    AuthGuard.tsx           # Protects routes
    LoginForm.tsx
    RegisterForm.tsx
    LogoutButton.tsx
  house/
    HouseCard.tsx           # Property card with image carousel
    HouseInfo.tsx           # Address, defects panel
    ImageLightbox.tsx       # Full-screen image viewer
    SkeletonCard.tsx        # Loading placeholder
  HistorySidebar.tsx        # Past searches sidebar

lib/
  auth.ts                   # Auth helpers (login, register, logout, getCurrentUser)

types/
  types.ts                  # HouseData, filters, etc.
  auth.ts                   # User, AuthSuccessResponse, etc.
```

---

## How It Works

### Main Search Flow

1. User enters a ZIP code and clicks **Run Pipeline** or **View Stored Results**
2. **Run Pipeline** — `POST /postcode { postcode, limit }`:
   - If data is cached → returns results immediately
   - If not → returns a `job_id`; client opens an `EventSource` to `GET /job/{jobId}/stream` and accumulates results as they arrive via SSE
3. **View Stored Results** — `POST /pipeline-results` fetches previously saved data
4. Results are held in local state; filtering (all / with-defects / without-defects / with-house / no-house) and pagination (12 per page) are computed in-memory
5. History sidebar reloads when a search completes

### Property Cards

Each `HouseCard` shows:
- An image carousel (multiple angles: 0°, 90°, 180°, etc.)
- Clicking an image opens `ImageLightbox` for full-screen view
- `HouseInfo` below shows address, lat/lon, and top-3 YOLO defect results with confidence scores

### History Sidebar

- Loads paginated past searches from `GET /history?limit=20&offset=X`
- Clicking a past session loads its postcode and sessionId back into the search view
- Inline on desktop, overlay drawer on mobile

### Analytics Dashboard

Two tabs, toggled via `Sidebar.tsx`:

**Analytics tab** (`AnalyticsDashboard.tsx`) — `POST /analytics`:
- Condition distribution pie chart (needs-repaint / ok / unknown)
- Model comparison bar chart
- 30-day trend line chart
- Human vs. model confusion matrix (agreement %)
- Geographic breakdown table by ZIP

**Usage tab** (`UsageDashboard.tsx`) — `GET /usage/summary` + `GET /usage/events`:
- Total calls, spend, duration, error counts per service
- Date range and service filters
- Paginated events log (25 per page)

### Auth Flow

- **Login**: `POST /auth/login` → server sets HTTP-only session cookie
- **Register**: `POST /auth/register`
- **Session check**: `GET /auth/me` (called by `AuthGuard` on every protected page load)
- **Logout**: `POST /auth/logout` → redirects to `/login`
- All API calls use `credentials: "include"` to send the session cookie
- User roles: `"user"` or `"admin"`

---

## Key Data Types

**`HouseData`** — a property record with:
- `address`, `lat`, `lon`, `postcode`
- `results` — per-angle object: `{ image, label, confidence, defect_assessment, yolo_results }`
- `defect_assessment` — `{ model, label: "needs-repaint"|"ok", confidence }`
- Legacy fields: `moondream_defects`, `yolo_results`

**`User`** — `{ id, email, username, role, is_active, created_at, last_login_at }`

---

## API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/auth/login` | POST | User authentication |
| `/auth/register` | POST | User registration |
| `/auth/me` | GET | Check auth status |
| `/auth/logout` | POST | User logout |
| `/postcode` | POST | Submit search job (returns job_id or cached data) |
| `/job/{jobId}/stream` | GET (SSE) | Stream job updates in real-time |
| `/pipeline-results` | POST | Fetch stored results by postcode |
| `/history` | GET | Paginated search history |
| `/analytics` | POST | Get analytics summary |
| `/usage/summary` | GET | API usage summary |
| `/usage/events` | GET | Paginated usage events log |

---

## Notable Patterns

- **SSE streaming** — live job progress via `EventSource`; cleaned up on unmount
- **In-memory filtering & pagination** — no extra API calls after initial fetch
- **Model-agnostic design** — `DefectAssessment.model` field supports any CV model
- **Skeleton loaders** — shown while data is loading
- **Responsive layout** — Tailwind breakpoints, 1→3 column grid, mobile drawer sidebar
