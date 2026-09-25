# TABP Web: hotel booking SPA

React single-page client for the TABP Hotel Booking API. Spec: [`FRONTEND-KICKOFF.md`](FRONTEND-KICKOFF.md).

## Decisions

Answers to the kickoff's §2 stack questions (2026-09-23).

| # | Topic | Decision |
|---|---|---|
| Q1 | Build tool | **Vite** (React + TS template), dev server on **port 3000** with an `/api` proxy to `localhost:8080` |
| Q2 | Language | **TypeScript**. Contract hand-written in `src/api/types.ts` from kickoff §11 |
| Q3 | Location | This repo (`TABP-FE`), app at the repo root |
| Q4 | Routing | **React Router** (data router, v8) |
| Q5 | Server state | **TanStack Query** + a small `fetch` wrapper (`src/api/client.ts`) |
| Q6 | Client state | **Zustand** (session mirror, cart, theme) |
| Q7 | UI kit | **Tailwind CSS v4 + shadcn/ui** (Radix primitives) |
| Q8 | Forms | **React Hook Form + Zod** (mirrors the backend validators, maps server 400s onto fields) |
| Q9 | Admin grid | **TanStack Table v8** |
| Q10 | Map | **Leaflet + OpenStreetMap** tiles. Nearby attractions from the **Overpass API** (client-side) |
| Q11 | Date picker | shadcn Calendar (react-day-picker) + date-fns |
| Q12 | Payment | **Mocked card form**. Only an opaque `tok_mock_<last4>` is sent; card data never leaves the browser |
| Q13 | Scope | Customer + Admin + **HotelOwner portal**, plus reviews, account settings, approvals, discounts, availability blocks, amenities, users and check-in/out |
| Q14 | Tests | **Skipped** for now, by request |
| Q15 | Package manager | **bun** |
| Q16 | Lint/format | ESLint (typescript-eslint, react-hooks, react-refresh) + Prettier (+ Tailwind class sorting) |
| Q17 | Docker | nginx serves the build and proxies `/api` to the backend (same origin); see *Docker* |
| Q18 | Backend fixes | Backend added the admin hotel list (G5) and owner reassignment (G7); city thumbnails (G2) |
| Q19 | Currency/locale | The DTO's `currency` + `Intl.NumberFormat` with the browser locale |
| Q20 | Theme | Light/dark toggle (follows the OS until the user picks one) |

## Getting started

Prerequisites: [bun](https://bun.sh) and the backend running (`docker compose up -d` in the API repo → `http://localhost:8080`).

```bash
bun install
bun run dev        # http://localhost:3000
```

Seeded logins (password `Password123!`): `customer@tabp.dev`, `admin@tabp.dev`, `owner@tabp.dev`.
In dev, the login page has buttons that fill these in.

| Script | Does |
|---|---|
| `bun run dev` | Vite dev server with the `/api` proxy |
| `bun run build` | Typecheck + production build to `dist/` |
| `bun run typecheck` | `tsc -b` |
| `bun run lint` | ESLint |
| `bun run format` | Prettier |

Environment (`.env.example`): `VITE_API_BASE_URL` (default empty: same origin) and `VITE_API_PROXY_TARGET` (dev proxy target).

## Docker

A multi-stage image: bun builds (typecheck + Vite), then nginx serves `dist/` and proxies `/api` to the
backend. The browser sees one origin, so there's no CORS and the `SameSite=Strict` refresh cookie works.

```bash
# 1. Start the backend (in the API repo). This creates the Docker network "tabp_default".
docker compose up -d
# 2. Build and start the web app (this repo) → http://localhost:8081
docker compose up --build -d
```

| Variable (compose) | Default | Purpose |
|---|---|---|
| `WEB_PORT` | `8081` | Host port for the web app |
| `API_UPSTREAM` | `http://api:8080` | Where nginx forwards `/api`; resolved per request, so the API can restart independently |
| `BACKEND_NETWORK` | `tabp_default` | The backend's Docker network to join |

nginx also sets a Content-Security-Policy (scripts from this origin only; images over https for
admin-added URLs and map tiles; XHR to the API and Overpass), a year-long cache for hashed `/assets/`,
`no-cache` for `index.html`, and a `/healthz` endpoint for the container healthcheck.

> **Known backend issue:** the API rate-limits by client IP but doesn't trust `X-Forwarded-For` from the
> proxy (`ForwardedHeadersOptions` has no `KnownNetworks`/`KnownProxies`), so everyone behind this
> container shares one bucket (10 auth requests per minute in total). Harmless for local use; fix it in
> the API before any shared deployment.

## How it's put together

```
src/
  api/        client.ts (fetch wrapper, in-memory token, single-flight refresh), errors.ts (ProblemDetails → ApiError),
              types.ts, queryKeys.ts, one module per API area
  auth/       session store (boot refresh, login/logout, multi-tab logout), route guards
  cart/       client-side cart (localStorage) + header drawer
  components/ shared UI (ui/ = shadcn primitives), date/guest pickers, status pages, map setup
  features/   home, search, hotel, checkout, bookings, auth, account, manage (lazy-loaded; Admin + HotelOwner)
  lib/        dates, money, logger, forms, theme, query client
```

- **Auth:** the access token lives only in memory. The refresh token is the API's HttpOnly cookie. On boot there's one refresh; a 401 triggers one shared refresh and one retry, and a failed refresh clears the session. Refresh also runs ~1 min before the token expires.
- **Errors:** every non-2xx becomes an `ApiError` (camelCased field errors, `traceId`). Forms show errors inline; other mutations get a toast. Routes have error boundaries. `lib/logger.ts` is the logging seam and never receives tokens or card data.
- **Search state** lives in the URL. Home → search → hotel carries dates and guests along.
- **Checkout** books each cart item in sequence (create → confirm). A failed payment keeps the Pending booking id, so a retry only confirms. Pending bookings can also be paid from *My bookings* or the confirmation page.

## Roles

| Area | Customer | Hotel owner | Admin |
|---|:-:|:-:|:-:|
| Search, book, pay, my bookings, account | ✅ | ✅ | ✅ |
| Write/edit/delete own reviews (after a checked-out stay) | ✅ | ✅ | ✅ (and delete any) |
| `/manage` → Hotels (own) + create (→ Pending), amenities, images | | ✅ | ✅ (all hotels, approve/reject, reassign owner, delete) |
| `/manage` → Rooms (own hotels): capacities, discounts, blocked dates | | ✅ (discounts: owner only) | ✅ (discounts read-only) |
| `/manage` → Amenities catalogue | | ✅ | ✅ |
| `/manage` → Cities, Users (role, activate/deactivate) | | | ✅ |
| `/manage` → Bookings: a hotel's bookings (status, check-in range, keyword) with check in / check out | | ✅ (own hotels) | ✅ |
| Room and hotel images: list, add by URL, remove | | ✅ (own hotels) | ✅ |

`/admin/*` links redirect to `/manage/*`.

## Known API limitations and FE workarounds

From kickoff §9. Each workaround is marked in code with its gap id.

| Gap | Workaround |
|---|---|
| ~~G2 no city thumbnails~~ | **Resolved:** `thumbnailUrl` on cities (set in the admin city form); a placeholder is shown while it is null |
| G3 no attractions | Overpass API around the hotel. The map still works if it fails |
| G4 no room description / original price | Description built from type + capacity; only `pricePerNight` shown |
| ~~G5 no admin "list hotels"~~ | **Resolved:** `GET /api/hotels` (Admin, paged, `keyword`/`approvalStatus` filters) |
| ~~G7 owner not updatable~~ | **Resolved:** `PUT /api/hotels/{id}/owner`, called from the update form only when the owner changes |
| G8 no room availability data | The Rooms grid shows `isActive`. Blocked dates can be created and undone in the same session, but existing blocks can't be listed (booked dates are visible on the Bookings page) |
| ~~G6 amenities of unapproved hotels~~ | **Resolved:** `HotelDto.amenityIds` prefills the Amenities tab in any approval state |
| ~~No room-image endpoint~~ | **Resolved:** `GET/POST /api/rooms/{id}/images`, `DELETE …/images/{imageId}` (Images tab in the room sheet) |
| ~~No hotel image ids~~ | **Resolved:** `GET /api/hotels/{id}/images` (any approval state) + delete |
| ~~No bookings-by-hotel listing~~ | **Resolved:** `GET /api/hotels/{id}/bookings` powers the Bookings page. Room numbers arrive raw (soft-deleted rooms carry a `::deleted::` suffix), so the FE strips it |
| G9 room number immutable | Read-only in the room update form (so are type, price, currency) |
| G11 `rooms` search param unused | Passed through, with a hint in the guest picker |
| G12 no guest fields on bookings | Prefilled from the profile; optional "save name to profile" |
| G14 no cancellation | Not offered; the checkout copy says so |
| API timestamps lack `Z` | `parseApiDateTime` treats offset-less timestamps as UTC |
