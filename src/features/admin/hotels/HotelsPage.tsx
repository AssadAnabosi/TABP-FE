import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { hotelsApi } from '@/api/hotels'
import { queryKeys } from '@/api/queryKeys'
import type { AdminHotelListParams, HotelApprovalStatus, HotelDto } from '@/api/types'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { StarRating } from '@/components/StarRating'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDebouncedValue } from '@/lib/useDebouncedValue'

import { AdminPageHeader } from '../components/AdminPageHeader'
import { deleteColumn, timestampColumns } from '../components/columns'
import { DataGrid } from '../components/DataGrid'
import { HotelFormSheet } from './HotelFormSheet'

const PAGE_SIZE = 20
const STATUSES: HotelApprovalStatus[] = ['Approved', 'Pending', 'Rejected']

const STATUS_VARIANT: Record<HotelApprovalStatus, 'default' | 'outline' | 'destructive'> = {
  Approved: 'default',
  Pending: 'outline',
  Rejected: 'destructive',
}

export function HotelsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const keyword = useDebouncedValue(search.trim(), 300)
  const [status, setStatus] = useState<HotelApprovalStatus | undefined>()
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<HotelDto | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<HotelDto | null>(null)

  const params: AdminHotelListParams = {
    keyword: keyword || undefined,
    approvalStatus: status,
    pageNumber: page,
    pageSize: PAGE_SIZE,
  }
  const hotels = useQuery({
    queryKey: queryKeys.hotels.adminList(params),
    queryFn: ({ signal }) => hotelsApi.list(params, signal),
    placeholderData: keepPreviousData,
  })

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
      { accessorKey: 'ownerName', header: 'Owner' },
      {
        accessorKey: 'roomsCount',
        header: 'Rooms',
        cell: ({ row }) => <span className="tabular-nums">{row.original.roomsCount}</span>,
      },
      {
        accessorKey: 'approvalStatus',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANT[row.original.approvalStatus]}>{row.original.approvalStatus}</Badge>
        ),
      },
      ...timestampColumns<HotelDto>(),
      deleteColumn<HotelDto>((h) => h.name, setDeleting),
    ],
    [],
  )

  const filtered = Boolean(keyword || status)

  return (
    <>
      <AdminPageHeader
        title="Hotels"
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
          <Select
            value={status ?? 'all'}
            onValueChange={(value) => {
              setStatus(value === 'all' ? undefined : (value as HotelApprovalStatus))
              setPage(1)
            }}
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
        }
      />
      <DataGrid
        columns={columns}
        data={hotels.data?.items}
        isLoading={hotels.isPending}
        error={hotels.error}
        onRetry={() => void hotels.refetch()}
        onRowClick={(hotel) => {
          setEditing(hotel)
          setFormOpen(true)
        }}
        rowLabel={(h) => h.name}
        emptyMessage={filtered ? 'No hotels match your filters.' : 'No hotels yet.'}
        serverPagination={
          hotels.data && {
            pageNumber: hotels.data.pageNumber,
            totalPages: hotels.data.totalPages,
            totalCount: hotels.data.totalCount,
            onPageChange: setPage,
          }
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
