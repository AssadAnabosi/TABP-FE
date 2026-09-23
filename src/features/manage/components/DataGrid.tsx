import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useState } from 'react'

import { ErrorState } from '@/components/StatusPages'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export interface ServerPagination {
  pageNumber: number
  totalPages: number
  totalCount: number
  onPageChange: (page: number) => void
}

interface DataGridProps<T> {
  columns: ColumnDef<T, unknown>[]
  data: T[] | undefined
  isLoading: boolean
  error?: unknown
  onRetry?: () => void
  onRowClick?: (row: T) => void
  rowLabel?: (row: T) => string
  /** Verb for the row click in the accessible name, e.g. "Open" (default "Edit"). */
  rowActionLabel?: string
  emptyMessage?: string
  /** Server paging when the endpoint is paged; otherwise the grid pages client-side. */
  serverPagination?: ServerPagination
  pageSize?: number
}

/** Shared admin grid (kickoff §8.9.2): sortable columns, row click → update form, loading/empty/error states. */
export function DataGrid<T>({
  columns,
  data,
  isLoading,
  error,
  onRetry,
  onRowClick,
  rowLabel,
  rowActionLabel = 'Edit',
  emptyMessage = 'Nothing here yet.',
  serverPagination,
  pageSize = 20,
}: DataGridProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  // TanStack Table returns functions that the React Compiler lint can't memoize safely; that's expected here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: data ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(serverPagination
      ? {}
      : { getPaginationRowModel: getPaginationRowModel(), initialState: { pagination: { pageSize } } }),
  })

  if (error) return <ErrorState error={error} onRetry={onRetry} />

  const rows = table.getRowModel().rows
  const pager = serverPagination
    ? {
        page: serverPagination.pageNumber,
        pages: Math.max(1, serverPagination.totalPages),
        total: serverPagination.totalCount,
        prev: () => serverPagination.onPageChange(serverPagination.pageNumber - 1),
        next: () => serverPagination.onPageChange(serverPagination.pageNumber + 1),
      }
    : {
        page: table.getState().pagination.pageIndex + 1,
        pages: Math.max(1, table.getPageCount()),
        total: data?.length ?? 0,
        prev: () => table.previousPage(),
        next: () => table.nextPage(),
      }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  const sortable = header.column.getCanSort()
                  const dir = header.column.getIsSorted()
                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : undefined}
                    >
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {dir === 'asc' ? (
                            <ArrowUp className="size-3.5" />
                          ) : dir === 'desc' ? (
                            <ArrowDown className="size-3.5" />
                          ) : (
                            <ArrowUpDown className="size-3.5 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }, (_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  tabIndex={onRowClick ? 0 : undefined}
                  aria-label={
                    onRowClick && rowLabel ? `${rowActionLabel} ${rowLabel(row.original)}` : undefined
                  }
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault()
                            onRowClick(row.original)
                          }
                        }
                      : undefined
                  }
                  className={cn(
                    onRowClick && 'cursor-pointer focus-visible:bg-muted focus-visible:outline-none',
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
      {!isLoading && pager.total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {pager.total} record{pager.total === 1 ? '' : 's'}
          </span>
          {pager.pages > 1 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={pager.prev} disabled={pager.page <= 1}>
                Previous
              </Button>
              <span>
                Page {pager.page} of {pager.pages}
              </span>
              <Button variant="outline" size="sm" onClick={pager.next} disabled={pager.page >= pager.pages}>
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
