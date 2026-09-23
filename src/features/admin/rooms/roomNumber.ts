// Soft-deleted rooms keep a mangled number "<number>::deleted::<guid>" (kickoff §8.9.5).
const DELETED_MARKER = '::deleted::'

export function isSoftDeleted(number: string): boolean {
  return number.includes(DELETED_MARKER)
}

export function displayRoomNumber(number: string): string {
  const index = number.indexOf(DELETED_MARKER)
  return index === -1 ? number : number.slice(0, index)
}
