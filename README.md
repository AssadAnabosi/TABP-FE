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
| Q13 | Scope | Brief only: Customer + Admin (HotelOwner accounts browse as customers) |
| Q14 | Tests | **Skipped** for now, by request |
| Q15 | Package manager | **bun** |
| Q16 | Lint/format | ESLint (typescript-eslint, react-hooks, react-refresh) + Prettier (+ Tailwind class sorting) |
| Q17 | Docker | Not yet |
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

## How it's put together

```
src/
  api/        client.ts (fetch wrapper, in-memory token, single-flight refresh), errors.ts (ProblemDetails → ApiError),
              types.ts, queryKeys.ts, one module per API area
  auth/       session store (boot refresh, login/logout, multi-tab logout), route guards
  cart/       client-side cart (localStorage) + header drawer
  components/ shared UI (ui/ = shadcn primitives), date/guest pickers, status pages, map setup
  features/   home, search, hotel, checkout, bookings, auth, admin (lazy-loaded)
  lib/        dates, money, logger, forms, theme, query client
```

- **Auth:** the access token lives only in memory. The refresh token is the API's HttpOnly cookie. On boot there's one refresh; a 401 triggers one shared refresh and one retry, and a failed refresh clears the session. Refresh also runs ~1 min before the token expires.
- **Errors:** every non-2xx becomes an `ApiError` (camelCased field errors, `traceId`). Forms show errors inline; other mutations get a toast. Routes have error boundaries. `lib/logger.ts` is the logging seam and never receives tokens or card data.
- **Search state** lives in the URL. Home → search → hotel carries dates and guests along.
- **Checkout** books each cart item in sequence (create → confirm). A failed payment keeps the Pending booking id, so a retry only confirms. Pending bookings can also be paid from *My bookings* or the confirmation page.

## Known API limitations and FE workarounds

From kickoff §9. Each workaround is marked in code with its gap id.

| Gap | Workaround |
|---|---|
| ~~G2 no city thumbnails~~ | **Resolved:** `thumbnailUrl` on cities (set in the admin city form); a placeholder is shown while it is null |
| G3 no attractions | Overpass API around the hotel. The map still works if it fails |
| G4 no room description / original price | Description built from type + capacity; only `pricePerNight` shown |
| ~~G5 no admin "list hotels"~~ | **Resolved:** `GET /api/hotels` (Admin, paged, `keyword`/`approvalStatus` filters) |
| ~~G7 owner not updatable~~ | **Resolved:** `PUT /api/hotels/{id}/owner`, called from the update form only when the owner changes |
| G8 no room availability data | The Rooms grid shows `isActive` |
| G9 room number immutable | Read-only in the room update form (so are type, price, currency) |
| G11 `rooms` search param unused | Passed through, with a hint in the guest picker |
| G12 no guest fields on bookings | Prefilled from the profile; optional "save name to profile" |
| G14 no cancellation | Not offered; the checkout copy says so |
| API timestamps lack `Z` | `parseApiDateTime` treats offset-less timestamps as UTC |
