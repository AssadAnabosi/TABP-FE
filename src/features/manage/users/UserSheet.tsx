import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { queryKeys } from '@/api/queryKeys'
import type { UserListItemDto, UserRole } from '@/api/types'
import { usersApi } from '@/api/users'
import { useSession } from '@/auth/session'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { formatDateTime } from '@/lib/dates'

import { USER_ROLES } from '@/auth/roles'

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  )
}

interface UserSheetProps {
  user: UserListItemDto | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Admin: view a user, change their role, activate/deactivate them. */
export function UserSheet({ user, open, onOpenChange }: UserSheetProps) {
  const queryClient = useQueryClient()
  const selfId = useSession((s) => s.user?.id)
  const isSelf = user?.id === selfId
  const [role, setRole] = useState<UserRole | null>(null)

  const details = useQuery({
    queryKey: queryKeys.users.detail(user?.id ?? ''),
    queryFn: () => usersApi.get(user!.id),
    enabled: open && user !== null,
  })
  const current = details.data ?? user

  const refresh = () => void queryClient.invalidateQueries({ queryKey: queryKeys.users.all })

  const saveRole = useMutation({
    mutationFn: (newRole: UserRole) => usersApi.setRole(user!.id, newRole),
    onSuccess: (_, newRole) => {
      toast.success(
        `${user!.firstName} is now ${newRole === 'HotelOwner' ? 'a hotel owner' : `a ${newRole.toLowerCase()}`}.`,
      )
      setRole(null)
      refresh()
    },
  })
  const setActive = useMutation({
    mutationFn: (isActive: boolean) => usersApi.setActive(user!.id, isActive),
    onSuccess: (_, isActive) => {
      toast.success(`${user!.firstName} ${isActive ? 'reactivated' : 'deactivated'}.`)
      refresh()
    },
  })

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) setRole(null)
        onOpenChange(next)
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {current && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {current.firstName} {current.lastName}
                {!current.isActive && <Badge variant="destructive">Inactive</Badge>}
              </SheetTitle>
              <SheetDescription>{current.email}</SheetDescription>
            </SheetHeader>
            <div className="space-y-6 px-4 pb-6">
              {details.isPending ? (
                <Skeleton className="h-16 w-full" />
              ) : details.data ? (
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Bookings" value={details.data.bookingsCount} />
                  <Stat label="Hotels owned" value={details.data.ownedHotelsCount} />
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>Joined {formatDateTime(current.createdAt)}</span>
                {details.data && <span>Modified {formatDateTime(details.data.modifiedAt)}</span>}
              </div>

              {isSelf && (
                <Alert>
                  <AlertDescription>
                    You can't change your own role or deactivate your own account.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-2">
                <Label htmlFor="user-role">Role</Label>
                <div className="flex gap-2">
                  <Select
                    value={role ?? current.role}
                    onValueChange={(v) => setRole(v as UserRole)}
                    disabled={isSelf}
                  >
                    <SelectTrigger id="user-role" className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    disabled={isSelf || !role || role === current.role || saveRole.isPending}
                    onClick={() => role && saveRole.mutate(role)}
                  >
                    {saveRole.isPending ? 'Saving…' : 'Change role'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Takes effect the next time they sign in (or their session refreshes).
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div>
                  <Label htmlFor="user-active">Active account</Label>
                  <p className="text-xs text-muted-foreground">Inactive users can't sign in.</p>
                </div>
                <Switch
                  id="user-active"
                  checked={current.isActive}
                  disabled={isSelf || setActive.isPending}
                  onCheckedChange={(checked) => setActive.mutate(checked)}
                />
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
