import { RouterProvider } from 'react-router/dom'

import { useSession } from '@/auth/session'
import { router } from '@/routes'

function Splash() {
  return (
    <div className="flex min-h-svh items-center justify-center" role="status" aria-label="Loading">
      <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  )
}

/** Holds rendering until the boot-time refresh resolves, so guarded routes don't flash to /login. */
export function App() {
  const status = useSession((s) => s.status)
  return status === 'loading' ? <Splash /> : <RouterProvider router={router} />
}
