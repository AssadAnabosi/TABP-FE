import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'

import { queryKeys } from '@/api/queryKeys'
import type { UserListItemDto, UserRole } from '@/api/types'
import { usersApi } from '@/api/users'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDateTime } from '@/lib/dates'
import { useDebouncedValue } from '@/lib/useDebouncedValue'

import { ManagePageHeader } from '../components/ManagePageHeader'
import { DataGrid } from '../components/DataGrid'
import { roleLabel, USER_ROLES } from '@/auth/roles'
import { UserSheet } from './UserSheet'

const PAGE_SIZE = 20

/** Admin user management. Accounts are created by self-registration, so there's no Create here. */
export function UsersPage() {
  const [search, setSearch] = useState('')
  const keyword = useDebouncedValue(search.trim(), 300)
  const [role, setRole] = useState<UserRole | undefined>()
  const [active, setActive] = useState<boolean | undefined>()
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<UserListItemDto | null>(null)

  const params = {
    keyword: keyword || undefined,
    role,
    isActive: active,
    pageNumber: page,
    pageSize: PAGE_SIZE,
  }
  const users = useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => usersApi.list(params),
    placeholderData: keepPreviousData,
  })

  const columns = useMemo<ColumnDef<UserListItemDto, unknown>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (u) => `${u.firstName} ${u.lastName}`,
        header: 'Name',
        cell: ({ row }) => (
          <div>
            <div className="font-medium">
              {row.original.firstName} {row.original.lastName}
            </div>
            <div className="text-xs text-muted-foreground">{row.original.email}</div>
          </div>
        ),
      },
      { accessorKey: 'role', header: 'Role', cell: ({ row }) => roleLabel(row.original.role) },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge variant="secondary">Active</Badge>
          ) : (
            <Badge variant="destructive">Inactive</Badge>
          ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Joined',
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatDateTime(row.original.createdAt)}</span>
        ),
      },
    ],
    [],
  )

  const resetPage = () => setPage(1)

  return (
    <>
      <ManagePageHeader
        title="Users"
        search={search}
        onSearchChange={(v) => {
          setSearch(v)
          resetPage()
        }}
        searchPlaceholder="Search by name or email…"
        filters={
          <>
            <Select
              value={role ?? 'all'}
              onValueChange={(v) => {
                setRole(v === 'all' ? undefined : (v as UserRole))
                resetPage()
              }}
            >
              <SelectTrigger className="w-40" aria-label="Role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {USER_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={active === undefined ? 'all' : active ? 'active' : 'inactive'}
              onValueChange={(v) => {
                setActive(v === 'all' ? undefined : v === 'active')
                resetPage()
              }}
            >
              <SelectTrigger className="w-36" aria-label="Account status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />
      <DataGrid
        columns={columns}
        data={users.data?.items}
        isLoading={users.isPending}
        error={users.error}
        onRetry={() => void users.refetch()}
        onRowClick={setSelected}
        rowLabel={(u) => `${u.firstName} ${u.lastName}`}
        emptyMessage="No users match your filters."
        serverPagination={
          users.data && {
            pageNumber: users.data.pageNumber,
            totalPages: users.data.totalPages,
            totalCount: users.data.totalCount,
            onPageChange: setPage,
          }
        }
      />
      <UserSheet
        user={selected}
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </>
  )
}
