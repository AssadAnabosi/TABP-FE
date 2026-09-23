import { hotelsApi } from '@/api/hotels'
import { queryKeys } from '@/api/queryKeys'
import type { HotelDto } from '@/api/types'

import { ImageManager } from '../components/ImageManager'

/** Hotel gallery, in any approval state (GET /api/hotels/{id}/images). */
export function HotelImagesEditor({ hotel }: { hotel: HotelDto }) {
  return (
    <ImageManager
      kind="hotel"
      subject={hotel.name}
      queryKey={queryKeys.hotels.images(hotel.id)}
      list={() => hotelsApi.images(hotel.id)}
      add={(url) => hotelsApi.addImage(hotel.id, url)}
      remove={(imageId) => hotelsApi.removeImage(hotel.id, imageId)}
      // Thumbnails in search, deals and the public gallery come from these images.
      alsoInvalidate={[queryKeys.hotels.all]}
    />
  )
}
