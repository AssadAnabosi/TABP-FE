import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

import { isApiError } from '@/api/errors'

/**
 * Maps a server 400 onto react-hook-form fields (keys already camelCased by the API client).
 * Returns the message(s) that didn't match a known field, for display as a form-level error.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: ReadonlyArray<Path<T>>,
): string | null {
  if (!isApiError(error)) return 'Something went wrong.'
  const unmatched: string[] = [...error.formErrors]
  for (const [field, message] of Object.entries(error.fieldErrors)) {
    if ((fields as readonly string[]).includes(field)) setError(field as Path<T>, { type: 'server', message })
    else unmatched.push(message)
  }
  if (error.status !== 400) return error.userMessage
  return unmatched.length ? unmatched.join(' ') : null
}

/** Props to spread onto an input rendered inside FormField (label, error and a11y wiring). */
export function fieldA11y(id: string, error?: string) {
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : undefined,
  } as const
}
