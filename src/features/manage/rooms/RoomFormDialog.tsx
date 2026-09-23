import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import { RoomForm } from './RoomForm'

interface RoomFormDialogProps {
  hotelId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Create a room. Existing rooms are managed in the RoomSheet. */
export function RoomFormDialog({ hotelId, open, onOpenChange }: RoomFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New room</DialogTitle>
          <DialogDescription>Add a room to this hotel.</DialogDescription>
        </DialogHeader>
        <RoomForm hotelId={hotelId} room={null} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
