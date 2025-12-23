type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const priority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}
const envLogLevel = import.meta.env.VITE_OC_WEB_LOG_LEVEL as LogLevel | undefined
const modeLogLevel: LogLevel = import.meta.env.PROD ? 'warn' : 'debug'
const currentLogLevel: LogLevel =
  envLogLevel && priority[envLogLevel] !== undefined ? envLogLevel : modeLogLevel

export const logger = {
  get level(): LogLevel {
    return currentLogLevel
  },
  isEnabled(level: LogLevel): boolean {
    return priority[level] >= priority[currentLogLevel]
  },
  debug: (...args: unknown[]) => {
    if (logger.isEnabled('debug')) console.debug('☁️', ...args)
  },
  info: (...args: unknown[]) => {
    if (logger.isEnabled('info')) console.info('☁️', ...args)
  },
  warn: (...args: unknown[]) => {
    if (logger.isEnabled('warn')) console.warn('☁️', ...args)
  },
  error: (...args: unknown[]) => {
    if (logger.isEnabled('error')) console.error('☁️', ...args)
  }
}
