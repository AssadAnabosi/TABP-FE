import { createBrowserRouter, Navigate, Outlet } from 'react-router'

import { AnonymousOnly, RequireAuth, RequireRole } from '@/auth/guards'
import { AppLayout } from '@/components/layout/AppLayout'
import { NotFoundPage, RouteErrorPage } from '@/components/StatusPages'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { ConfirmationPage } from '@/features/bookings/ConfirmationPage'
import { MyBookingsPage } from '@/features/bookings/MyBookingsPage'
import { CheckoutPage } from '@/features/checkout/CheckoutPage'
import { HomePage } from '@/features/home/HomePage'
import { HotelPage } from '@/features/hotel/HotelPage'
import { SearchPage } from '@/features/search/SearchPage'

// Route map: kickoff §7. The admin area is lazy-loaded so customers never download it (kickoff §6).
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        // Nested boundary keeps the header/footer visible when a page throws.
        errorElement: <RouteErrorPage />,
        children: [
          { index: true, element: <HomePage /> },
          {
            path: 'login',
            element: (
              <AnonymousOnly>
                <LoginPage />
              </AnonymousOnly>
            ),
          },
          {
            path: 'register',
            element: (
              <AnonymousOnly>
                <RegisterPage />
              </AnonymousOnly>
            ),
          },
          { path: 'search', element: <SearchPage /> },
          { path: 'hotels/:hotelId', element: <HotelPage /> },
          // The cart is a header drawer; /cart deep links go straight to checkout.
          { path: 'cart', element: <Navigate to="/checkout" replace /> },
          {
            path: 'checkout',
            element: (
              <RequireAuth>
                <CheckoutPage />
              </RequireAuth>
            ),
          },
          {
            path: 'bookings',
            element: (
              <RequireAuth>
                <MyBookingsPage />
              </RequireAuth>
            ),
          },
          {
            path: 'bookings/:bookingId/confirmation',
            element: (
              <RequireAuth>
                <ConfirmationPage />
              </RequireAuth>
            ),
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
  {
    path: 'admin',
    element: (
      <RequireRole roles={['Admin']}>
        <Outlet />
      </RequireRole>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      {
        lazy: async () => ({ Component: (await import('@/features/admin/AdminLayout')).default }),
        children: [
          { index: true, element: <Navigate to="cities" replace /> },
          {
            path: 'cities',
            lazy: async () => ({
              Component: (await import('@/features/admin/cities/CitiesPage')).CitiesPage,
            }),
          },
          {
            path: 'hotels',
            lazy: async () => ({
              Component: (await import('@/features/admin/hotels/HotelsPage')).HotelsPage,
            }),
          },
          {
            path: 'rooms',
            lazy: async () => ({ Component: (await import('@/features/admin/rooms/RoomsPage')).RoomsPage }),
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
