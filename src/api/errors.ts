import type { ProblemDetails } from './types'

/** Typed error thrown by the API client for every non-2xx response and for network failures. */
export class ApiError extends Error {
  readonly status: number // 0 = network failure / server unreachable
  readonly title: string | undefined
  readonly detail: string | undefined
  /** Field errors keyed by camelCase form field name. */
  readonly fieldErrors: Record<string, string>
  /** Object-level validation messages (empty-key errors). */
  readonly formErrors: string[]
  readonly traceId: string | undefined
  readonly retryAfterSeconds: number | undefined

  constructor(init: {
    status: number
    title?: string
    detail?: string | null
    fieldErrors?: Record<string, string>
    formErrors?: string[]
    traceId?: string
    retryAfterSeconds?: number
  }) {
    super(init.detail ?? init.title ?? `Request failed (${init.status})`)
    this.name = 'ApiError'
    this.status = init.status
    this.title = init.title
    this.detail = init.detail ?? undefined
    this.fieldErrors = init.fieldErrors ?? {}
    this.formErrors = init.formErrors ?? []
    this.traceId = init.traceId
    this.retryAfterSeconds = init.retryAfterSeconds
  }

  get isNetworkError() {
    return this.status === 0
  }

  /** A user-facing sentence for toasts and banners. */
  get userMessage(): string {
    if (this.isNetworkError) return "Can't reach the server. Check your connection and try again."
    if (this.status === 429) return 'Too many requests. Please wait a moment and try again.'
    if (this.status >= 500)
      return `Something went wrong on our side.${this.traceId ? ` (ref ${this.traceId})` : ''}`
    if (this.status === 403) return this.detail ?? "You don't have access to do that."
    return (
      this.detail ??
      this.formErrors[0] ??
      Object.values(this.fieldErrors)[0] ??
      this.title ??
      'Request failed.'
    )
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/**
 * Converts a server error key to a camelCase form field name.
 * FluentValidation keys are PascalCase ("CheckOut"); ASP.NET model-binding keys look like "$.checkOut".
 * An empty key means an object-level rule (returns '').
 */
export function toFieldName(key: string): string {
  const trimmed = key.replace(/^\$\.?/, '')
  if (!trimmed) return ''
  return trimmed
    .split('.')
    .map((part) => part.charAt(0).toLowerCase() + part.slice(1))
    .join('.')
}

export async function apiErrorFromResponse(response: Response): Promise<ApiError> {
  let problem: ProblemDetails = {}
  try {
    const text = await response.text()
    if (text) problem = JSON.parse(text) as ProblemDetails
  } catch {
    // Non-JSON error body (e.g. a proxy error page). Fall through with an empty problem.
  }

  const fieldErrors: Record<string, string> = {}
  const formErrors: string[] = []
  for (const [key, messages] of Object.entries(problem.errors ?? {})) {
    const field = toFieldName(key)
    const message = messages[0]
    if (!message) continue
    if (field) fieldErrors[field] ??= message
    else formErrors.push(message)
  }

  const retryAfter = Number(response.headers.get('Retry-After'))
  return new ApiError({
    status: response.status,
    title: problem.title,
    detail: problem.detail,
    fieldErrors,
    formErrors,
    traceId: problem.traceId,
    retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
  })
}
