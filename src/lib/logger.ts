// Minimal logging abstraction (kickoff §13.2): console in dev, a pluggable sink in prod.
// Never pass tokens or card data to it.

type Level = 'debug' | 'info' | 'warn' | 'error'
type Sink = (level: Level, message: string, context?: Record<string, unknown>) => void

const consoleSink: Sink = (level, message, context) => {
  const fn = level === 'debug' ? console.debug : console[level]
  if (context) fn(`[tabp] ${message}`, context)
  else fn(`[tabp] ${message}`)
}

const noopSink: Sink = () => {}

let sink: Sink = import.meta.env.DEV ? consoleSink : noopSink

/** Swap the sink in production (e.g. to ship errors to a monitoring service). */
export function setLogSink(next: Sink) {
  sink = next
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => sink('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => sink('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => sink('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => sink('error', message, context),
}
