/**
 * Machine-readable codes for a refused handshake. Hocuspocus relays
 * `error.reason` to the client's `onAuthenticationFailed` and substitutes
 * "permission-denied" for a plain Error.
 */
export const DeniedReason = {
  /** The token was rejected. A renewed one may well be accepted. */
  TokenInvalid: 'token-invalid',
  /** The user does not have this file, or it does not exist. */
  AccessDenied: 'access-denied',
  /** The room name does not resolve to a file id. */
  MalformedDocument: 'malformed-document',
  /** The probe itself failed: OpenCloud unreachable, 5xx, unusable body. */
  ServerError: 'server-error'
} as const

export type DeniedReason = (typeof DeniedReason)[keyof typeof DeniedReason]

/** An Error carrying the `reason` code Hocuspocus relays to the client. */
export function refuse(reason: DeniedReason, detail: string): Error {
  return Object.assign(new Error(`${reason}: ${detail}`), { reason })
}

/** True for an error that already carries a client-facing `reason` code. */
export function isRefusal(e: unknown): e is Error & { reason: DeniedReason } {
  return e instanceof Error && typeof (e as { reason?: unknown }).reason === 'string'
}
