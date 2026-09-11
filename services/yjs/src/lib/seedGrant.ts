/**
 * Stateless protocol for seeding an empty room: exactly one connection per
 * room is allowed to write the initial body.
 *
 * The payload strings have to match the `SEED_*` constants in the client's
 * `useYjsSession.ts`, keep the two in sync.
 */
export const SeedMessage = {
  Request: '_oc_seed_request',
  Granted: '_oc_seed_granted',
  Denied: '_oc_seed_denied'
} as const

/**
 * Which connection currently holds the right to seed each room. In memory on
 * purpose: the question is only ever about connections that are live right
 * now, so the answer has to die with the room.
 *
 * A grant lasts as long as the holder's socket. A writer that is granted but
 * never seeds blocks the room until it disconnects.
 */
export function createSeedRegistry() {
  const holders = new Map<string, string>()

  /** Answer a seed request. Read-only connections are refused, no write permissions. */
  function request(documentName: string, socketId: string, readOnly: boolean): boolean {
    if (readOnly) {
      return false
    }
    const holder = holders.get(documentName)
    if (holder !== undefined && holder !== socketId) {
      return false
    }
    holders.set(documentName, socketId)
    return true
  }

  /** Hand the grant to a connection that did not ask, see `release`. */
  function grantTo(documentName: string, socketId: string): void {
    holders.set(documentName, socketId)
  }

  /**
   * Give up a leaving connection's grant. True when the leaver held it, which
   * means the grant has to move on: a client that took it and left without
   * seeding would otherwise leave the room empty for everyone.
   *
   * Passing the grant to a room that already has content is harmless, because
   * the client checks its own document before using a grant.
   */
  function release(documentName: string, socketId: string): boolean {
    if (holders.get(documentName) !== socketId) {
      return false
    }
    holders.delete(documentName)
    return true
  }

  /** Forget a room that no longer exists. */
  function forget(documentName: string): void {
    holders.delete(documentName)
  }

  return { request, grantTo, release, forget }
}

export type SeedRegistry = ReturnType<typeof createSeedRegistry>
