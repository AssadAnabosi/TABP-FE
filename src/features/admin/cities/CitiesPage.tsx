import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { citiesApi } from '@/api/cities'
import { queryKeys } from '@/api/queryKeys'
import type { CityDto } from '@/api/types'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { HotelImage } from '@/components/HotelImage'
import { useDebouncedValue } from '@/lib/useDebouncedValue'

import { AdminPageHeader } from '../components/AdminPageHeader'
import { deleteColumn, timestampColumns } from '../components/columns'
import { DataGrid } from '../components/DataGrid'
import { CityFormDialog } from './CityFormDialog'

const PAGE_SIZE = 20

export function CitiesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const keyword = useDebouncedValue(search.trim(), 300)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<CityDto | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<CityDto | null>(null)

  const params = { keyword: keyword || undefined, pageNumber: page, pageSize: PAGE_SIZE }
  const cities = useQuery({
    queryKey: queryKeys.cities.list(params),
    queryFn: () => citiesApi.list(params),
    placeholderData: keepPreviousData,
  })

  const remove = useMutation({
    mutationFn: (city: CityDto) => citiesApi.delete(city.id),
    onSuccess: (_, city) => {
      toast.success(`${city.name} deleted.`)
      setDeleting(null)
      void queryClient.invalidateQueries({ queryKey: queryKeys.cities.all })
    },
    // 409 (still has hotels) surfaces the server's detail through the global toast.
    onError: () => setDeleting(null),
  })

  const columns = useMemo<ColumnDef<CityDto, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <HotelImage src={row.original.thumbnailUrl} alt="" className="size-9 shrink-0 rounded-md" />
            <span className="font-medium">{row.original.name}</span>
          </div>
        ),
      },
      { accessorKey: 'country', header: 'Country' },
      { accessorKey: 'postOffice', header: 'Post office' },
      {
        accessorKey: 'hotelsCount',
        header: 'Hotels',
        cell: ({ row }) => <span className="tabular-nums">{row.original.hotelsCount}</span>,
      },
      ...timestampColumns<CityDto>(),
      deleteColumn<CityDto>(
        (c) => c.name,
        setDeleting,
        // Pre-empt the 409: a city with hotels can't be deleted.
        (c) =>
          c.hotelsCount > 0
            ? `Remove its ${c.hotelsCount} hotel${c.hotelsCount === 1 ? '' : 's'} first.`
            : null,
      ),
    ],
    [],
  )

  return (
    <>
      <AdminPageHeader
        title="Cities"
        search={search}
        onSearchChange={(value) => {
          setSearch(value)
          setPage(1)
        }}
        searchPlaceholder="Search cities by name or country…"
        createLabel="New city"
        onCreate={() => {
          setEditing(null)
          setFormOpen(true)
        }}
      />
      <DataGrid
        columns={columns}
        data={cities.data?.items}
        isLoading={cities.isPending}
        error={cities.error}
        onRetry={() => void cities.refetch()}
        onRowClick={(city) => {
          setEditing(city)
          setFormOpen(true)
        }}
        rowLabel={(c) => c.name}
        emptyMessage={keyword ? 'No cities match your search.' : 'No cities yet.'}
        serverPagination={
          cities.data && {
            pageNumber: cities.data.pageNumber,
            totalPages: cities.data.totalPages,
            totalCount: cities.data.totalCount,
            onPageChange: setPage,
          }
        }
      />
      <CityFormDialog city={editing} open={formOpen} onOpenChange={setFormOpen} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description="This permanently removes the city. This can't be undone."
        confirmLabel="Delete city"
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  )
}
