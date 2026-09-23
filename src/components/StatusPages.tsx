import { FileQuestion, ShieldX, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router'

import { isApiError } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'

function StatusPage({
  icon,
  title,
  message,
  action,
}: {
  icon: ReactNode
  title: string
  message: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
      <div className="text-muted-foreground [&_svg]:size-12">{icon}</div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">{message}</p>
      {action ?? (
        <Button asChild>
          <Link to="/">Back to home</Link>
        </Button>
      )}
    </div>
  )
}

export function NotFoundPage({
  message = "We couldn't find what you were looking for.",
}: {
  message?: string
}) {
  return <StatusPage icon={<FileQuestion />} title="Not found" message={message} />
}

export function ForbiddenPage() {
  return (
    <StatusPage icon={<ShieldX />} title="No access" message="You don't have permission to view this page." />
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = isApiError(error) ? error.userMessage : 'Something went wrong.'
  return (
    <StatusPage
      icon={<TriangleAlert />}
      title="Something went wrong"
      message={message}
      action={onRetry ? <Button onClick={onRetry}>Try again</Button> : undefined}
    />
  )
}

/** React Router errorElement: route-level error boundary (kickoff §13.2). */
export function RouteErrorPage() {
  const error = useRouteError()
  if (isApiError(error) && error.status === 404) return <NotFoundPage />
  if (isApiError(error) && error.status === 403) return <ForbiddenPage />
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />
  logger.error('Unhandled route error', { error: error instanceof Error ? error.message : String(error) })
  return <ErrorState error={error} onRetry={() => window.location.reload()} />
}
