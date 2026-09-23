# TABP Frontend Kickoff: React SPA for the Hotel Booking API

> **Start here in the FE session.** Read this whole file before writing any code.
> Then do §2 first: ask the user the open stack questions. Only the choice of a **simple React SPA**
> is fixed; everything else in §2 is a recommendation, not a decision.
>
> This file was derived from the backend source (`API/`, `Application/`, `Infrastructure/`), the live
> Swagger document (`/swagger/v1/swagger.json`) and live calls against the running stack, on 2026-09-23
> (branch `touchups`, HEAD `a311762`). Two backend fixes landed right after it was written (Swagger response docs, domain-exception mapping; `PROGRESS.md` #67–#68). The rows they affect were updated and are marked ✅ in §9. Where the backend and the original project brief disagree, this
> file says so explicitly (§9 "Backend gaps"). **Don't rediscover these, and don't guess around them.**
>
> Companion docs in the repo root (untracked, local): `README.md`, `PROGRESS.md` (decision log),
> `HANDOFF.md`, `API-WALKTHROUGH.md` (payload-by-payload persona flows).

---

## Table of contents

1. [Scope: what the FE must deliver](#1-scope-what-the-fe-must-deliver)
2. [Stack: decided vs. to ask](#2-stack-decided-vs-to-ask)
3. [Running the backend for FE development](#3-running-the-backend-for-fe-development)
4. [API conventions every screen depends on](#4-api-conventions-every-screen-depends-on)
5. [Authentication and session design](#5-authentication-and-session-design)
6. [Roles, permissions and route guards](#6-roles-permissions-and-route-guards)
7. [SPA route map](#7-spa-route-map)
8. [Page-by-page specification](#8-page-by-page-specification)
9. [Backend gaps and the FE workaround for each](#9-backend-gaps-and-the-fe-workaround-for-each)
10. [Full endpoint reference](#10-full-endpoint-reference)
11. [TypeScript contract (hand-written reference; now also generatable from Swagger)](#11-typescript-contract)
12. [Validation rules to mirror client-side](#12-validation-rules-to-mirror-client-side)
13. [Cross-cutting FE requirements](#13-cross-cutting-fe-requirements)
14. [Suggested structure and milestones](#14-suggested-structure-and-milestones)
15. [Acceptance checklist (brief → FE)](#15-acceptance-checklist-brief--fe)

---

## 1. Scope: what the FE must deliver

The original brief was written for the API. These are the parts of it that describe **UI**, and so
bind the frontend. Everything below is required unless marked *optional*.

| # | Area | Brief requirement (UI-relevant only) |
|---|---|---|
| 1 | **Login page** | Username + password fields. The backend identifies users by **email**, so the "username" field is the email. |
| 2.1 | **Home: search** | Central search bar, placeholder **"Search for hotels, cities..."**. Check-in/check-out calendar defaulting to **today / tomorrow**. Adults control (default **2**), children (default **0**), rooms (default **1**). |
| 2.2 | **Home: Featured Deals** | Section titled exactly **"Featured Deals"**. **3–5** hotels, each with thumbnail, hotel name, location, **original and discounted** price, **star rating**. |
| 2.3 | **Home: Recently visited** | The user's last **3–5** visited hotels: thumbnail, name, city, star rating, price. |
| 2.4 | **Home: Trending destinations** | **Top 5** most-visited cities, each with a thumbnail and the city name. |
| 3.1 | **Search results: filters** | Sidebar: price range, star rating, amenities, and room type (luxury, budget, boutique, …). |
| 3.2 | **Search results: listing** | Matching hotels with **infinite scroll**. Each: thumbnail, name, star rating, price per night, short description. |
| 4.1 | **Hotel page: gallery** | Hotel images, viewable **fullscreen**. |
| 4.2 | **Hotel page: info** | Name, star rating, description, **guest reviews**, an **interactive map** of the hotel's location **with nearby attractions**. |
| 4.3 | **Hotel page: rooms** | Room types with images, descriptions and prices. **"Add to cart"**. |
| 5.1 | **Checkout** | Form for personal details and payment method. Field for special requests/remarks. *Optional:* integrate a real third-party payment provider. |
| 5.2 | **Confirmation** | Confirmation number, hotel address, room details, dates, total price. **Print** and **save as PDF**. (The confirmation **email** is sent by the backend; the FE only tells the user.) |
| 6.1 | **Admin: navigation** | **Collapsible** left nav with links to **Cities, Hotels, Rooms**. |
| 6.2 | **Admin: search bar** | Filters for the grids. |
| 6.3 | **Admin: grids** | **Cities:** name, country, post office, number of hotels, created/modified dates, delete. **Hotels:** name, star rating, owner, number of rooms, created/modified, delete. **Rooms:** number, availability, adult and child capacity, created/modified, delete. |
| 6.4 | **Admin: create** | A Create button that opens a form for a City, Hotel or Room. |
| 6.5 | **Admin: update** | Click a grid row to open an update form. **City:** name, country, post office. **Hotel:** name, city, owner, location. **Room:** number, adults, children. |

These technical requirements from the brief carry over to the FE:

- **Secure JWT handling:** tokens must be stored and transmitted securely. See §5.
- **Permissions / RBAC:** the UI must respect roles. The server stays authoritative. See §6.
- **Error handling and logging:** handle every failure gracefully, with a central error pipeline. See §13.
- **Clean code:** consistent naming, structure and comments.
- **Efficient data handling:** caching, pagination, no redundant calls. Mind the rate limits in §4.8.
- **Unit tests:** a real FE test suite. See §13.6.

Out of scope for the brief but already supported by the backend (**ask** before building; see §2 Q13):
a HotelOwner portal (my hotels, discounts, check-in/out), writing reviews, a profile page, change
password, and admin user management / hotel approval.

---

## 2. Stack: decided vs. to ask

**Decided:** a **simple React single-page application**. It's a separate client that talks to the
existing REST API.

**Ask the user these at the start of the FE session.** Batch them into one `AskUserQuestion` round
where possible. Each has a recommended default, so the user can accept it quickly.

| # | Question | Recommended default | Why |
|---|---|---|---|
| Q1 | Build tool | **Vite** (React template) | The standard for a simple SPA. Fast, with a built-in dev proxy (solves CORS/cookies, §3.3). |
| Q2 | Language | **TypeScript** | The contract in §11 is typed. Swagger now documents every response type (§9 G1 ✅), so types can be generated with `openapi-typescript`; §11 is the reviewed reference to diff the generated types against. |
| Q3 | Where the FE code lives | A new top-level folder **`web/`** in this repo | Keeps API and client together. Alternative: a separate repo. |
| Q4 | Routing | **React Router** (data router) | The de-facto standard. Supports nested admin layouts and loaders. |
| Q5 | Server state / data fetching | **TanStack Query** + a small `fetch` wrapper | Caching, dedup and `useInfiniteQuery` for infinite scroll. Avoids hand-rolled loading state. Alternative: plain `fetch` + hooks. |
| Q6 | Client state (auth, cart) | React Context + `useReducer` (or **Zustand** if preferred) | Only auth + cart are global. No Redux needed for this size. |
| Q7 | UI kit / styling | Ask: **MUI**, **Mantine**, **Chakra**, **Tailwind + headless (Radix/shadcn)**, or plain CSS Modules | Admin grids, date pickers, drawers and modals come free with a component kit. This is the biggest time-saver. |
| Q8 | Forms + validation | **React Hook Form + Zod** | Mirrors the backend FluentValidation rules (§12) and maps server 400 errors onto fields. |
| Q9 | Data grid (admin) | The UI kit's table (e.g. MUI DataGrid / Mantine table) or **TanStack Table** | Needs sortable columns, row click and a delete action. |
| Q10 | Map + "nearby attractions" | **Leaflet (react-leaflet) + OpenStreetMap tiles**. Attractions from the **Overpass API**, or a static list | Free, with no API key. Google Maps needs a key and billing. The backend has no attractions data (§9 G3). |
| Q11 | Date picker | The UI kit's range picker, or `react-day-picker` + **date-fns** | Needs a range with today/tomorrow defaults and past dates disabled. |
| Q12 | Payment | **Mocked card form** (matches the backend's mock gateway), or *optional* **Stripe test mode** (needs backend work, §9 G13) | The brief marks third-party payment as optional. |
| Q13 | Extra roles/features beyond the brief | Default: **brief only**. Customer + Admin. HotelOwner users can log in and browse as customers. | The backend supports much more (owner portal, reviews, approvals). Scope it explicitly. |
| Q14 | Testing | **Vitest + React Testing Library + MSW** (mock API). *Optional:* Playwright for e2e | The brief requires unit tests. MSW lets tests run without the backend. |
| Q15 | Package manager | npm (or pnpm) | — |
| Q16 | Lint/format | ESLint (typescript-eslint, react-hooks) + Prettier | Clean-code requirement. |
| Q17 | Dockerize the FE into `compose.yaml`? | Later / optional (nginx serving `dist/`, proxying `/api` to `api:8080`) | Same-origin in prod solves cookies/CORS (§5.4). |
| Q18 | Backend fixes | Should the FE session also fix the backend gaps in §9 (marked **BE-fix**), or only work around them? | Several brief items (admin hotel grid, owner reassignment, room availability column) are only fully achievable with small backend additions. |
| Q19 | Currency/locale | Display using the `currency` field from each DTO (seed data is USD), `Intl.NumberFormat` with the browser locale | — |
| Q20 | Light/dark theme, branding, logo | — | Cosmetic. Ask once. |

Write the answers into a short "Decisions" section at the top of the FE README the session creates.

---

## 3. Running the backend for FE development

### 3.1 Start it

```bash
docker compose up --build -d
```

- API base URL: **`http://localhost:8080`**. Every route is under **`/api`**.
- Swagger UI: `http://localhost:8080/swagger` (Development only). Raw spec: `/swagger/v1/swagger.json`.
- Health: `GET /api/health` → `{ status: "Healthy"|"Degraded"|"Unhealthy", totalDurationMs, components: { database, redis } }`.
- Reset to pristine seed data: `docker compose down -v && docker compose up -d`.
- Without Docker: `dotnet run --project API` serves on `http://localhost:8000` (needs SQL Server + Redis locally).

### 3.2 Seeded accounts (password `Password123!` for all)

| Email | Role |
|---|---|
| `admin@tabp.dev` | Admin |
| `owner@tabp.dev` | HotelOwner |
| `customer@tabp.dev` | Customer |

The seed has 3 cities (Paris, Tokyo, New York), 3 approved hotels + 1 pending hotel, rooms with
active discounts, reviews, visits, and a blocked date range. Seed images are
`https://picsum.photos/seed/<x>/800/600`, so allow that host if you add a CSP.

### 3.3 CORS, cookies and the dev proxy (important)

- The API's CORS allow-list (`API/appsettings.json` → `Cors:AllowedOrigins`) is
  **`http://localhost:3000`** and **`http://localhost:8000`** only, with `AllowCredentials()`.
  **Vite's default port 5173 is not allowed.**
- The refresh token is an **HttpOnly cookie** with `SameSite=Strict` and `Path=/api/auth`.
- **Recommended:** use the **Vite dev proxy** so the browser sees one origin. Then there's no CORS and
  cookies just work:

  ```ts
  // vite.config.ts
  server: {
    port: 3000,                      // also on the CORS allow-list, as a fallback
    proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true } },
  }
  ```

  The FE then calls relative URLs (`/api/...`). Keep the base URL in `import.meta.env.VITE_API_BASE_URL`
  (default `''`) so a deployed build can point elsewhere.
- If you call the API cross-origin instead, every request needs `credentials: 'include'`, and the origin
  must be on the allow-list. (localhost:3000 → localhost:8080 counts as *same-site*, so the Strict
  cookie still works in dev. A real cross-site deployment would need backend changes, see §9 G19.)

---

## 4. API conventions every screen depends on

### 4.1 JSON

- camelCase property names in and out.
- **Enums are strings** in both directions (`"Deluxe"`, `"HotelOwner"`), including query strings.
- `DateOnly` fields (check-in/out, discount and availability ranges) are **`"YYYY-MM-DD"`**. Build them
  from **local** calendar dates. Don't use `toISOString()`, which shifts the date by timezone.
- `DateTime` fields (`createdAt`, `modifiedAt`) are ISO-8601 UTC. Display them in local time.
- **IDs:** `int` for City, Hotel, Room, Amenity, Discount, Review, Image, Availability. **GUID string**
  for User and Booking.
- Money is a `number` (decimal) plus a separate `currency` string (ISO-4217, e.g. `"USD"`).

### 4.2 Pagination (every paged endpoint)

Query: `pageNumber` (1-based, default 1), `pageSize` (default 20; **search allows at most 50**).
Query-string names are case-insensitive, so `pageNumber` and `PageNumber` both work.

```json
{ "items": [ ... ], "pageNumber": 1, "totalPages": 2, "totalCount": 3,
  "hasPreviousPage": false, "hasNextPage": true }
```

For infinite scroll, use `hasNextPage` / `pageNumber + 1` as TanStack's `getNextPageParam`.

### 4.3 Array query params

`amenityIds` repeats: `?amenityIds=1&amenityIds=4`. The semantics are **AND**: the hotel must have all of them.

### 4.4 Success codes

- `200` with a body for GET and most PUT requests.
- `201 Created` with a body for POST creates.
- `204 No Content` for deletes and most actions (approve, check-in, visit record, …). **Don't `res.json()`
  a 204.**
- `POST /api/hotels/{id}/images` → `201 { "imageId": n }`. `POST /api/rooms/{id}/availability/block` →
  `201 { "availabilityId": n }`.
- `GET /api/bookings/{id}/confirmation-pdf` → `200 application/pdf` (binary).

### 4.5 Error format: RFC 7807 ProblemDetails

Every handled error looks like this (verified live):

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "detail": "One or more validation failures have occurred.",
  "errors": { "Adults": ["'Adults' must be greater than '0'."] },
  "traceId": "00-…"
}
```

| Status | Meaning | FE behavior |
|---|---|---|
| 400 | Validation (`errors` map present) or malformed input | Map `errors` onto form fields. **Keys are PascalCase property names** (`"Adults"`, `"CheckOut"`, `"HotelId"`), so lower-case the first letter to match camelCase form fields. A key like `""` means an object-level rule, so show it as a form-level error. Some 400s for model-binding failures have ASP.NET's own `errors` shape with `$.field` keys; handle both. |
| 401 | Not logged in / bad or expired token / bad credentials | Protected call: try one silent refresh (§5), then redirect to `/login?returnTo=…`. On the login form: show `detail` ("Invalid email or password." / "This account has been deactivated."). |
| 402 | Payment failed (`PaymentFailedException`) | Show a checkout error. The booking stays `Pending`, so let the user retry. |
| 403 | Authenticated but not allowed (role or ownership) | "You don't have access" screen or toast. Don't log out. |
| 404 | Not found. **Also** returned for non-approved hotels on the public detail endpoint | Not-found page. |
| 409 | Conflict (e.g. delete a city that still has hotels, delete an in-use amenity, confirm a non-pending booking, **room no longer available** on create/block, and wrong-state transitions such as checking in a non-confirmed booking or approving an approved hotel) | Show `detail` in a toast or dialog. |
| 429 | Rate limited. Body is a `ProblemDetails` (`application/problem+json`): `{ "title": "Too many requests. Please slow down.", "status": 429 }`, sometimes with a `Retry-After` header | Toast, and back off. **Don't auto-retry refresh in a loop.** |
| 500 | Unexpected (a real server bug). `detail` is `null`. Domain rule violations no longer land here (§9 G10 ✅) | Generic error + `traceId` for support. |

`detail` holds a safe, user-facing message for every 4xx, so it's fine to show it.

### 4.6 Security headers the API sets

`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`. Don't try to
iframe API responses (the PDF included). Open it as a blob instead (§8.7).

### 4.7 Route casing

All routes are **lowercase** (`/api/auth`, `/api/hotel-visits`). This matters: the refresh cookie path
`/api/auth` is case-sensitive.

### 4.8 Rate limits (Redis-backed; they fail open if Redis is down)

- **Global:** 100 requests / 60 s sliding window, **per user** when a token is sent, otherwise per IP.
- **Auth:** **10 requests / 60 s per IP** on **every** `/api/auth*` path. That includes **`POST /refresh`**
  and **`GET /api/auth`** (current user), not just login.
  - Don't poll `GET /api/auth`. Fetch the profile once and cache it.
  - Refresh must be **single-flight** (one in-flight promise shared by all concurrent 401s).
  - React StrictMode double-invokes effects in dev. Guard the boot-time refresh so it runs once.
- An infinite-scroll page, the home page's 3 sections and prefetching all count toward the global 100/min.
  Use sensible `staleTime` and don't prefetch aggressively.

---

## 5. Authentication and session design

### 5.1 Endpoints

| Call | Body | Result |
|---|---|---|
| `POST /api/auth/register` | `{ email, password, firstName, lastName }` | `200 AuthResult`, **and sets the refresh cookie**. Always creates a **Customer**. |
| `POST /api/auth/login` | `{ email, password }` | `200 AuthResult` + cookie. |
| `POST /api/auth/refresh` | *none* (reads the cookie) | `200 AuthResult` + **rotated** cookie. `401` if no, invalid, expired or revoked cookie, or the user is deactivated. |
| `POST /api/auth/logout` | *none* | `204`. Revokes the token and clears the cookie. Never fails for a missing cookie. |
| `GET /api/auth` | — (Bearer) | `200 UserProfileDto` `{ id, email, firstName, lastName, role }`. |

`AuthResult = { userId, email, firstName, lastName, role, accessToken }`. The refresh token is
**deliberately not in the body** (backend decision #53).

- Access token: JWT, **60 min** lifetime, **zero clock skew**. Claims: `sub` (user id), `email`,
  `given_name`, `family_name`, `jti`, and role under
  `http://schemas.microsoft.com/ws/2008/06/identity/claims/role`. **Use `role` from the response body,
  not the claim.** Decode `exp` only for proactive refresh.
- Refresh token: 7 days, rotated on every refresh. Reusing an old one is rejected.

### 5.2 Storage rules (the brief's "stored and transmitted securely")

- Keep the **access token in memory only** (a module-level variable or auth context).
  **Never in `localStorage` / `sessionStorage`** (XSS exfiltration).
- The refresh token lives in the HttpOnly cookie. JS never sees it. That's by design.
- Send `Authorization: Bearer <token>` only to the API origin.
- Production must be HTTPS. The cookie becomes `Secure` automatically when the request is HTTPS.

### 5.3 Session lifecycle

1. **App boot:** call `POST /api/auth/refresh` **once**. On 200, the user is logged in (store the token
   and the user from `AuthResult`). On 401, the user is anonymous. Show a splash/skeleton until this
   resolves, so guarded routes don't flash to `/login`.
2. **Every request:** attach the Bearer token if present.
3. **On 401 from a non-auth endpoint:** run the single-flight refresh, then retry the original request
   **once**. If refresh fails: clear the session and redirect to `/login?returnTo=<current path>`.
   Keep the cart (§8.5).
4. *Optional:* refresh proactively ~1 min before `exp` to avoid a 401 round-trip.
5. **Logout:** `POST /api/auth/logout`, clear the in-memory session, clear the TanStack Query cache,
   and go to `/`.
6. **Multi-tab:** after a refresh rotates the cookie in tab A, tab B's next refresh still works, because
   the browser shares the cookie. Optionally broadcast login/logout via `BroadcastChannel`.
7. **Role changes** (an admin promotes a user) only take effect after that user's next login or refresh.

### 5.4 Deployment note

The Strict cookie means the SPA and API should be **same-site** in production. Ideally serve them
same-origin behind one reverse proxy (`/` → SPA, `/api` → API). If the user wants them on different
sites, the backend needs `SameSite=None; Secure` plus CSRF protection (§9 G19).

---

## 6. Roles, permissions and route guards

Roles: `Customer`, `HotelOwner`, `Admin`. The **server is authoritative**: it checks roles at the
controller *and* in the MediatR pipeline, plus ownership in handlers. The FE hides what the user can't
use and handles 401/403 gracefully. It never relies on hiding alone.

| Capability | Anonymous | Customer | HotelOwner | Admin |
|---|:-:|:-:|:-:|:-:|
| Home, search, hotel detail, reviews, featured, trending, record a visit | ✅ | ✅ | ✅ | ✅ |
| Recently visited | ❌ (401) | ✅ | ✅ | ✅ |
| Create booking / confirm (pay) / my bookings / booking detail / PDF | ❌ | ✅ own | ✅ own | ✅ (detail: any) |
| Write review (after a completed stay) | ❌ | ✅ | ✅ | ✅ |
| Cities create/update/delete | ❌ | ❌ | ❌ | ✅ |
| Hotels create | ❌ | ❌ | ✅ (→ Pending) | ✅ (→ Approved, must pick `ownerId`) |
| Hotels update / amenities / images | ❌ | ❌ | ✅ own | ✅ |
| Hotels delete, approve, reject, list pending | ❌ | ❌ | ❌ | ✅ |
| Rooms list/get/create/update/delete/block | ❌ | ❌ | ✅ own hotel | ✅ |
| Amenities create/update/delete | ❌ | ❌ | ✅ | ✅ |
| Discounts create/update/deactivate/delete | ❌ | ❌ | ✅ own (**Admin can't**) | ❌ |
| Discounts read by room | ❌ | ❌ | ✅ | ✅ |
| Users list/get/role/status | ❌ | ❌ | ❌ | ✅ |
| Own profile / change password | ❌ | ✅ | ✅ | ✅ |
| Check-in / check-out a booking | ❌ | ❌ | ✅ own hotel | ✅ |

FE guards:

- `<RequireAuth>`: redirects anonymous users to `/login?returnTo=…`.
- `<RequireRole roles={['Admin']}>`: shows a 403 page (not a redirect loop) for a wrong role.
- Show the admin nav entry only for `Admin` (and for `HotelOwner` too if Q13 includes an owner portal).
- Lazy-load the admin bundle (`React.lazy`) so customers never download it.

---

## 7. SPA route map

| Path | Page | Guard |
|---|---|---|
| `/login` | Login (+ link to register) | anonymous only (redirect home if logged in) |
| `/register` | Register | anonymous only |
| `/` | Home: search, Featured Deals, Recently visited (if logged in), Trending | public |
| `/search?q=&cityId=&checkIn=&checkOut=&adults=&children=&rooms=&minPrice=&maxPrice=&minStar=&amenityIds=&roomType=` | Search results | public |
| `/hotels/:hotelId?checkIn=&checkOut=&adults=&children=` | Hotel page | public |
| `/cart` | Cart (can be a drawer instead) | public (checkout needs auth) |
| `/checkout` | Checkout | auth |
| `/bookings/:bookingId/confirmation` | Confirmation (print / PDF) | auth |
| `/bookings` | My bookings (supporting page; also the way back to confirmations) | auth |
| `/admin` → redirect `/admin/cities` | Admin layout (collapsible left nav) | Admin |
| `/admin/cities` | Cities grid + create/update dialogs | Admin |
| `/admin/hotels` | Hotels grid + create/update dialogs | Admin |
| `/admin/rooms?hotelId=` | Rooms grid (scoped to a chosen hotel) + create/update | Admin |
| `*` | 404 | — |

**Keep all search state in the URL** (shareable, back-button friendly). Home → search → hotel page
should carry `checkIn/checkOut/adults/children` through the query string.

---

## 8. Page-by-page specification

### 8.1 Login (`/login`) and Register (`/register`)

- Fields: **Email** (the brief's "username"; label it "Email" or "Username (email)") and **Password**
  (with a show/hide toggle).
- Submit → `POST /api/auth/login`. On success, store the session (§5) and navigate to `returnTo` or `/`.
- Errors: 400 goes on the fields. 401 shows `detail` above the form. 429 shows "Too many attempts, wait a minute".
- Disable the submit button while pending. Enter submits.
- Register (supporting): email, password (≥8 chars, one upper, one lower, one digit), first and last
  name (≤100). → `POST /api/auth/register` logs the user straight in. A duplicate email returns 400 with
  an error on `Email`.
- *Nice to have:* "Log in as demo customer/admin" buttons in dev builds only (`import.meta.env.DEV`).

### 8.2 Home (`/`)

#### 8.2.1 Search bar (brief 2.1)

| Control | Default | Maps to (`GET /api/hotels/search`) |
|---|---|---|
| Text input, placeholder **"Search for hotels, cities..."** | empty | `keyword`. The server matches it against the **hotel name or city name** (substring). |
| *Optional:* city autocomplete (`GET /api/cities?keyword=…&pageSize=10`, debounced 300 ms) | — | `cityId` (more precise than keyword) |
| Check-in / check-out range picker | **today / tomorrow** (local dates); past dates disabled; check-out > check-in | `checkIn`, `checkOut` (`YYYY-MM-DD`) |
| Adults stepper | **2** (min 1) | `adults` |
| Children stepper | **0** (min 0) | `children` |
| Rooms stepper | **1** (min 1) | `rooms` (accepted and validated, but **not used for filtering**, §9 G11) |

Submit navigates to `/search?…` with all values in the URL. Reuse the same component (compact) at the
top of the search results page.

#### 8.2.2 Featured Deals (brief 2.2)

- `GET /api/hotels/featured-deals?count=5`. Public. Returns `FeaturedDealDto[]`, **0–5** items.
- Card: `thumbnailUrl` (placeholder when null), `name`, `cityName` (= "location"), **star rating**
  (render `starRating` 1–5 as stars), `originalPrice` **struck through**, `discountedPrice`
  highlighted, `currency`. Optionally a "−NN%" badge computed from the two prices.
- Section title exactly **"Featured Deals"**. The backend returns only hotels with a room discounted
  **today**, best discount first per hotel, ordered by star rating. It may return fewer than 3, so the
  layout must look fine with 0–2 items (hide the section, or show an empty state, at 0).
- Card click → `/hotels/:hotelId` with default dates.

#### 8.2.3 Recently visited (brief 2.3)

- **Logged-in only:** `GET /api/hotel-visits/recently-visited?count=5` returns `RecentlyVisitedDto[]`
  (`hotelId, name, cityName, starRating, thumbnailUrl, pricePerNight, currency`). The price is the
  cheapest active room's price today, including discounts.
- For anonymous users, hide the section, or show a "Log in to see hotels you've viewed" teaser (§9 G16).
- The data comes from the hotel page recording visits (§8.4.5).

#### 8.2.4 Trending destinations (brief 2.4)

- `GET /api/hotel-visits/trending-cities?count=5` returns `TrendingCityDto[]`
  (`cityId, cityName, visitCount`), ordered most-visited first. Public.
- **No thumbnail is returned** (§9 G2). Use a client-side `cityName → image` map with a generic fallback.
- Card click → `/search?cityId=<id>&…default dates/guests`.

### 8.3 Search results (`/search`)

#### 8.3.1 Filters sidebar (brief 3.1)

| Filter | UI | Query param | Notes |
|---|---|---|---|
| Price range | min/max inputs or a dual slider | `minPrice`, `maxPrice` | Per night, discount-aware, evaluated **at check-in date**. `maxPrice ≥ minPrice` (else 400). |
| Star rating | 1–5 selector ("3★ & up") | `minStarRating` | Minimum, inclusive. |
| Amenities | checkbox list from `GET /api/amenities` (public, unpaged) | `amenityIds` (repeat) | **AND** semantics. |
| Room type | select/radio: `Standard, Budget, Deluxe, Suite, Luxury, Boutique` + "Any" | `roomType` | The brief's "luxury, budget, boutique" map directly onto these enum values. |

- On mobile, the filters collapse into a drawer.
- Changing a filter updates the URL and resets to page 1. Debounce price inputs (~400 ms).
- Show active filters as removable chips + a "Clear all" button.

#### 8.3.2 Listing with infinite scroll (brief 3.2)

- `useInfiniteQuery` on `GET /api/hotels/search?…&pageNumber=n&pageSize=20`. Load the next page with an
  `IntersectionObserver` sentinel while `hasNextPage` is true. Show a skeleton while loading and an
  end-of-list marker at the end.
- Card: `thumbnailUrl`, `name`, `starRating`, `pricePerNight` + `currency` ("per night", the cheapest
  matching room), `shortDescription` (server-truncated), `cityName`.
- Show "N hotels found" from `totalCount`. There's an empty state for zero results.
- **Ordering is by star rating, ascending, server-side.** There's no sort parameter (§9 G22). Don't build
  a sort dropdown unless the backend adds one.
- Only **Approved** hotels appear. A hotel appears only if at least one room satisfies **capacity**
  (`adultCapacity ≥ adults` and `childCapacity ≥ children` **in a single room**), **availability** for
  the dates, and the price range.
- Click → `/hotels/:id?checkIn&checkOut&adults&children`.

### 8.4 Hotel page (`/hotels/:hotelId`)

Data: `GET /api/hotels/{id}?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD` returns `HotelDetailDto`. **Always
pass both dates.** Without them, every room reports `isAvailable: true` and prices are for today
(§9 G20). Returns 404 for unknown **or not-yet-approved** hotels. Reviews come from a separate call.

#### 8.4.1 Visual gallery (brief 4.1)

- `imageUrls: string[]`, already in display order. Show a hero image + thumbnail strip, or a grid.
- Click → a **fullscreen lightbox** (Fullscreen API or a full-viewport modal) with prev/next, keyboard
  (←/→/Esc) and swipe on touch. Lazy-load images and give them `alt` text (`"<hotel name> photo n"`).
- Handle an empty `imageUrls` with a placeholder.

#### 8.4.2 Hotel information (brief 4.2)

- `name`, `starRating` (stars), `description` (the description/history; render as plain text with
  preserved line breaks, **never as HTML**), `address`, `cityName`, `amenities: string[]` (names only).
- Rating summary: `averageRating` (0 when there are no reviews; show 1 decimal) + `reviewCount`.
- **Guest reviews:** `GET /api/reviews/by-hotel/{id}?pageNumber=1&pageSize=10`, paged `ReviewDto`
  (`reviewerName, rating, comment, createdAt, modifiedAt`). Add a "Load more" button (or infinite scroll).
- *Optional (Q13):* a "Write a review" form. `POST /api/reviews { hotelId, rating 1–5, comment ≤2000 }`.
  The server only allows it after a **checked-out** stay (400 otherwise) and once per user per hotel
  (400/409). Author-only edit (`PUT /api/reviews/{id}`), author-or-Admin delete.

#### 8.4.3 Interactive map with nearby attractions (brief 4.2)

- The hotel marker goes at `latitude`/`longitude` (Leaflet + OSM tiles), with a popup showing name + address.
- **Nearby attractions: the backend provides none** (§9 G3). Recommended: query the **Overpass API**
  client-side for `tourism=attraction|museum|viewpoint` within ~1–2 km, and show them as secondary
  markers + a side list with distance. Cache per hotel, and degrade gracefully (map still shows) if it
  fails. The alternative is a small static list. **Ask** (Q10).

#### 8.4.4 Rooms and "Add to cart" (brief 4.3)

- `rooms: RoomSummaryDto[]` (active rooms only): `roomId, roomType, adultCapacity, childCapacity,
  pricePerNight, currency, isAvailable, imageUrls`.
- Card: an image carousel (`imageUrls`, may be empty), the room type as the title, a composed description
  (§9 G4, e.g. *"Deluxe room · sleeps 2 adults + 1 child"*), and the price per night. Show the total for
  the stay: `pricePerNight × nights` (an **estimate**; the server computes the authoritative total at
  booking, using the check-in-date price for all nights).
- Show a date/guest mini-form on the page. Changing it refetches with the new dates.
- **"Add to cart"** is disabled when `isAvailable === false`, or when the guests exceed capacity
  (`adults > adultCapacity || children > childCapacity`), with a reason tooltip. Prevent adding the same
  `roomId` + dates twice.
- The discount isn't exposed per room (there's no original price in `RoomSummaryDto`). Show only
  `pricePerNight` (§9 G4).

#### 8.4.5 Record the visit

- On mount (once per hotel id per page view; guard against StrictMode double-fire): `POST
  /api/hotel-visits/{hotelId}` → 204. Works anonymous or authenticated (send the token if present so it
  counts toward "recently visited"). Fire-and-forget: never block rendering or show errors. Afterwards,
  invalidate the `recently-visited` query.

### 8.5 Cart (drawer or `/cart`)

The backend has **no cart**. It's intentionally client-side (backend decision #4: "No Cart entity,
booking created directly as `Pending` at checkout").

- Cart item: `{ hotelId, hotelName, hotelAddress?, roomId, roomType, checkIn, checkOut, adults, children,
  pricePerNight, currency, thumbnailUrl }`.
- Persist the cart in `localStorage` (it's not sensitive; tokens never go there) so it survives reloads
  and the login redirect.
- A header cart icon shows the item count. You can remove items, and there's a subtotal per currency.
- **Checkout requires login.** "Proceed to checkout" → `/checkout` (guarded, returns to `/checkout`
  after login).
- Validate on the way into checkout: drop or flag items whose `checkIn` is now in the past.

### 8.6 Checkout (`/checkout`) (brief 5.1)

**What the backend actually accepts:**

1. `POST /api/bookings` per cart item: `{ roomId, checkIn, checkOut, adults, children, specialRequests? }`
   → `201 CreateBookingResponse { bookingId, confirmationNumber, totalPrice, currency, status: "Pending" }`.
   This **reserves the room**.
2. `POST /api/bookings/{bookingId}/confirm { cardToken }` → `200 BookingDto { …, status: "Confirmed" }`.
   The mock gateway charges, then the backend generates the PDF and emails it (visible in MailHog in dev).

**Form sections:**

- **Guest details:** first name, last name, email (prefilled from the session user), phone. The backend
  **doesn't store** these per booking (§9 G12). The booking belongs to the logged-in user. Keep the
  fields for UX. Email is read-only (the account's email receives the confirmation). If first/last name
  changed, *optionally* offer "Save to my profile" → `PUT /api/users/profile`.
- **Special requests / remarks:** a textarea → `specialRequests` (sent on every booking in the cart, or
  per item if the design allows it).
- **Payment method:** card number, name on card, expiry, CVC, with client-side format checks (Luhn,
  expiry in the future). **Never send raw card data to the backend.** In mock mode, derive an opaque
  token (e.g. `tok_mock_<last4>`) and send only that as `cardToken`. The mock gateway accepts **any
  non-empty token** (an empty one returns 400). Label the form clearly as a demo payment. *Optional*
  Stripe test mode (Q12) would produce a real `pm_…`/`tok_…`, but the backend's `MockPaymentGateway`
  would need a real implementation (§9 G13).
- **Order summary:** items, nights, estimated totals. After step 1, replace them with the server's
  `totalPrice`.

**Submit flow (multi-item cart):**

1. Disable the form and show progress.
2. For each item: create → confirm, **sequentially** (clear partial-failure reporting, and it stays well
   within rate limits).
3. Result handling:
   - All succeeded: clear the cart and go to the confirmation page (single booking) or a summary listing
     every confirmation (multiple).
   - A create fails (409 = the room was taken; 400 = validation such as a past date):
     mark that item failed and keep it in the cart.
   - A confirm fails (402 / 400): the booking **exists as `Pending`** and still holds the room. Keep the
     `bookingId`, show "Payment failed, retry", and retry **confirm only** (never create again).
     `/bookings` can also show Pending bookings with a "Complete payment" action.
   - A 409 on confirm means it's already confirmed, so treat it as success and refetch.
4. **No cancellation exists** in the backend for any role (§9 G14). Make the "reserve then pay" sequence
   clear, and don't promise cancellation.

### 8.7 Confirmation (`/bookings/:bookingId/confirmation`) (brief 5.2)

- `GET /api/bookings/{id}` returns `BookingDetailDto`: `confirmationNumber, status, hotelName,
  hotelAddress, roomNumber, roomType, checkIn, checkOut, nights, adults, children, totalPrice, currency,
  specialRequests, createdAt`. This covers every brief field: confirmation number, hotel address, room
  details, dates, total price.
- Show a status badge (`Pending | Confirmed | CheckedIn | CheckedOut`). If `Pending`, show a "Complete
  payment" action (§8.6).
- **Print:** a `window.print()` button + a `@media print` stylesheet (hide nav, buttons and cart; show a
  clean receipt layout).
- **Save as PDF:** the backend generates one. `GET /api/bookings/{id}/confirmation-pdf` **requires the
  Bearer header**, so a plain `<a href>` won't work. Fetch with auth → `blob()` →
  `URL.createObjectURL` → trigger a download named `booking-<confirmationNumber>.pdf` (or open it in a
  new tab) → revoke the URL. Show a spinner while it downloads. (Browser "Print → Save as PDF" also
  works as a fallback.)
- **Email:** show "A confirmation with your invoice has been sent to **{user.email}**." In dev the email lands
  in MailHog (`http://localhost:8025`), with the PDF attached (§9 G15 ✅).
- Accessible to the booking's owner, Admin, and the hotel's owner. Others get 403, and a bad id gets 404.

### 8.8 My bookings (`/bookings`) (supporting)

- `GET /api/bookings/mine?pageNumber&pageSize` returns paged `BookingListItemDto` (`id,
  confirmationNumber, hotelName, roomNumber, checkIn, checkOut, status, totalPrice, currency`).
- A list or table, with a link to the confirmation page. Pending rows get a "Complete payment" action.

### 8.9 Admin (`/admin/*`) (brief 6)

#### 8.9.1 Layout and navigation (6.1)

- A **collapsible left navigator** (icons-only when collapsed, persisted in `localStorage`) with
  **Cities**, **Hotels**, **Rooms**. *(Optional per Q13: Pending approvals, Amenities, Users.)*
- On mobile the nav becomes an overlay drawer.
- Top bar: page title, the grid's **search/filter bar** (6.2), and the **Create** button (6.4).

#### 8.9.2 Shared grid behavior

- Columns as listed below. **Created** and **Modified** show as local date-time (Modified shows "—"
  when null).
- **Row click opens the update form** (drawer or modal). The delete action is an icon button in the row
  that must `stopPropagation`, with a **confirm dialog** naming the entity.
- After a create, update or delete: invalidate that grid's query and show a success toast. On 409, show
  `detail` (e.g. "city still has hotels").
- Loading skeletons, empty state, error state with retry.
- Server paging where the endpoint is paged. Client-side filter and sort otherwise.

#### 8.9.3 Cities grid (6.3)

- `GET /api/cities?keyword=&pageNumber=&pageSize=` returns paged `CityDto`
  (`id, name, country, postOffice, hotelsCount, createdAt, modifiedAt`). Public read.
- Columns: **Name, Country, Post Office, Number of hotels (`hotelsCount`), Created, Modified, Delete.**
- Search bar: `keyword` (server-side, debounced).
- Create (6.4) / Update (6.5) form: **Name** (≤150, unique), **Country** (≤100), **Post Office**
  (≤20). `POST /api/cities` → 201; `PUT /api/cities/{id}` → 200.
- Delete: `DELETE /api/cities/{id}` → 204, or **409 if the city has hotels**. Pre-empt it: disable delete
  or warn when `hotelsCount > 0`.

#### 8.9.4 Hotels grid (6.3). **Needs care, see §9 G5**

- Required columns: **Name, Star rating, Owner, Number of rooms, Created, Modified, Delete.** They match
  `HotelDto` (`name, starRating, ownerName, roomsCount, createdAt, modifiedAt`), plus a useful
  `approvalStatus` badge and `cityName`.
- **There's no admin "list all hotels" endpoint.** What exists:
  - `GET /api/hotels/pending` (Admin) returns paged `HotelDto`, **Pending only**.
  - `GET /api/hotels/search` (public) returns **Approved only**, as `HotelSearchResultDto` (**no owner,
    rooms count or dates**).
  - `GET /api/hotels/{id}/manage` (Admin/Owner) returns a full `HotelDto` for **one** hotel.
  - Workaround if the backend isn't changed: page through `search` (pageSize 50, default guests, **no
    dates**) to collect approved ids, plus `pending`, then fetch `/manage` per id to fill the columns
    (N+1 calls, under the 100/min limit only for small datasets). Rejected hotels are invisible either
    way. **Recommended BE-fix:** add `GET /api/hotels` (Admin) returning paged `HotelDto` with
    `keyword`/`approvalStatus`/`cityId` filters (§9 G5). Ask Q18.
- Search bar: client-side filter on name/city/owner (or server-side `keyword` once the BE-fix exists).
- **Create form (6.4)** → `POST /api/hotels`: Name (≤200), Star rating (1–5), Description (≤4000),
  Address (≤300), **City** (select from `GET /api/cities`), **Location** (latitude −90..90, longitude
  −180..180; offer a **map picker**: click to set the pin), and **Owner** (select from
  `GET /api/users?role=HotelOwner&isActive=true`). **Admin must supply `ownerId`**, and the user must
  already hold the HotelOwner role (400 otherwise). An admin-created hotel is **auto-Approved**.
- **Update form (6.5)** → `PUT /api/hotels/{id}` with `{ name, starRating, description, address,
  latitude, longitude, cityId }`. The brief's fields: Name ✅, City ✅, Location ✅, **Owner ❌**. The
  update command has no `ownerId` (§9 G7), so show the owner **read-only** unless the backend is extended.
  Prefill via `GET /api/hotels/{id}/manage`.
- *Optional sub-sections in the update drawer:* **Amenities** (`PUT /api/hotels/{id}/amenities {
  amenityIds }` replaces the whole set; see §9 G6 for reading the current set) and **Images** (add by
  URL: `POST /api/hotels/{id}/images { url }`; removal needs an `imageId` the backend never lists, §9 G6).
- *Optional:* approve/reject pending hotels (`POST /api/hotels/{id}/approve`, `POST
  /api/hotels/{id}/reject { reason ≤1000 }`).
- Delete: `DELETE /api/hotels/{id}` (Admin) → 204.

#### 8.9.5 Rooms grid (6.3)

- Rooms are listed **per hotel only**: `GET /api/rooms/by-hotel/{hotelId}` (Admin/Owner) returns
  `RoomDto[]` (`id, hotelId, number, roomType, adultCapacity, childCapacity, basePrice, currency,
  isActive, createdAt, modifiedAt`), ordered by number. The page therefore needs a **hotel selector**
  first (keep it in the URL `?hotelId=`), fed by whatever hotel list you have (§8.9.4).
- Columns: **Number, Availability, Adult capacity, Child capacity, Created, Modified, Delete** (+ room
  type, base price).
- **Availability:** the DTO only has `isActive` (and blocked/booked date ranges are never returned, §9 G8).
  Show `isActive` as "Available / Inactive". An *optional* "Check dates" control can use the public
  detail endpoint (`GET /api/hotels/{hotelId}?checkIn&checkOut` → `rooms[].isAvailable`) for approved
  hotels.
- **Soft-deleted rooms show up in this list** with `isActive: false` and a mangled number
  `"<number>::deleted::<guid>"`. Hide them by default (a "show deleted" toggle), or display the part
  before `::deleted::`.
- Search bar: client-side filter on number/type.
- **Create** → `POST /api/rooms { hotelId, number (≤20, unique per hotel), roomType, adultCapacity ≥1,
  childCapacity ≥0, basePrice >0, currency (3 letters, default "USD") }`.
- **Update (6.5)** → `PUT /api/rooms/{id} { adultCapacity, childCapacity }`. The brief lists Number,
  Adults, Children, but **the number is immutable** in the backend (§9 G9). Show it read-only.
- Delete → `DELETE /api/rooms/{id}` → 204. The backend hard-deletes if the room was never booked and
  soft-deletes otherwise (keeps history, frees the number). The confirm text can mention this.
- *Optional:* block/unblock dates (`POST /api/rooms/{id}/availability/block { startDate, endDate }` →
  `{ availabilityId }`, `DELETE /api/rooms/{id}/availability/{availabilityId}`). The id can't be listed
  later (§9 G8), so this is realistically a create-only UI.

---

## 9. Backend gaps and the FE workaround for each

Found by reading the code and comparing it against the brief. **BE-fix** marks items where a small backend
change is the right answer. Ask Q18 before touching the backend.

| # | Gap | Impact on FE | FE workaround (now) | BE-fix (recommended) |
|---|---|---|---|---|
| **G1** ✅ | *(Resolved — `PROGRESS.md` #67.)* Every operation now declares its success code and response schema (200/201/204, the PDF as `application/pdf` binary) plus the specific 402/404/409 it can return; 400/429/500 are on every operation; 401/403 only on authenticated ones. `components.schemas` includes the response DTOs. | A typed client can be generated from `/swagger/v1/swagger.json`. | Generate with `openapi-typescript` and diff against §11. | — |
| **G2** | `TrendingCityDto` has **no thumbnail** (open question #2 in `PROGRESS.md`). | The brief requires "visually appealing thumbnail". | Static `cityName → image` map in the FE with a fallback image. | Add `City.ThumbnailUrl` (or return the first hotel image in the city). |
| **G3** | **No "nearby attractions" data.** | The brief requires them on the map. | Overpass API (OSM) client-side query around lat/lng, or a static list. | — (external data; the FE owns it) |
| **G4** | `RoomSummaryDto` (hotel page) has **no description, room number or original (pre-discount) price**. | The brief asks for room "descriptions". A discount can't be shown per room. | Compose the description from `roomType` + capacities. Show only `pricePerNight`. | Add `description` to `Room`, plus `basePrice` to the DTO. |
| **G5** | **No admin endpoint listing all hotels** (only `pending`, public `search` (approved only, slim DTO), or per-id `manage`). Rejected hotels can't be listed at all. | The admin Hotels grid (6.3) can't be built cleanly. | Stitch search + pending + N× `/manage` (small data only). | `GET /api/hotels` (Admin): paged `HotelDto`, filters `keyword`, `approvalStatus`, `cityId`. |
| **G6** | `HotelDto` (`/manage`) has **no amenities or images**. The public detail has amenity **names** (not ids) and image **URLs** (not ids), and only for approved hotels. | You can't prefill an amenities editor by id or delete a specific image. | Map amenity names → ids via `GET /api/amenities`. Offer image *add* only. | Include `amenityIds` and `images: {id,url}[]` in `HotelDto`. |
| **G7** | `UpdateHotelCommand` has **no `ownerId`**. | The brief's hotel update form includes "Owner". | Show owner read-only in the update form. | Allow Admin to reassign `ownerId` (validate HotelOwner role). |
| **G8** | `RoomDto` has **no availability info** (only `isActive`), and blocked/booked ranges are never returned. | The brief's Rooms grid has an "availability" column. | Show `isActive`. Optionally, a date check via public hotel detail. | Add `isAvailableToday` (or a date-param'd availability) and a `GET` for blocks. |
| **G9** | Room **number is immutable** (`UpdateRoomCommand` = capacities only). | The brief's room update form includes "Number". | Show number read-only. | Allow renaming with a per-hotel uniqueness check. |
| **G10** ✅ | *(Resolved — `PROGRESS.md` #68.)* Domain exceptions are mapped with their message as `detail`: `RoomNotAvailableException` and the new `InvalidStateTransitionException` → **409**, `ImageNotFoundException` → **404**, other `DomainException`s (invalid date range/discount) → **400**. | A double booking is a clear 409, not a 500. | On a 409 from `POST /bookings`, show "room no longer available" and refetch the hotel detail. | — |
| **G11** | Search's **`rooms` param is validated but unused**. Capacity is checked per **single room** (`adults`/`children` must fit one room). | Searching "4 adults, 2 rooms" returns only hotels with one 4-adult room. | Keep the rooms control (the brief requires it) and pass it through. Optionally show a hint. For a multi-room cart, the user adds several rooms from the hotel page. | Implement multi-room capacity matching. |
| **G12** | Booking has **no guest-detail fields** (only `specialRequests`); the booking belongs to the logged-in user. | The checkout "personal details" can't be persisted per booking. | Prefill from the profile. Optionally `PUT /api/users/profile` for the name. Phone/address stay UI-only. | Add guest name/phone to `Booking` if needed. |
| **G13** | Payment is **mocked** (`MockPaymentGateway`): any non-empty `cardToken` succeeds. | Real provider integration (optional in the brief) is impossible FE-only. | A demo card form that sends a fake opaque token. Never send raw card data. | Real gateway (e.g. Stripe PaymentIntents) behind `IPaymentGateway`. |
| **G14** | **No booking cancellation** for any role (`PROGRESS.md` open question #1). Pending bookings hold the room indefinitely. | An abandoned or failed payment leaves a Pending reservation. | Surface Pending bookings with "Complete payment". Don't offer cancel. | Cancel endpoint, or auto-expire Pending holds. |
| **G15** ✅ | *(Resolved — `PROGRESS.md` #69.)* Email is sent over SMTP (MailKit). In dev it lands in **MailHog** (`http://localhost:8025`), and the confirmation email carries the PDF. Sending is best-effort, so a mail outage never fails the confirm. | — | Show "A confirmation has been sent to {email}". | — |
| **G16** | Recently visited is **auth-only**. | Anonymous users get no section. | Hide it, or keep a localStorage list of viewed hotel ids for guests (optional). | — |
| **G17** | Validation error **keys are PascalCase**. | Field mapping. | Lower-case the first char when mapping to form fields. | Configure a camelCase key policy (optional). |
| **G18** | CORS allow-list is `localhost:3000` and `localhost:8000`. | Vite's default 5173 is blocked. | Vite proxy + `port: 3000` (§3.3). | Add the FE origin(s) to `Cors:AllowedOrigins`. |
| **G19** | Refresh cookie is `SameSite=Strict`, `Path=/api/auth`. | Works same-origin/same-site only. | Same-origin deployment behind one proxy (§5.4). | For cross-site: `SameSite=None; Secure` + CSRF protection. |
| **G20** | Hotel detail without dates → all rooms `isAvailable: true`, price for today. | Misleading availability. | Always pass `checkIn`/`checkOut` (default today/tomorrow). | — |
| **G21** | Rate limit 10/min on **all** `/api/auth*` including refresh and `GET /api/auth`. | Easy to trip with naive refresh/"me" polling. | Single-flight refresh, cached profile (§4.8). | Exempt `GET /api/auth` from the strict auth limiter. |
| **G22** | Search order is fixed (**star rating ascending**). There's no sort param. | No "sort by price" UI. | Don't offer sorting (or sort only the loaded page, and label it so). | Add `sortBy` (price/stars/name). |
| **G23** | Admin/owner image management is **URL-only** (no file upload). | Can't upload files. | A URL input with a live preview. | Upload endpoint + blob storage. |

---

## 10. Full endpoint reference

Auth: **P** = public, **U** = any authenticated user, **roles** as listed. Paged = returns `PaginatedList<T>`.

### Auth: `/api/auth` (strict 10/min/IP limiter)

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/api/auth` | U | — | `UserProfileDto` |
| POST | `/api/auth/register` | P | `RegisterRequest` | `AuthResult` + cookie |
| POST | `/api/auth/login` | P | `LoginRequest` | `AuthResult` + cookie |
| POST | `/api/auth/refresh` | cookie | — | `AuthResult` + rotated cookie |
| POST | `/api/auth/logout` | cookie | — | 204 |

### Hotels: `/api/hotels`

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/api/hotels/search` | P | query: `keyword, cityId, checkIn, checkOut, adults=2, children=0, rooms=1, minPrice, maxPrice, minStarRating, amenityIds[], roomType, pageNumber=1, pageSize=20 (≤50)` | Paged `HotelSearchResultDto` |
| GET | `/api/hotels/featured-deals` | P | query: `count=5` | `FeaturedDealDto[]` |
| GET | `/api/hotels/{id}` | P | query: `checkIn, checkOut` | `HotelDetailDto` (404 if not approved) |
| GET | `/api/hotels/mine` | HotelOwner | query: paging | Paged `HotelDto` |
| GET | `/api/hotels/pending` | Admin | query: paging | Paged `HotelDto` |
| GET | `/api/hotels/{id}/manage` | Admin, HotelOwner (own) | — | `HotelDto` |
| POST | `/api/hotels` | Admin, HotelOwner | `CreateHotelRequest` | 201 `HotelDto` |
| PUT | `/api/hotels/{id}` | Admin, HotelOwner (own) | `UpdateHotelRequest` | `HotelDto` (an owner edit of a Rejected hotel → Pending) |
| DELETE | `/api/hotels/{id}` | Admin | — | 204 |
| POST | `/api/hotels/{id}/approve` | Admin | — | 204 |
| POST | `/api/hotels/{id}/reject` | Admin | `{ reason }` | 204 |
| PUT | `/api/hotels/{id}/amenities` | Admin, HotelOwner (own) | `{ amenityIds: number[] }` (replaces the set) | 204 |
| POST | `/api/hotels/{id}/images` | Admin, HotelOwner (own) | `{ url }` | 201 `{ imageId }` |
| DELETE | `/api/hotels/{id}/images/{imageId}` | Admin, HotelOwner (own) | — | 204 |

### Hotel visits: `/api/hotel-visits`

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/api/hotel-visits/{hotelId}` | P (user recorded if a token is sent) | — | 204 |
| GET | `/api/hotel-visits/recently-visited` | U | query: `count=5` | `RecentlyVisitedDto[]` |
| GET | `/api/hotel-visits/trending-cities` | P | query: `count=5` | `TrendingCityDto[]` |

### Reviews: `/api/reviews`

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/api/reviews/by-hotel/{hotelId}` | P | query: `pageNumber, pageSize` | Paged `ReviewDto` |
| POST | `/api/reviews` | U (completed stay) | `{ hotelId, rating, comment? }` | 201 `ReviewDto` |
| PUT | `/api/reviews/{id}` | U (author) | `{ rating, comment? }` | `ReviewDto` |
| DELETE | `/api/reviews/{id}` | U (author or Admin) | — | 204 |

### Bookings: `/api/bookings` (all require auth)

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/api/bookings` | U | `CreateBookingRequest` | 201 `CreateBookingResponse` |
| POST | `/api/bookings/{id}/confirm` | U (booker) | `{ cardToken }` | `BookingDto` (402 payment failed, 409 not pending) |
| POST | `/api/bookings/{id}/check-in` | Admin, HotelOwner (own hotel) | — | 204 |
| POST | `/api/bookings/{id}/check-out` | Admin, HotelOwner (own hotel) | — | 204 |
| GET | `/api/bookings/mine` | U | query: paging | Paged `BookingListItemDto` |
| GET | `/api/bookings/{id}` | booker, Admin, hotel owner | — | `BookingDetailDto` |
| GET | `/api/bookings/{id}/confirmation-pdf` | booker, Admin, hotel owner | — | `application/pdf` |

### Cities: `/api/cities`

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/api/cities` | P | query: `keyword, pageNumber, pageSize` | Paged `CityDto` |
| GET | `/api/cities/{id}` | P | — | `CityDto` |
| POST | `/api/cities` | Admin | `{ name, country, postOffice }` | 201 `CityDto` |
| PUT | `/api/cities/{id}` | Admin | `{ name, country, postOffice }` | `CityDto` |
| DELETE | `/api/cities/{id}` | Admin | — | 204 / 409 if it has hotels |

### Rooms: `/api/rooms` (Admin, HotelOwner (own hotel))

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/api/rooms/by-hotel/{hotelId}` | — | `RoomDto[]` (includes soft-deleted) |
| GET | `/api/rooms/{id}` | — | `RoomDto` |
| POST | `/api/rooms` | `CreateRoomRequest` | 201 `RoomDto` |
| PUT | `/api/rooms/{id}` | `{ adultCapacity, childCapacity }` | `RoomDto` |
| DELETE | `/api/rooms/{id}` | — | 204 (hard or soft) |
| POST | `/api/rooms/{id}/availability/block` | `{ startDate, endDate }` | 201 `{ availabilityId }` |
| DELETE | `/api/rooms/{id}/availability/{availabilityId}` | — | 204 |

### Amenities: `/api/amenities`

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/api/amenities` | P | — | `AmenityDto[]` |
| POST | `/api/amenities` | Admin, HotelOwner | `{ name }` | 201 `AmenityDto` |
| PUT | `/api/amenities/{id}` | Admin, HotelOwner | `{ name }` | `AmenityDto` |
| DELETE | `/api/amenities/{id}` | Admin, HotelOwner | — | 204 / 409 if assigned |

### Discounts: `/api/discounts`

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/api/discounts/by-room/{roomId}` | Admin, HotelOwner | — | `DiscountDto[]` |
| POST | `/api/discounts` | HotelOwner | `{ roomId, name, type, value, startDate, endDate }` | 201 `DiscountDto` |
| PUT | `/api/discounts/{id}` | HotelOwner | `{ name, type, value, startDate, endDate }` | `DiscountDto` |
| POST | `/api/discounts/{id}/deactivate` | HotelOwner | — | 204 |
| DELETE | `/api/discounts/{id}` | HotelOwner | — | 204 |

### Users: `/api/users` (all require auth)

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/api/users` | Admin | query: `keyword, role, isActive, pageNumber, pageSize` | Paged `UserListItemDto` |
| GET | `/api/users/{id}` | Admin | — | `UserDetailsDto` |
| PUT | `/api/users/profile` | U | `{ firstName, lastName }` | `UserProfileDto` |
| PUT | `/api/users/password` | U | `{ currentPassword, newPassword }` | 204 |
| PUT | `/api/users/role` | Admin | `{ userId, newRole }` | 204 (an admin can't demote self → 403) |
| PUT | `/api/users/status` | Admin | `{ userId, isActive }` | 204 (can't deactivate self → 403) |

### Health

`GET /api/health` is public and not rate limited. Returns 200 Healthy/Degraded, or 503 Unhealthy.

> For routes with an id in the path, the body's id field (e.g. `cityId`, `hotelId` in the Swagger
> request schemas) is **ignored**: the route id wins. The FE doesn't need to send it.

---

## 11. TypeScript contract

Hand-written from the C# DTOs (`Application/Features/**/Common/*.cs`, `API/Contracts/AuthResult.cs`).
Put it in `src/api/types.ts`. Keep it in sync if the backend changes. Since G1 was fixed, these types can
also be generated from `/swagger/v1/swagger.json` (`openapi-typescript`); if you do that, use this section
to review the generated output.

```ts
// ---------- primitives ----------
export type Guid = string;
export type IsoDate = string;      // "YYYY-MM-DD" (C# DateOnly)
export type IsoDateTime = string;  // ISO-8601 UTC (C# DateTime)

export type UserRole = 'Customer' | 'HotelOwner' | 'Admin';
export type RoomType = 'Standard' | 'Budget' | 'Deluxe' | 'Suite' | 'Luxury' | 'Boutique';
export type DiscountType = 'Percentage' | 'FixedAmount';
export type HotelApprovalStatus = 'Pending' | 'Approved' | 'Rejected';
export type BookingStatus = 'Pending' | 'Confirmed' | 'CheckedIn' | 'CheckedOut';

export interface Paged<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string | null;
  traceId?: string;
  errors?: Record<string, string[]>; // PascalCase keys, see §4.5
}

// ---------- auth / users ----------
export interface LoginRequest { email: string; password: string }
export interface RegisterRequest { email: string; password: string; firstName: string; lastName: string }
export interface AuthResult {
  userId: Guid; email: string; firstName: string; lastName: string;
  role: UserRole; accessToken: string;
}
export interface UserProfileDto { id: Guid; email: string; firstName: string; lastName: string; role: UserRole }
export interface UserListItemDto {
  id: Guid; email: string; firstName: string; lastName: string;
  role: UserRole; isActive: boolean; createdAt: IsoDateTime;
}
export interface UserDetailsDto extends UserListItemDto {
  modifiedAt: IsoDateTime | null; ownedHotelsCount: number; bookingsCount: number;
}

// ---------- cities / amenities ----------
export interface CityDto {
  id: number; name: string; country: string; postOffice: string;
  hotelsCount: number; createdAt: IsoDateTime; modifiedAt: IsoDateTime | null;
}
export interface CityRequest { name: string; country: string; postOffice: string }
export interface AmenityDto { id: number; name: string; createdAt: IsoDateTime; modifiedAt: IsoDateTime | null }

// ---------- hotels ----------
export interface HotelSearchParams {
  keyword?: string; cityId?: number; checkIn?: IsoDate; checkOut?: IsoDate;
  adults?: number; children?: number; rooms?: number;
  minPrice?: number; maxPrice?: number; minStarRating?: number;
  amenityIds?: number[]; roomType?: RoomType;
  pageNumber?: number; pageSize?: number; // pageSize <= 50
}
export interface HotelSearchResultDto {
  hotelId: number; name: string; cityName: string; starRating: number;
  thumbnailUrl: string | null; pricePerNight: number; currency: string; shortDescription: string;
}
export interface FeaturedDealDto {
  hotelId: number; name: string; cityName: string; thumbnailUrl: string | null; starRating: number;
  originalPrice: number; discountedPrice: number; currency: string;
}
export interface RoomSummaryDto {
  roomId: number; roomType: RoomType; adultCapacity: number; childCapacity: number;
  pricePerNight: number; currency: string; isAvailable: boolean; imageUrls: string[];
}
export interface HotelDetailDto {
  id: number; name: string; starRating: number; description: string; address: string;
  latitude: number; longitude: number; cityName: string;
  averageRating: number; reviewCount: number;
  imageUrls: string[]; amenities: string[]; rooms: RoomSummaryDto[];
}
export interface HotelDto {
  id: number; name: string; starRating: number; description: string; address: string;
  latitude: number; longitude: number; cityId: number; cityName: string;
  ownerId: Guid; ownerName: string; approvalStatus: HotelApprovalStatus;
  rejectionReason: string | null; roomsCount: number;
  createdAt: IsoDateTime; modifiedAt: IsoDateTime | null;
}
export interface CreateHotelRequest {
  name: string; starRating: number; description: string; address: string;
  latitude: number; longitude: number; cityId: number;
  ownerId: Guid | null; // Admin: required (a HotelOwner user). HotelOwner: must be null.
}
export type UpdateHotelRequest = Omit<CreateHotelRequest, 'ownerId'>;

// ---------- visits ----------
export interface RecentlyVisitedDto {
  hotelId: number; name: string; cityName: string; starRating: number;
  thumbnailUrl: string | null; pricePerNight: number; currency: string;
}
export interface TrendingCityDto { cityId: number; cityName: string; visitCount: number }

// ---------- rooms / discounts ----------
export interface RoomDto {
  id: number; hotelId: number; number: string; roomType: RoomType;
  adultCapacity: number; childCapacity: number; basePrice: number; currency: string;
  isActive: boolean; createdAt: IsoDateTime; modifiedAt: IsoDateTime | null;
}
export interface CreateRoomRequest {
  hotelId: number; number: string; roomType: RoomType;
  adultCapacity: number; childCapacity: number; basePrice: number; currency?: string; // default "USD"
}
export interface UpdateRoomRequest { adultCapacity: number; childCapacity: number }
export interface DiscountDto {
  id: number; roomId: number; name: string; type: DiscountType; value: number;
  startDate: IsoDate; endDate: IsoDate; isActive: boolean;
  createdAt: IsoDateTime; modifiedAt: IsoDateTime | null;
}

// ---------- reviews ----------
export interface ReviewDto {
  id: number; hotelId: number; userId: Guid; reviewerName: string;
  rating: number; comment: string | null; createdAt: IsoDateTime; modifiedAt: IsoDateTime | null;
}

// ---------- bookings ----------
export interface CreateBookingRequest {
  roomId: number; checkIn: IsoDate; checkOut: IsoDate;
  adults: number; children: number; specialRequests?: string | null;
}
export interface CreateBookingResponse {
  bookingId: Guid; confirmationNumber: string; totalPrice: number; currency: string; status: BookingStatus;
}
export interface ConfirmBookingRequest { cardToken: string }
export interface BookingDto {
  id: Guid; confirmationNumber: string; status: BookingStatus;
  totalPrice: number; currency: string; checkIn: IsoDate; checkOut: IsoDate;
}
export interface BookingListItemDto {
  id: Guid; confirmationNumber: string; hotelName: string; roomNumber: string;
  checkIn: IsoDate; checkOut: IsoDate; status: BookingStatus; totalPrice: number; currency: string;
}
export interface BookingDetailDto {
  id: Guid; confirmationNumber: string; status: BookingStatus;
  hotelName: string; hotelAddress: string; roomNumber: string; roomType: RoomType;
  checkIn: IsoDate; checkOut: IsoDate; nights: number; adults: number; children: number;
  totalPrice: number; currency: string; specialRequests: string | null; createdAt: IsoDateTime;
}
```

`status`, `roomType`, `role`, `type` and `approvalStatus` are declared as `string` in C# but always carry
the enum names, so the unions above are safe.

---

## 12. Validation rules to mirror client-side

Client-side validation is for UX only. The server re-validates everything and its 400s must still be
mapped onto fields.

| Form | Rules (from the FluentValidation validators) |
|---|---|
| Login | email required + valid; password required |
| Register | email required + valid + unique (server); password ≥8, ≥1 upper, ≥1 lower, ≥1 digit; first/last name required, ≤100 |
| Change password | current required; new = register rules and ≠ current |
| Profile | first/last name required, ≤100 |
| Search | adults >0; children ≥0; rooms >0; checkOut > checkIn; maxPrice ≥ minPrice; pageSize 1–50 |
| Booking | roomId >0; checkIn ≥ today (UTC date on the server, so near midnight, allow for the offset); checkOut > checkIn; adults >0; children ≥0 |
| Confirm | cardToken non-empty |
| City | name required ≤150 unique; country required ≤100; postOffice required ≤20 |
| Hotel | name required ≤200; starRating 1–5; description ≤4000; address required ≤300; lat −90..90; lng −180..180; city must exist; Admin create requires `ownerId` of a HotelOwner; HotelOwner must send `ownerId: null` |
| Room | number required ≤20, unique per hotel; roomType valid; adultCapacity >0; childCapacity ≥0; basePrice >0; currency exactly 3 chars |
| Amenity | name required ≤100 unique |
| Discount | name required ≤150; value >0 and ≤100; endDate > startDate; no overlap with another active discount on the room |
| Review | rating 1–5; comment ≤2000; completed stay; one per hotel |
| Reject hotel | reason required ≤1000 |
| Image | url required ≤2000, absolute URL |
| Block dates | endDate > startDate |

---

## 13. Cross-cutting FE requirements

### 13.1 API client layer

- One `apiClient` module: base URL, JSON handling, Bearer attach, the **single-flight refresh + retry
  once** on 401, 204 handling, blob downloads, and it throws a typed `ApiError { status, title, detail,
  fieldErrors, traceId }` parsed from ProblemDetails.
- Feature modules (`api/hotels.ts`, `api/bookings.ts`, …) expose typed functions. Components never call
  `fetch` directly.
- Query keys are centralized (e.g. `['hotels','search',params]`). Mutations invalidate precisely.
- Use `AbortController`/query cancellation for superseded searches.

### 13.2 Error handling and logging (brief: "robust error handling and logging")

- A top-level **error boundary** plus per-route boundaries (React Router `errorElement`) with a friendly
  fallback and a retry.
- A global toast for mutation errors. Inline errors for forms. Full-page states for 403/404.
- A small `logger` abstraction (`debug/info/warn/error`): console in dev, a no-op or a pluggable sink in
  prod. Log API failures with `status`, `traceId`, route and action. **Never log tokens or card data.**
- Offline/network failure gets its own message ("Can't reach the server").

### 13.3 Security

- Tokens in memory only (§5.2). The cart may use localStorage. Nothing sensitive goes there.
- Never render API strings as HTML (no `dangerouslySetInnerHTML`). Descriptions and review comments are
  user-generated.
- Card fields never leave the browser in mock mode.
- `rel="noopener noreferrer"` on external links.
- *Optional:* a CSP in the production nginx config (allow `picsum.photos`, OSM tiles, Overpass).

### 13.4 Performance and efficiency

- TanStack Query `staleTime` of a few minutes for static-ish data (amenities, cities, featured,
  trending). Keep search results cached by params.
- Debounce text/price inputs. Lazy-load the admin routes and the map. Lazy-load images with
  `loading="lazy"` and explicit sizes to avoid layout shift.
- Respect the rate limits (§4.8).

### 13.5 UX, accessibility, responsiveness

- Mobile-first layouts. Filters and the admin nav become drawers on small screens.
- Keyboard-operable gallery, dialogs (focus trap, Esc) and steppers. Label every input. The star rating
  needs text for screen readers ("4 out of 5 stars").
- Show formatted money with `Intl.NumberFormat(locale, { style: 'currency', currency })`, and dates
  with `Intl.DateTimeFormat`.

### 13.6 Testing (brief: "unit testing … edge cases")

- **Vitest + React Testing Library + MSW** (Q14). Aim at logic and behavior, not snapshots.
- Must-cover list:
  - `apiClient`: attaches the token; 401 → one refresh → retry; concurrent 401s share one refresh;
    refresh failure → logout; 204 handling; ProblemDetails → `ApiError` with camelCased field errors.
  - Auth: boot refresh succeeds or fails; login error display (401 vs 400 vs 429); route guards
    (anon → redirect, wrong role → 403 page).
  - Search: URL ↔ state round-trip; default dates (today/tomorrow) and guests (2/0/1); `amenityIds`
    serialization; infinite-scroll next-page logic; empty state.
  - Date utils: local `YYYY-MM-DD` formatting (timezone edge), nights calculation.
  - Hotel page: visit recorded once; Add-to-cart disabled when unavailable or over capacity; duplicate
    prevention.
  - Cart: add/remove/persist; totals per currency; past-date items flagged.
  - Checkout: sequential create → confirm; a confirm 402 keeps the booking id and retries confirm only;
    a create 409 is shown as "room unavailable"; card data never in the request body.
  - Confirmation: renders every brief field; PDF download uses an authenticated blob fetch.
  - Admin grids: row click opens the update form; delete confirm + 409 message; city delete disabled
    when `hotelsCount > 0`; soft-deleted rooms hidden.
- *Optional:* Playwright e2e against the docker stack for the customer happy path and the admin CRUD path.

---

## 14. Suggested structure and milestones

```
web/
  src/
    api/            apiClient.ts, types.ts, hotels.ts, bookings.ts, auth.ts, admin/*.ts, queryKeys.ts
    auth/           AuthProvider.tsx, RequireAuth.tsx, RequireRole.tsx, session.ts
    cart/           CartProvider.tsx, cartStorage.ts
    components/     StarRating, Price, DateRangePicker, GuestPicker, ImageLightbox, MapView, ConfirmDialog, …
    features/
      home/         SearchBar, FeaturedDeals, RecentlyVisited, TrendingDestinations
      search/       FiltersSidebar, HotelList, useHotelSearch
      hotel/        Gallery, HotelInfo, Reviews, HotelMap, RoomList
      checkout/     CheckoutPage, PaymentForm, useCheckout
      bookings/     ConfirmationPage, MyBookingsPage
      admin/        AdminLayout, CitiesPage, HotelsPage, RoomsPage, forms/*
    lib/            dates.ts, money.ts, logger.ts, problemDetails.ts
    routes.tsx
  tests/ (or colocated *.test.tsx) + msw handlers
```

Milestones (each one is demoable and has tests):

1. **Scaffold:** Vite + TS + router + query + UI kit + lint/format + Vitest/MSW + dev proxy. Layout
   shell with header (logo, cart, user menu).
2. **Auth:** api client with refresh, login/register, boot refresh, guards, logout.
3. **Home:** search bar with defaults, Featured Deals, Recently visited, Trending.
4. **Search results:** filters sidebar + URL state + infinite scroll.
5. **Hotel page:** gallery/lightbox, info, reviews, map + attractions, rooms + add to cart, visit recording.
6. **Cart → checkout → confirmation:** sequential booking, mock payment, print, PDF, my bookings.
7. **Admin:** layout + collapsible nav; Cities (full); Rooms (hotel-scoped); Hotels (with the G5
   decision); create/update forms; delete flows.
8. **Polish:** a11y pass, responsive pass, error states, test gaps, README for `web/`.

---

## 15. Acceptance checklist (brief → FE)

- [ ] Login with email + password. Errors shown. Token in memory only. Session survives reload via the refresh cookie.
- [ ] Home search bar with placeholder "Search for hotels, cities...".
- [ ] Dates default to today → tomorrow. Adults 2, children 0, rooms 1.
- [ ] "Featured Deals" section: 3–5 cards with thumbnail, name, location, original + discounted price, stars.
- [ ] Recently visited (3–5) with thumbnail, name, city, stars, price (logged-in).
- [ ] Trending destinations: top 5 cities with thumbnail + name.
- [ ] Search filters: price range, star rating, amenities, room type.
- [ ] Search listing with infinite scroll. Card has thumbnail, name, stars, price/night, short description.
- [ ] Hotel gallery with fullscreen view.
- [ ] Hotel name, stars, description, guest reviews.
- [ ] Interactive map with the hotel location and nearby attractions.
- [ ] Rooms with images, description, price, and **Add to cart**.
- [ ] Checkout: personal details form, payment method form, special requests field.
- [ ] Confirmation: confirmation #, hotel address, room details, dates, total.
- [ ] Print button. Save/download PDF. "Email sent" notice.
- [ ] Admin: collapsible left nav (Cities / Hotels / Rooms).
- [ ] Admin: search/filter bar per grid.
- [ ] Admin: Cities grid (name, country, post office, #hotels, created, modified, delete).
- [ ] Admin: Hotels grid (name, stars, owner, #rooms, created, modified, delete).
- [ ] Admin: Rooms grid (number, availability, adults, children, created, modified, delete).
- [ ] Admin: Create button → create form for city/hotel/room.
- [ ] Admin: row click → update form (City: name/country/post office; Hotel: name/city/owner*/location; Room: number*/adults/children). *\* read-only unless BE G7/G9 are fixed.*
- [ ] RBAC: admin area Admin-only; 401/403 handled; UI hides unauthorized actions.
- [ ] Central error handling + logging. No tokens or card data logged.
- [ ] Unit test suite covering the §13.6 list.
