/** Reads an env var as a positive integer, or the fallback if it is unset. */
export function parsePositiveInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw === '') {
    return fallback
  }

  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`invalid ${name}=${JSON.stringify(raw)}, expected a positive integer`)
  }
  return value
}
