import { useInfiniteQuery } from '@tanstack/react-query'

import { queryKeys } from '@/api/queryKeys'
import { reviewsApi } from '@/api/reviews'
import { StarRating } from '@/components/StarRating'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/dates'

export function Reviews({
  hotelId,
  averageRating,
  reviewCount,
}: {
  hotelId: number
  averageRating: number
  reviewCount: number
}) {
  const reviews = useInfiniteQuery({
    queryKey: queryKeys.reviews.byHotel(hotelId),
    queryFn: ({ pageParam }) => reviewsApi.byHotel(hotelId, { pageNumber: pageParam, pageSize: 10 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.pageNumber + 1 : undefined),
  })
  const items = reviews.data?.pages.flatMap((p) => p.items) ?? []

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
      </div>

      {reviews.isPending && <Skeleton className="h-24 w-full" />}
      {reviews.isError && <p className="text-sm text-muted-foreground">Couldn't load reviews.</p>}
      {reviews.isSuccess && items.length === 0 && (
        <p className="text-sm text-muted-foreground">No reviews yet.</p>
      )}

      <ul className="grid gap-3 md:grid-cols-2">
        {items.map((review) => (
          <li key={review.id} className="rounded-xl border p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{review.reviewerName}</span>
              <StarRating value={review.rating} />
            </div>
            <div className="text-xs text-muted-foreground">{formatDateTime(review.createdAt)}</div>
            {/* User-generated text: rendered as plain text, never HTML. */}
            {review.comment && <p className="mt-2 text-sm whitespace-pre-line">{review.comment}</p>}
          </li>
        ))}
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
    </section>
  )
}
