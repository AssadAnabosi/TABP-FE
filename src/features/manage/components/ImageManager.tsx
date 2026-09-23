import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { ImagePlus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { isApiError } from '@/api/errors'
import type { ImageDto } from '@/api/types'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { HotelImage } from '@/components/HotelImage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { isHttpUrl } from '@/lib/urls'

const MAX_URL = 2000

interface ImageManagerProps {
  /** Used as the id prefix for inputs and in alt text, e.g. "hotel" or "room". */
  kind: string
  /** Name shown in alt text, e.g. the hotel name or "Room 101". */
  subject: string
  queryKey: QueryKey
  list: () => Promise<ImageDto[]>
  add: (url: string) => Promise<unknown>
  remove: (imageId: number) => Promise<unknown>
  /** Other caches showing these images (e.g. the public hotel page). */
  alsoInvalidate?: QueryKey[]
}

/**
 * Gallery editor: list (in display order), add by URL (the API has no file upload, kickoff §9 G23)
 * and remove. Shared by hotels and rooms.
 */
export function ImageManager({
  kind,
  subject,
  queryKey,
  list,
  add,
  remove,
  alsoInvalidate = [],
}: ImageManagerProps) {
  const queryClient = useQueryClient()
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<ImageDto | null>(null)
  const trimmed = url.trim()
  const inputId = `${kind}-image-url`

  const images = useQuery({ queryKey, queryFn: list })
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey })
    for (const key of alsoInvalidate) void queryClient.invalidateQueries({ queryKey: key })
  }

  const addImage = useMutation({
    mutationFn: (value: string) => add(value),
    meta: { skipGlobalErrorToast: true },
    onSuccess: () => {
      toast.success('Image added.')
      setUrl('')
      refresh()
    },
    onError: (e) =>
      setError(isApiError(e) ? (e.fieldErrors.url ?? e.userMessage) : 'Could not add the image.'),
  })
  const removeImage = useMutation({
    mutationFn: (image: ImageDto) => remove(image.id),
    onSuccess: () => {
      toast.success('Image removed.')
      setRemoving(null)
      refresh()
    },
    onError: () => {
      setRemoving(null)
      refresh() // e.g. 404 when it was already removed elsewhere
    },
  })

  return (
    <div className="space-y-4">
      <form
        noValidate
        className="grid gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!isHttpUrl(trimmed)) return setError('Enter a full http(s) image URL.')
          if (trimmed.length > MAX_URL) return setError(`Keep the URL under ${MAX_URL} characters.`)
          setError(null)
          addImage.mutate(trimmed)
        }}
      >
        <Label htmlFor={inputId}>Add an image by URL</Label>
        <div className="flex gap-2">
          <Input
            id={inputId}
            type="url"
            inputMode="url"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${inputId}-error` : undefined}
          />
          <Button type="submit" disabled={addImage.isPending || !trimmed}>
            <ImagePlus /> {addImage.isPending ? 'Adding…' : 'Add'}
          </Button>
        </div>
        {error && (
          <p id={`${inputId}-error`} role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        {isHttpUrl(trimmed) && (
          <HotelImage
            key={trimmed}
            src={trimmed}
            alt="New image preview"
            className="aspect-video w-full rounded-lg"
          />
        )}
      </form>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Current images{images.data ? ` (${images.data.length})` : ''}</h3>
        {images.isPending && <Skeleton className="h-24 w-full" />}
        {images.isError && <p className="text-sm text-muted-foreground">Couldn't load images.</p>}
        {images.data?.length === 0 && <p className="text-sm text-muted-foreground">No images yet.</p>}
        {images.data && images.data.length > 0 && (
          <ul className="grid grid-cols-3 gap-2">
            {images.data.map((image, i) => (
              <li key={image.id} className="group relative">
                <HotelImage
                  src={image.url}
                  alt={`${subject} photo ${i + 1}`}
                  className="aspect-square w-full rounded-md"
                />
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                    Cover
                  </span>
                )}
                <Button
                  variant="destructive"
                  size="icon-xs"
                  className="absolute top-1 right-1 bg-background/90 opacity-90"
                  aria-label={`Remove ${subject} photo ${i + 1}`}
                  onClick={() => setRemoving(image)}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">The first image is used as the thumbnail.</p>
      </div>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Remove this image?"
        description={
          removing ? (
            <span className="grid gap-2">
              <HotelImage src={removing.url} alt="" className="aspect-video w-full rounded-md" />
              It will no longer appear in the {kind}'s gallery.
            </span>
          ) : null
        }
        confirmLabel="Remove image"
        destructive
        pending={removeImage.isPending}
        onConfirm={() => removing && removeImage.mutate(removing)}
      />
    </div>
  )
}
