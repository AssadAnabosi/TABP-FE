import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { hotelsApi } from '@/api/hotels'
import { queryKeys } from '@/api/queryKeys'
import type { AdminHotelListParams, HotelApprovalStatus, HotelDto } from '@/api/types'
import { useSession } from '@/auth/session'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { StarRating } from '@/components/StarRating'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDebouncedValue } from '@/lib/useDebouncedValue'

import { ManagePageHeader } from '../components/ManagePageHeader'
import { deleteColumn, timestampColumns } from '../components/columns'
import { DataGrid } from '../components/DataGrid'
import { ApprovalBadge } from './ApprovalBadge'
import { HotelFormSheet } from './HotelFormSheet'
import { useManagedHotels } from './managedHotels'

const PAGE_SIZE = 20
const STATUSES: HotelApprovalStatus[] = ['Approved', 'Pending', 'Rejected']

function StatusFilter({
  value,
  onChange,
}: {
  value: HotelApprovalStatus | undefined
  onChange: (value: HotelApprovalStatus | undefined) => void
}) {
  return (
    <Select
      value={value ?? 'all'}
      onValueChange={(v) => onChange(v === 'all' ? undefined : (v as HotelApprovalStatus))}
    >
      <SelectTrigger className="w-44" aria-label="Approval status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All statuses</SelectItem>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function HotelsPage() {
  const queryClient = useQueryClient()
  const isAdmin = useSession((s) => s.user?.role === 'Admin')
  const [search, setSearch] = useState('')
  const keyword = useDebouncedValue(search.trim(), 300)
  const [status, setStatus] = useState<HotelApprovalStatus | undefined>()
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<HotelDto | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<HotelDto | null>(null)

  // Admin: server-paged GET /api/hotels with filters.
  const params: AdminHotelListParams = {
    keyword: keyword || undefined,
    approvalStatus: status,
    pageNumber: page,
    pageSize: PAGE_SIZE,
  }
  const adminHotels = useQuery({
    queryKey: queryKeys.hotels.adminList(params),
    queryFn: ({ signal }) => hotelsApi.list(params, signal),
    placeholderData: keepPreviousData,
    enabled: isAdmin,
  })

  // HotelOwner: their own hotels (GET /api/hotels/mine has no filters), filtered client-side.
  const ownHotels = useManagedHotels()
  const ownFiltered = useMemo(() => {
    if (isAdmin || !ownHotels.data) return undefined
    const term = keyword.toLowerCase()
    return ownHotels.data.filter(
      (h) =>
        (!status || h.approvalStatus === status) &&
        (!term || [h.name, h.address, h.cityName].some((v) => v.toLowerCase().includes(term))),
    )
  }, [isAdmin, ownHotels.data, keyword, status])

  const remove = useMutation({
    mutationFn: (hotel: HotelDto) => hotelsApi.delete(hotel.id),
    onSuccess: (_, hotel) => {
      toast.success(`${hotel.name} deleted.`)
      setDeleting(null)
      void queryClient.invalidateQueries({ queryKey: queryKeys.hotels.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.cities.all })
    },
    onError: () => setDeleting(null),
  })

  const columns = useMemo<ColumnDef<HotelDto, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.cityName}</div>
          </div>
        ),
      },
      {
        accessorKey: 'starRating',
        header: 'Stars',
        cell: ({ row }) => <StarRating value={row.original.starRating} />,
      },
      ...(isAdmin ? [{ accessorKey: 'ownerName', header: 'Owner' } as ColumnDef<HotelDto, unknown>] : []),
      {
        accessorKey: 'roomsCount',
        header: 'Rooms',
        cell: ({ row }) => <span className="tabular-nums">{row.original.roomsCount}</span>,
      },
      {
        accessorKey: 'approvalStatus',
        header: 'Status',
        cell: ({ row }) => <ApprovalBadge hotel={row.original} />,
      },
      ...timestampColumns<HotelDto>(),
      // Deleting is Admin-only, and the API refuses (409) while the hotel still has rooms.
      ...(isAdmin
        ? [
            deleteColumn<HotelDto>(
              (h) => h.name,
              setDeleting,
              (h) =>
                h.roomsCount > 0
                  ? `Delete its ${h.roomsCount} room${h.roomsCount === 1 ? '' : 's'} first.`
                  : null,
            ),
          ]
        : []),
    ],
    [isAdmin],
  )

  const active = isAdmin ? adminHotels : ownHotels
  const filtered = Boolean(keyword || status)

  return (
    <>
      <ManagePageHeader
        title={isAdmin ? 'Hotels' : 'My hotels'}
        search={search}
        onSearchChange={(value) => {
          setSearch(value)
          setPage(1)
        }}
        searchPlaceholder="Search by hotel, address or city…"
        createLabel="New hotel"
        onCreate={() => {
          setEditing(null)
          setFormOpen(true)
        }}
        filters={
          <StatusFilter
            value={status}
            onChange={(value) => {
              setStatus(value)
              setPage(1)
            }}
          />
        }
      />
      <DataGrid
        columns={columns}
        data={isAdmin ? adminHotels.data?.items : ownFiltered}
        isLoading={active.isPending}
        error={active.error}
        onRetry={() => void active.refetch()}
        onRowClick={(hotel) => {
          setEditing(hotel)
          setFormOpen(true)
        }}
        rowLabel={(h) => h.name}
        emptyMessage={
          filtered
            ? 'No hotels match your filters.'
            : isAdmin
              ? 'No hotels yet.'
              : 'You have no hotels yet. Create one to submit it for approval.'
        }
        serverPagination={
          isAdmin && adminHotels.data
            ? {
                pageNumber: adminHotels.data.pageNumber,
                totalPages: adminHotels.data.totalPages,
                totalCount: adminHotels.data.totalCount,
                onPageChange: setPage,
              }
            : undefined
        }
      />
      <HotelFormSheet hotel={editing} open={formOpen} onOpenChange={setFormOpen} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description="This permanently removes the hotel and its listing. This can't be undone."
        confirmLabel="Delete hotel"
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  )
}
