import { queryKeys } from '@/api/queryKeys'
import { roomsApi } from '@/api/rooms'
import type { RoomDto } from '@/api/types'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatMoney } from '@/lib/money'

import { ImageManager } from '../components/ImageManager'
import { AvailabilityPanel } from './AvailabilityPanel'
import { DiscountsPanel } from './DiscountsPanel'
import { RoomForm } from './RoomForm'
import { displayRoomNumber } from './roomNumber'

interface RoomSheetProps {
  room: RoomDto | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Manage an existing room: capacities, images, discounts and blocked dates. */
export function RoomSheet({ room, open, onOpenChange }: RoomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {room && (
          <>
            <SheetHeader>
              <SheetTitle>Room {displayRoomNumber(room.number)}</SheetTitle>
              <SheetDescription>
                {room.roomType} · {formatMoney(room.basePrice, room.currency)} / night base price
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-6">
              <Tabs defaultValue="details">
                <TabsList className="w-full">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="images">Images</TabsTrigger>
                  <TabsTrigger value="discounts">Discounts</TabsTrigger>
                  <TabsTrigger value="availability">Blocked dates</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="pt-2">
                  <RoomForm hotelId={room.hotelId} room={room} onDone={() => onOpenChange(false)} />
                </TabsContent>
                <TabsContent value="images" className="pt-2">
                  <ImageManager
                    kind="room"
                    subject={`Room ${displayRoomNumber(room.number)}`}
                    queryKey={queryKeys.rooms.images(room.id)}
                    list={() => roomsApi.images(room.id)}
                    add={(url) => roomsApi.addImage(room.id, url)}
                    remove={(imageId) => roomsApi.removeImage(room.id, imageId)}
                    // Room photos show on the public hotel page.
                    alsoInvalidate={[queryKeys.hotels.all]}
                  />
                </TabsContent>
                <TabsContent value="discounts" className="pt-2">
                  <DiscountsPanel room={room} />
                </TabsContent>
                <TabsContent value="availability" className="pt-2">
                  <AvailabilityPanel room={room} />
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
