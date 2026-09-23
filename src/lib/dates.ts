// Date helpers. The API's DateOnly fields are "YYYY-MM-DD" built from the user's *local* calendar date
// (never toISOString(), which shifts the day by timezone). DateTime fields are UTC (kickoff §4.1).
import { addDays, differenceInCalendarDays, isValid, parse } from 'date-fns'

import type { IsoDate, IsoDateTime } from '@/api/types'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Formats a Date as a local-calendar "YYYY-MM-DD". */
export function toIsoDate(date: Date): IsoDate {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Parses "YYYY-MM-DD" to local midnight. Returns null for anything malformed. */
export function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value || !ISO_DATE.test(value)) return null
  const date = parse(value, 'yyyy-MM-dd', new Date())
  return isValid(date) ? date : null
}

export function todayIso(): IsoDate {
  return toIsoDate(new Date())
}

export function addDaysIso(value: IsoDate, days: number): IsoDate {
  const date = parseIsoDate(value) ?? new Date()
  return toIsoDate(addDays(date, days))
}

/** Default stay: today → tomorrow (brief 2.1). */
export function defaultStay(): { checkIn: IsoDate; checkOut: IsoDate } {
  const checkIn = todayIso()
  return { checkIn, checkOut: addDaysIso(checkIn, 1) }
}

export function nightsBetween(checkIn: IsoDate, checkOut: IsoDate): number {
  const a = parseIsoDate(checkIn)
  const b = parseIsoDate(checkOut)
  if (!a || !b) return 0
  return Math.max(0, differenceInCalendarDays(b, a))
}

export function isPastIsoDate(value: IsoDate): boolean {
  return value < todayIso()
}

/** The API serializes UTC DateTimes without a "Z"; treat offset-less timestamps as UTC. */
export function parseApiDateTime(value: IsoDateTime): Date {
  const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/i.test(value)
  return new Date(hasOffset ? value : `${value}Z`)
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function formatIsoDate(value: IsoDate): string {
  const date = parseIsoDate(value)
  return date ? dateFormatter.format(date) : value
}

export function formatDateTime(value: IsoDateTime | null | undefined): string {
  if (!value) return '—'
  const date = parseApiDateTime(value)
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date)
}
