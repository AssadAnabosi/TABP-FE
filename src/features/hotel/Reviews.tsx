import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { toast } from 'sonner'

import { queryKeys } from '@/api/queryKeys'
import { reviewsApi } from '@/api/reviews'
import type { ReviewDto } from '@/api/types'
import { useSession } from '@/auth/session'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { StarRating } from '@/components/StarRating'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/dates'

import { ReviewForm } from './ReviewForm'

export function Reviews({
  hotelId,
  averageRating,
  reviewCount,
}: {
  hotelId: number
  averageRating: number
  reviewCount: number
}) {
  const queryClient = useQueryClient()
  const location = useLocation()
  const user = useSession((s) => s.user)
  const [writing, setWriting] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<ReviewDto | null>(null)

  const reviews = useInfiniteQuery({
    queryKey: queryKeys.reviews.byHotel(hotelId),
    queryFn: ({ pageParam }) => reviewsApi.byHotel(hotelId, { pageNumber: pageParam, pageSize: 10 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.pageNumber + 1 : undefined),
  })
  const items = reviews.data?.pages.flatMap((p) => p.items) ?? []
  // One review per user per hotel: once it's loaded, offer "edit" instead of "write".
  const ownReview = user ? items.find((r) => r.userId === user.id) : undefined

  const remove = useMutation({
    mutationFn: (r: ReviewDto) => reviewsApi.delete(r.id),
    onSuccess: () => {
      toast.success('Review deleted.')
      setDeleting(null)
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.byHotel(hotelId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.hotels.all })
    },
    onError: () => setDeleting(null),
  })

  return (
    <section aria-labelledby="reviews-heading" className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 id="reviews-heading" className="text-xl font-semibold">
          Guest reviews
        </h2>
        {reviewCount > 0 && (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-base font-semibold text-foreground">{averageRating.toFixed(1)}</span>
            <StarRating value={averageRating} /> · {reviewCount} review{reviewCount === 1 ? '' : 's'}
          </span>
        )}
        {user && !ownReview && !writing && reviews.isSuccess && (
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => setWriting(true)}>
            <Pencil /> Write a review
          </Button>
        )}
        {!user && (
          <Link
            to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
            className="ml-auto text-sm underline-offset-4 hover:underline"
          >
            Log in to write a review
          </Link>
        )}
      </div>

      {writing && <ReviewForm hotelId={hotelId} review={null} onDone={() => setWriting(false)} />}

      {reviews.isPending && <Skeleton className="h-24 w-full" />}
      {reviews.isError && <p className="text-sm text-muted-foreground">Couldn't load reviews.</p>}
      {reviews.isSuccess && items.length === 0 && !writing && (
        <p className="text-sm text-muted-foreground">No reviews yet.</p>
      )}

      <ul className="grid gap-3 md:grid-cols-2">
        {items.map((review) => {
          const isAuthor = user?.id === review.userId
          const canDelete = isAuthor || user?.role === 'Admin'
          if (editingId === review.id) {
            return (
              <li key={review.id}>
                <ReviewForm hotelId={hotelId} review={review} onDone={() => setEditingId(null)} />
              </li>
            )
          }
          return (
            <li key={review.id} className="rounded-xl border p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  {review.reviewerName}
                  {isAuthor && <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>}
                </span>
                <StarRating value={review.rating} />
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDateTime(review.createdAt)}
                {review.modifiedAt && ' · edited'}
              </div>
              {/* User-generated text: rendered as plain text, never HTML. */}
              {review.comment && <p className="mt-2 text-sm whitespace-pre-line">{review.comment}</p>}
              {(isAuthor || canDelete) && (
                <div className="mt-2 flex gap-1">
                  {isAuthor && (
                    <Button variant="ghost" size="xs" onClick={() => setEditingId(review.id)}>
                      <Pencil /> Edit
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleting(review)}
                    >
                      <Trash2 /> Delete
                    </Button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {reviews.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => void reviews.fetchNextPage()}
          disabled={reviews.isFetchingNextPage}
        >
          {reviews.isFetchingNextPage ? 'Loading…' : 'Load more reviews'}
        </Button>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this review?"
        description={
          deleting && user?.id !== deleting.userId
            ? `This removes ${deleting.reviewerName}'s review permanently.`
            : 'This removes your review permanently.'
        }
        confirmLabel="Delete review"
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </section>
  )
}
