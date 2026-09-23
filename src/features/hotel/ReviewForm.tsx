import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { isApiError } from '@/api/errors'
import { queryKeys } from '@/api/queryKeys'
import { reviewsApi } from '@/api/reviews'
import type { ReviewDto } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const MAX_COMMENT = 2000

/** 1–5 star picker; arrow keys work because it's a native radio group. */
function StarInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div role="radiogroup" aria-label="Rating" className="flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
          <input
            type="radio"
            name="review-rating"
            value={n}
            checked={value === n}
            onChange={() => onChange(n)}
            className="peer sr-only"
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
          />
          <Star
            aria-hidden
            className={cn(
              'size-7 rounded-sm transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring',
              n <= shown ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40',
            )}
          />
        </label>
      ))}
    </div>
  )
}

interface ReviewFormProps {
  hotelId: number
  /** null = write a new review. */
  review: ReviewDto | null
  onDone: () => void
}

/**
 * Write or edit a review. The server decides eligibility (a checked-out stay, one review per hotel)
 * and its 400 message is shown as-is.
 */
export function ReviewForm({ hotelId, review, onDone }: ReviewFormProps) {
  const queryClient = useQueryClient()
  const [rating, setRating] = useState(review?.rating ?? 0)
  const [comment, setComment] = useState(review?.comment ?? '')
  const [error, setError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: () => {
      const body = { rating, comment: comment.trim() || null }
      return review ? reviewsApi.update(review.id, body) : reviewsApi.create(hotelId, body)
    },
    meta: { skipGlobalErrorToast: true },
    onSuccess: () => {
      toast.success(review ? 'Review updated.' : 'Thanks for your review!')
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.byHotel(hotelId) })
      // The hotel's average rating and review count changed.
      void queryClient.invalidateQueries({ queryKey: queryKeys.hotels.all })
      onDone()
    },
    onError: (e) => {
      if (!isApiError(e)) return setError('Could not save your review.')
      setError(e.fieldErrors.hotelId ?? e.fieldErrors.rating ?? e.fieldErrors.comment ?? e.userMessage)
    },
  })

  return (
    <form
      noValidate
      className="grid gap-3 rounded-xl border p-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (rating < 1) return setError('Pick a rating from 1 to 5 stars.')
        if (comment.trim().length > MAX_COMMENT) return setError(`Keep it under ${MAX_COMMENT} characters.`)
        setError(null)
        save.mutate()
      }}
    >
      <h3 className="font-medium">{review ? 'Edit your review' : 'Write a review'}</h3>
      <StarInput value={rating} onChange={setRating} />
      <div className="grid gap-1.5">
        <Label htmlFor="review-comment">Comment (optional)</Label>
        <Textarea
          id="review-comment"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What did you like? What could be better?"
        />
        <span className="text-right text-xs text-muted-foreground tabular-nums">
          {comment.trim().length}/{MAX_COMMENT}
        </span>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : review ? 'Save review' : 'Post review'}
        </Button>
      </div>
    </form>
  )
}
