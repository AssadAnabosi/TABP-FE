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
import { AccountPage } from '@/features/account/AccountPage'
import { MANAGE_ROLES } from '@/features/manage/nav'
import { LegacyAdminRedirect, ManageIndex } from '@/features/manage/redirects'

// Route map: kickoff §7. The management area is lazy-loaded so customers never download it (kickoff §6).
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
          {
            path: 'account',
            element: (
              <RequireAuth>
                <AccountPage />
              </RequireAuth>
            ),
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
  // Management area for Admins and HotelOwners; pages the role can't use are guarded individually.
  {
    path: 'manage',
    element: (
      <RequireRole roles={MANAGE_ROLES}>
        <Outlet />
      </RequireRole>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      {
        lazy: async () => ({ Component: (await import('@/features/manage/ManageLayout')).default }),
        children: [
          { index: true, element: <ManageIndex /> },
          {
            path: 'hotels',
            lazy: async () => ({
              Component: (await import('@/features/manage/hotels/HotelsPage')).HotelsPage,
            }),
          },
          {
            path: 'rooms',
            lazy: async () => ({ Component: (await import('@/features/manage/rooms/RoomsPage')).RoomsPage }),
          },
          {
            path: 'bookings',
            lazy: async () => ({
              Component: (await import('@/features/manage/bookings/BookingsPage')).BookingsPage,
            }),
          },
          {
            path: 'amenities',
            lazy: async () => ({
              Component: (await import('@/features/manage/amenities/AmenitiesPage')).AmenitiesPage,
            }),
          },
          {
            element: (
              <RequireRole roles={['Admin']}>
                <Outlet />
              </RequireRole>
            ),
            children: [
              {
                path: 'cities',
                lazy: async () => ({
                  Component: (await import('@/features/manage/cities/CitiesPage')).CitiesPage,
                }),
              },
              {
                path: 'users',
                lazy: async () => ({
                  Component: (await import('@/features/manage/users/UsersPage')).UsersPage,
                }),
              },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
  { path: 'admin/*', element: <LegacyAdminRedirect /> },
])
