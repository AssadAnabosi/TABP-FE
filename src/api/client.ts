// The single HTTP entry point (kickoff §13.1). Components never call fetch directly.
//
// Session rules (kickoff §5):
// - The access token lives in this module's memory only; never in localStorage/sessionStorage.
// - The refresh token is an HttpOnly cookie scoped to /api/auth; JS never sees it.
// - A 401 from a non-auth endpoint triggers ONE shared ("single-flight") refresh, then the request is
//   retried once. /api/auth/* is limited to 10 req/min/IP, so refresh must never loop.
import { logger } from '@/lib/logger'

import { ApiError, apiErrorFromResponse } from './errors'
import type { AuthResult } from './types'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

type QueryValue = string | number | boolean | null | undefined | Array<string | number>
export type Query = Record<string, QueryValue>

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  query?: Query
  body?: unknown
  signal?: AbortSignal
  /** Attach the Bearer token and refresh on 401 (default true). */
  auth?: boolean
}

// ---------------------------------------------------------------------------
// Session state (token + listener so the auth store can mirror changes)
// ---------------------------------------------------------------------------

let accessToken: string | null = null
let proactiveTimer: ReturnType<typeof setTimeout> | undefined
type SessionListener = (result: AuthResult | null) => void
let sessionListener: SessionListener = () => {}

/** The auth store registers here to learn about refreshes and forced logouts. */
export function onSessionChange(listener: SessionListener) {
  sessionListener = listener
}

export function getAccessToken() {
  return accessToken
}

/** Stores a fresh session (after login/register/refresh) and schedules a proactive refresh. */
export function applyAuthResult(result: AuthResult | null) {
  accessToken = result?.accessToken ?? null
  clearTimeout(proactiveTimer)
  if (result) scheduleProactiveRefresh(result.accessToken)
  sessionListener(result)
}

function scheduleProactiveRefresh(token: string) {
  const exp = decodeJwtExp(token)
  if (!exp) return
  // Refresh ~1 min before expiry (the API uses zero clock skew) to avoid a 401 round-trip.
  const delay = exp * 1000 - Date.now() - 60_000
  if (delay <= 0) return
  proactiveTimer = setTimeout(() => void refreshSession(), delay)
}

function decodeJwtExp(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const exp = (JSON.parse(json) as { exp?: number }).exp
    return typeof exp === 'number' ? exp : null
  } catch {
    return null
  }
}

let refreshInFlight: Promise<AuthResult | null> | null = null

/**
 * Exchanges the refresh cookie for a new access token. Concurrent callers share one request.
 * Resolves null (and clears the session) when the cookie is missing/expired/revoked.
 */
export function refreshSession(): Promise<AuthResult | null> {
  refreshInFlight ??= (async () => {
    try {
      const result = await request<AuthResult>('/api/auth/refresh', { method: 'POST', auth: false })
      applyAuthResult(result)
      return result
    } catch (error) {
      // A 429 here means "slow down", not "logged out" — but we can't prove the session is alive either,
      // so treat it as anonymous for this call; the user can log in again after the window passes.
      if (!(error instanceof ApiError) || error.status !== 401) {
        logger.warn('Session refresh failed', {
          status: error instanceof ApiError ? error.status : 'unknown',
        })
      }
      applyAuthResult(null)
      return null
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

export function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue
    // Array params repeat: ?amenityIds=1&amenityIds=4 (kickoff §4.3)
    if (Array.isArray(value)) value.forEach((v) => params.append(key, String(v)))
    else params.append(key, String(value))
  }
  const qs = params.toString()
  return `${BASE_URL}${path}${qs ? `?${qs}` : ''}`
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const { method = 'GET', query, body, signal, auth = true } = options
  const headers: Record<string, string> = { Accept: 'application/json, application/problem+json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`

  try {
    return await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
      credentials: 'include', // needed for the refresh cookie when the API is cross-origin
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    logger.error('Network error', { path, method })
    throw new ApiError({ status: 0, title: 'Network error' })
  }
}

/** Sends a request, refreshing + retrying once on 401. Returns the raw successful Response. */
async function sendWithRefresh(path: string, options: RequestOptions): Promise<Response> {
  const hadToken = options.auth !== false && accessToken !== null
  let response = await send(path, options)

  if (response.status === 401 && hadToken && !path.startsWith('/api/auth')) {
    const refreshed = await refreshSession()
    if (refreshed) response = await send(path, options)
  }

  if (!response.ok) {
    const error = await apiErrorFromResponse(response)
    logger.warn('API error', {
      path,
      method: options.method ?? 'GET',
      status: error.status,
      traceId: error.traceId,
    })
    throw error
  }
  return response
}

/** JSON request. Resolves undefined for 204 No Content (never .json() a 204). */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await sendWithRefresh(path, options)
  if (response.status === 204) return undefined as T
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

/** Binary download (e.g. the confirmation PDF, which needs the Bearer header). */
export async function requestBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
  const response = await sendWithRefresh(path, options)
  return response.blob()
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  delete: <T = void>(path: string) => request<T>(path, { method: 'DELETE' }),
}
