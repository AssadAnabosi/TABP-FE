import { MutationCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError, isApiError } from '@/api/errors'

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApiError
    mutationMeta: {
      /** Set when the component shows the error itself (e.g. inline form errors). */
      skipGlobalErrorToast?: boolean
    }
  }
}

export const queryClient = new QueryClient({
  // Global toast for mutation errors (kickoff §13.2). Forms opt out and render errors inline.
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.skipGlobalErrorToast) return
      toast.error(isApiError(error) ? error.userMessage : 'Something went wrong.')
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      // Mind the 100 req/min global rate limit (kickoff §4.8).
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (isApiError(error) && error.status >= 400 && error.status < 500) return false
        return failureCount < 1
      },
    },
    mutations: { retry: false },
  },
})
