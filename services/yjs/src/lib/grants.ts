/**
 * Stateless protocol for room-wide jobs that exactly one connection may do:
 * seeding an empty room (`seed`) and rewriting a stale one from the file body
 * behind an etag (`recover:<etag>`). Each payload is a prefix plus the key.
 *
 * The prefixes have to match the `GRANT_*` constants in the client's
 * `useYjsSession.ts`, keep the two in sync.
 */
export const GrantMessage = {
  Request: '_oc_grant_request:',
  Granted: '_oc_grant_granted:',
  Denied: '_oc_grant_denied:'
} as const

export const SEED_GRANT = 'seed'
const RECOVER_PREFIX = 'recover:'

/** Generous for `recover:<etag>`, but bounds what a client can make us store. */
const MAX_GRANT_KEY_LENGTH = 256

/** The key a grant request asks for, or null for any other payload. */
export function parseGrantRequest(payload: string): string | null {
  if (!payload.startsWith(GrantMessage.Request)) {
    return null
  }
  const key = payload.slice(GrantMessage.Request.length)
  if (
    (key !== SEED_GRANT && !key.startsWith(RECOVER_PREFIX)) ||
    key.length > MAX_GRANT_KEY_LENGTH
  ) {
    return null
  }
  return key
}

/**
 * Which connection holds which grant in each room. In memory on purpose: the
 * question is only ever about connections that are live right now, so the
 * answer has to die with the room.
 *
 * A grant lasts as long as the holder's socket. A writer that is granted but
 * never does the job blocks it until it disconnects.
 */
export function createGrantRegistry() {
  const rooms = new Map<string, Map<string, string>>()

  /** Answer a grant request. Read-only connections are refused, no write permissions. */
  function request(documentName: string, key: string, socketId: string, readOnly: boolean) {
    if (readOnly) {
      return false
    }
    const holders = rooms.get(documentName)
    const holder = holders?.get(key)
    if (holder !== undefined && holder !== socketId) {
      return false
    }
    // A newer recovery supersedes the older one, so a writer holds at most one.
    if (holders && key.startsWith(RECOVER_PREFIX)) {
      for (const [held, heldBy] of holders) {
        if (heldBy === socketId && held.startsWith(RECOVER_PREFIX)) {
          holders.delete(held)
        }
      }
    }
    grantTo(documentName, key, socketId)
    return true
  }

  /** Hand a grant to a connection that did not ask, see `release`. */
  function grantTo(documentName: string, key: string, socketId: string): void {
    const holders = rooms.get(documentName) ?? new Map<string, string>()
    holders.set(key, socketId)
    rooms.set(documentName, holders)
  }

  /**
   * Give up a leaving connection's grants and return their keys, so the
   * caller can move on what must not die with the leaver.
   */
  function release(documentName: string, socketId: string): string[] {
    const holders = rooms.get(documentName)
    if (!holders) {
      return []
    }
    const released = [...holders].filter(([, holder]) => holder === socketId).map(([key]) => key)
    for (const key of released) {
      holders.delete(key)
    }
    if (!holders.size) {
      rooms.delete(documentName)
    }
    return released
  }

  /** Forget a room that no longer exists. */
  function forget(documentName: string): void {
    rooms.delete(documentName)
  }

  return { request, grantTo, release, forget }
}
