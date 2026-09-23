import { Building2, ChevronsLeft, ChevronsRight, Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'

import { useSession } from '@/auth/session'
import { AppHeader } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import { navFor } from './nav'

const COLLAPSED_KEY = 'tabp.manage.navCollapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

function NavLinks({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const role = useSession((s) => s.user?.role)
  return (
    <nav aria-label="Management" className="grid gap-1">
      {navFor(role).map(({ path, label, icon: Icon }) => {
        const link = (
          <NavLink
            key={path}
            to={`/manage/${path}`}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                collapsed && 'justify-center px-2',
              )
            }
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {collapsed ? <span className="sr-only">{label}</span> : label}
          </NavLink>
        )
        return collapsed ? (
          <Tooltip key={path}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        ) : (
          link
        )
      })}
    </nav>
  )
}

/**
 * Management shell for Admins and HotelOwners: collapsible left navigator (icons-only when collapsed,
 * persisted), overlay drawer on mobile (brief 6.1).
 */
export default function ManageLayout() {
  const role = useSession((s) => s.user?.role)
  const title = role === 'Admin' ? 'Administration' : 'My properties'
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0')
    } catch {
      // Storage unavailable (private mode): the preference just won't persist.
    }
  }, [collapsed])

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />
      <div className="flex flex-1">
        <aside
          className={cn(
            'sticky top-14 hidden h-[calc(100svh-3.5rem)] shrink-0 flex-col border-r p-3 transition-[width] md:flex',
            collapsed ? 'w-16' : 'w-56',
          )}
        >
          {!collapsed && (
            <Link
              to="/manage"
              className="mb-3 flex items-center gap-2 px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
            >
              <Building2 className="size-3.5" aria-hidden /> {title}
            </Link>
          )}
          <NavLinks collapsed={collapsed} />
          <Button
            variant="ghost"
            size="sm"
            className={cn('mt-auto', collapsed ? 'justify-center' : 'justify-start')}
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <ChevronsRight />
            ) : (
              <>
                <ChevronsLeft /> Collapse
              </>
            )}
          </Button>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="border-b px-4 py-2 md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu /> Menu
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <SheetHeader>
                  <SheetTitle>{title}</SheetTitle>
                </SheetHeader>
                <div className="px-3">
                  <NavLinks collapsed={false} onNavigate={() => setMobileOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <main className="mx-auto max-w-7xl p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
