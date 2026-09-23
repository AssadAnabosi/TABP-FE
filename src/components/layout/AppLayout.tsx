import { BedDouble, LayoutDashboard, LogOut, Moon, Receipt, Sun, User } from 'lucide-react'
import { Link, NavLink, Outlet, ScrollRestoration, useNavigate } from 'react-router'

import { logout, useSession } from '@/auth/session'
import { CartSheet } from '@/cart/CartSheet'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/lib/theme'

export function ThemeToggle() {
  const dark = useTheme((s) => s.resolved === 'dark')
  const setPreference = useTheme((s) => s.setPreference)
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`}
      onClick={() => setPreference(dark ? 'light' : 'dark')}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  )
}

function UserMenu() {
  const user = useSession((s) => s.user)
  const navigate = useNavigate()

  if (!user) {
    return (
      <Button asChild size="sm">
        <Link to="/login">Log in</Link>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <User />
          <span className="hidden sm:inline">{user.firstName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="text-sm font-medium">
            {user.firstName} {user.lastName}
          </div>
          <div className="truncate text-xs text-muted-foreground">{user.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/bookings')}>
          <Receipt /> My bookings
        </DropdownMenuItem>
        {user.role === 'Admin' && (
          <DropdownMenuItem onSelect={() => navigate('/admin')}>
            <LayoutDashboard /> Admin
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await logout()
            navigate('/')
          }}
        >
          <LogOut /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppHeader() {
  const role = useSession((s) => s.user?.role)
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur print:hidden">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4">
        <Link to="/" className="mr-auto flex items-center gap-2 font-semibold">
          <BedDouble className="size-5 text-primary" aria-hidden />
          <span>TABP Stays</span>
        </Link>
        {role === 'Admin' && (
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <NavLink to="/admin">Admin</NavLink>
          </Button>
        )}
        <ThemeToggle />
        <CartSheet />
        <UserMenu />
      </div>
    </header>
  )
}

/** Customer-facing shell. */
export function AppLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground print:hidden">
        TABP Stays · Demo booking platform
      </footer>
      <ScrollRestoration />
    </div>
  )
}
