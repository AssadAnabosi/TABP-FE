const formatters = new Map<string, Intl.NumberFormat>()

/** Formats an amount in the DTO's ISO-4217 currency using the browser locale (kickoff Q19). */
export function formatMoney(amount: number, currency: string): string {
  let formatter = formatters.get(currency)
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency })
    } catch {
      // Unknown currency code: fall back to a plain number + code.
      return `${amount.toFixed(2)} ${currency}`
    }
    formatters.set(currency, formatter)
  }
  return formatter.format(amount)
}

/** Sums amounts grouped by currency, e.g. for a cart subtotal. */
export function totalsByCurrency<T>(
  items: T[],
  amount: (item: T) => number,
  currency: (item: T) => string,
): Array<{ currency: string; total: number }> {
  const totals = new Map<string, number>()
  for (const item of items) totals.set(currency(item), (totals.get(currency(item)) ?? 0) + amount(item))
  return [...totals].map(([code, total]) => ({ currency: code, total }))
}

export function discountPercent(original: number, discounted: number): number {
  if (original <= 0 || discounted >= original) return 0
  return Math.round(((original - discounted) / original) * 100)
}
