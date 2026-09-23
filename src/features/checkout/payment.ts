// Mock payment (kickoff §8.6, §9 G13). Raw card data never leaves the browser: we validate it locally,
// then derive an opaque token. The backend's MockPaymentGateway accepts any non-empty token.
import { z } from 'zod'

export function luhnValid(digits: string): boolean {
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48
    if (double) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    double = !double
  }
  return digits.length > 0 && sum % 10 === 0
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/** "4242424242424242" -> "4242 4242 4242 4242" */
export function formatCardNumber(value: string): string {
  return onlyDigits(value)
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
}

/** "1228" -> "12/28" */
export function formatExpiry(value: string): string {
  const digits = onlyDigits(value).slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}

export function expiryInFuture(value: string, now = new Date()): boolean {
  const match = /^(\d{2})\/(\d{2})$/.exec(value)
  if (!match) return false
  const month = Number(match[1])
  const year = 2000 + Number(match[2])
  if (month < 1 || month > 12) return false
  // Valid through the last day of the expiry month.
  return new Date(year, month, 1) > now
}

export const cardSchema = z.object({
  cardNumber: z
    .string()
    .transform(onlyDigits)
    .refine((v) => v.length >= 12 && v.length <= 19, 'Enter a valid card number.')
    .refine(luhnValid, 'This card number looks wrong.'),
  nameOnCard: z.string().trim().min(2, 'Enter the name on the card.').max(100),
  expiry: z
    .string()
    .refine((v) => /^\d{2}\/\d{2}$/.test(v), 'Use MM/YY.')
    .refine((v) => expiryInFuture(v), 'This card has expired.'),
  cvc: z.string().regex(/^\d{3,4}$/, '3 or 4 digits.'),
})
export type CardInput = z.input<typeof cardSchema>
export type CardValues = z.output<typeof cardSchema>

/** The only payment value sent to the API. */
export function mockCardToken(card: Pick<CardValues, 'cardNumber'>): string {
  return `tok_mock_${card.cardNumber.slice(-4)}`
}

export const TEST_CARD = {
  cardNumber: '4242 4242 4242 4242',
  nameOnCard: 'Demo Guest',
  expiry: '12/30',
  cvc: '123',
}
