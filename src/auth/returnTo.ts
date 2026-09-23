/** Only allow same-app relative paths as a post-login destination (no open redirects). */
export function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}
