import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { queryKeys } from '@/api/queryKeys'
import { roomsApi } from '@/api/rooms'
import type { RoomDto } from '@/api/types'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatMoney } from '@/lib/money'

import { AdminPageHeader } from '../components/AdminPageHeader'
import { deleteColumn, timestampColumns } from '../components/columns'
import { DataGrid } from '../components/DataGrid'
import { fetchAllHotels } from '../hotels/adminHotels'
import { RoomFormDialog } from './RoomFormDialog'
import { displayRoomNumber, isSoftDeleted } from './roomNumber'

export function RoomsPage() {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const hotelId = Number(params.get('hotelId')) || null
  const [search, setSearch] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)
  const [editing, setEditing] = useState<RoomDto | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<RoomDto | null>(null)

  // Rooms are listed per hotel only, so a hotel must be chosen first (kept in the URL).
  const hotels = useQuery({
    queryKey: [...queryKeys.hotels.all, 'admin-all'],
    queryFn: fetchAllHotels,
    staleTime: 2 * 60_000,
  })
  const rooms = useQuery({
    queryKey: queryKeys.rooms.byHotel(hotelId ?? 0),
    queryFn: () => roomsApi.byHotel(hotelId!),
    enabled: hotelId !== null,
  })

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rooms.data?.filter(
      (r) =>
        (showDeleted || !isSoftDeleted(r.number)) &&
        (!term ||
          displayRoomNumber(r.number).toLowerCase().includes(term) ||
          r.roomType.toLowerCase().includes(term)),
    )
  }, [rooms.data, search, showDeleted])

  const remove = useMutation({
    mutationFn: (room: RoomDto) => roomsApi.delete(room.id),
    onSuccess: (_, room) => {
      toast.success(`Room ${displayRoomNumber(room.number)} deleted.`)
      setDeleting(null)
      void queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.hotels.all })
    },
    onError: () => setDeleting(null),
  })

  const columns = useMemo<ColumnDef<RoomDto, unknown>[]>(
    () => [
      {
        id: 'number',
        accessorFn: (r) => displayRoomNumber(r.number),
        header: 'Number',
        sortingFn: 'alphanumeric',
        cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
      },
      { accessorKey: 'roomType', header: 'Type' },
      {
        // RoomDto only carries isActive; date-based availability isn't exposed (kickoff §9 G8).
        id: 'availability',
        accessorKey: 'isActive',
        header: 'Availability',
        cell: ({ row }) =>
          isSoftDeleted(row.original.number) ? (
            <Badge variant="destructive">Deleted</Badge>
          ) : row.original.isActive ? (
            <Badge>Available</Badge>
          ) : (
            <Badge variant="outline">Inactive</Badge>
          ),
      },
      { accessorKey: 'adultCapacity', header: 'Adults' },
      { accessorKey: 'childCapacity', header: 'Children' },
      {
        accessorKey: 'basePrice',
        header: 'Base price',
        cell: ({ row }) => formatMoney(row.original.basePrice, row.original.currency),
      },
      ...timestampColumns<RoomDto>(),
      deleteColumn<RoomDto>(
        (r) => `room ${displayRoomNumber(r.number)}`,
        setDeleting,
        (r) => (isSoftDeleted(r.number) ? 'Already deleted.' : null),
      ),
    ],
    [],
  )

  const selectedHotel = hotels.data?.find((h) => h.id === hotelId)

  return (
    <>
      <AdminPageHeader
        title="Rooms"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter by number or type…"
        createLabel="New room"
        createDisabled={hotelId === null}
        onCreate={() => {
          setEditing(null)
          setFormOpen(true)
        }}
        filters={
          <>
            <Select
              value={hotelId ? String(hotelId) : ''}
              onValueChange={(value) => setParams({ hotelId: value }, { replace: true })}
            >
              <SelectTrigger className="w-64" aria-label="Hotel">
                <SelectValue placeholder={hotels.isPending ? 'Loading hotels…' : 'Choose a hotel'} />
              </SelectTrigger>
              <SelectContent>
                {hotels.data?.map((h) => (
                  <SelectItem key={h.id} value={String(h.id)}>
                    {h.name} · {h.cityName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-deleted"
                checked={showDeleted}
                onCheckedChange={(v) => setShowDeleted(v === true)}
              />
              <Label htmlFor="show-deleted" className="font-normal">
                Show deleted
              </Label>
            </div>
          </>
        }
      />

      {hotelId === null ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          Choose a hotel to manage its rooms.
        </div>
      ) : (
        <DataGrid
          columns={columns}
          data={visible}
          isLoading={rooms.isPending}
          error={rooms.error}
          onRetry={() => void rooms.refetch()}
          onRowClick={(room) => {
            if (isSoftDeleted(room.number)) return
            setEditing(room)
            setFormOpen(true)
          }}
          rowLabel={(r) => `room ${displayRoomNumber(r.number)}`}
          emptyMessage={
            search
              ? 'No rooms match your filter.'
              : `${selectedHotel?.name ?? 'This hotel'} has no rooms yet.`
          }
        />
      )}

      {hotelId !== null && (
        <RoomFormDialog hotelId={hotelId} room={editing} open={formOpen} onOpenChange={setFormOpen} />
      )}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete room ${deleting ? displayRoomNumber(deleting.number) : ''}?`}
        description="Rooms that were never booked are removed completely. Rooms with booking history are deactivated instead, keeping the history and freeing the number."
        confirmLabel="Delete room"
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  )
}
