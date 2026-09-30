/**
 * Stateless protocol for room-wide jobs that exactly one connection may do at
 * a time: seeding an empty room (`seed`) and rewriting a stale one from a file
 * body (`recover:<etag>`). There is one grant per key and room:
 * `recover:<etag>` asks for the room's `recover` grant, the etag says which
 * body the requester would rewrite it with.
 *
 * A payload is a prefix plus the key and its argument. The payloads have to
 * match the `GRANT_*` and `SEED_*` constants in the client's
 * `useYjsSession.ts`, keep the two in sync.
 */
export const GrantMessage = {
  Request: '_oc_grant_request:',
  Granted: '_oc_grant_granted:',
  Denied: '_oc_grant_denied:',
  /** Sent by a holder that gives its grant back without doing the job. */
  Release: '_oc_grant_release:'
} as const

/**
 * @deprecated The seed grant's payloads from before `GrantMessage`, drop once
 * no client sends `SeedMessage.Request` anymore. Until then an unsolicited
 * seed grant uses them too, because every client version understands them.
 */
export const SeedMessage = {
  Request: '_oc_seed_request',
  Granted: '_oc_seed_granted',
  Denied: '_oc_seed_denied'
} as const

export type GrantKey = 'seed' | 'recover'

interface GrantPolicy {
  /** Takes an argument, separated by a colon. */
  hasArg: boolean
  /** Handed to another writer when the holder leaves. */
  passOn: boolean
  /** How long a holder may keep the grant before it is free again. */
  leaseMs?: number
}

export const GRANT_POLICIES: Record<GrantKey, GrantPolicy> = {
  // The holder may leave before seeding, and nobody else is allowed to.
  seed: { hasArg: false, passOn: true },
  // Only the requester holds the body to recover from, so the grant cannot be
  // passed on. The next writer that asks gets it.
  recover: { hasArg: true, passOn: false, leaseMs: 30_000 }
}

/** Generous for an etag, but bounds what a client can make us store. */
const MAX_GRANT_ARG_LENGTH = 256

export interface GrantRequest {
  key: GrantKey
  arg?: string
  /** Asked with `SeedMessage`, so it has to be answered with it. */
  legacy?: boolean
}

function parseGrant(payload: string, prefix: string): GrantRequest | null {
  if (!payload.startsWith(prefix)) {
    return null
  }
  const body = payload.slice(prefix.length)
  const separator = body.indexOf(':')
  const key = separator === -1 ? body : body.slice(0, separator)
  if (!Object.hasOwn(GRANT_POLICIES, key)) {
    return null
  }
  const policy = GRANT_POLICIES[key as GrantKey]
  if (!policy.hasArg) {
    return separator === -1 ? { key: key as GrantKey } : null
  }
  const arg = separator === -1 ? '' : body.slice(separator + 1)
  if (!arg || arg.length > MAX_GRANT_ARG_LENGTH) {
    return null
  }
  return { key: key as GrantKey, arg }
}

/** The grant a request asks for, or null for any other payload. */
export function parseGrantRequest(payload: string): GrantRequest | null {
  if (payload === SeedMessage.Request) {
    return { key: 'seed', legacy: true }
  }
  return parseGrant(payload, GrantMessage.Request)
}

/** The grant a client gives up, or null for any other payload. */
export function parseGrantRelease(payload: string): GrantRequest | null {
  return parseGrant(payload, GrantMessage.Release)
}

/** The payload that answers a grant request. */
export function grantAnswer({ key, arg, legacy }: GrantRequest, granted: boolean): string {
  if (legacy) {
    return granted ? SeedMessage.Granted : SeedMessage.Denied
  }
  const prefix = granted ? GrantMessage.Granted : GrantMessage.Denied
  return prefix + key + (arg === undefined ? '' : `:${arg}`)
}

/** The side of a connection the registry needs. */
export interface GrantClaimant {
  socketId: string
  readOnly: boolean
}

export interface GrantAnswer<C extends GrantClaimant> {
  claimant: C
  request: GrantRequest
  granted: boolean
}

interface Slot<C extends GrantClaimant> {
  holder: C
  request: GrantRequest
  lease?: ReturnType<typeof setTimeout>
}

/**
 * Who holds which grant in each room. In memory on purpose: the question is
 * only ever about connections that are live right now, so the answer has to
 * die with the room.
 *
 * Answers go out through `send`, also a passed on grant nobody asked for.
 */
export function createGrantRegistry<C extends GrantClaimant>(
  send: (answer: GrantAnswer<C>) => void
) {
  const rooms = new Map<string, Map<GrantKey, Slot<C>>>()

  function hold(documentName: string, holder: C, request: GrantRequest) {
    const slots = rooms.get(documentName) ?? new Map<GrantKey, Slot<C>>()
    rooms.set(documentName, slots)
    clearTimeout(slots.get(request.key)?.lease)
    const slot: Slot<C> = { holder, request }
    const { leaseMs } = GRANT_POLICIES[request.key]
    if (leaseMs !== undefined) {
      slot.lease = setTimeout(() => {
        console.warn(
          `[grants] document=${JSON.stringify(documentName)} lease of ${request.key} expired`
        )
        free(documentName, request.key)
      }, leaseMs)
    }
    slots.set(request.key, slot)
  }

  function free(documentName: string, key: GrantKey) {
    const slots = rooms.get(documentName)
    clearTimeout(slots?.get(key)?.lease)
    slots?.delete(key)
    if (slots && !slots.size) {
      rooms.delete(documentName)
    }
  }

  /**
   * Answer a grant request. Read-only connections are refused, no write
   * permissions. The holder asking again is granted: for a new argument, it
   * gave the old job up.
   */
  function request(documentName: string, claimant: C, request: GrantRequest): void {
    const holder = rooms.get(documentName)?.get(request.key)?.holder
    const granted =
      !claimant.readOnly && (holder === undefined || holder.socketId === claimant.socketId)
    if (granted) {
      hold(documentName, claimant, request)
    }
    send({ claimant, request, granted })
  }

  /** The holder gives its grant back. */
  function release(documentName: string, { key, arg }: GrantRequest, socketId: string): void {
    const slot = rooms.get(documentName)?.get(key)
    if (slot?.holder.socketId === socketId && slot.request.arg === arg) {
      free(documentName, key)
    }
  }

  /** The job the grant is held for is done, whoever did it. */
  function settle(documentName: string, { key, arg }: GrantRequest): void {
    if (rooms.get(documentName)?.get(key)?.request.arg === arg) {
      free(documentName, key)
    }
  }

  /** The argument the grant's holder works on, if it is held. */
  function heldArg(documentName: string, key: GrantKey): string | undefined {
    return rooms.get(documentName)?.get(key)?.request.arg
  }

  /**
   * A connection left the room: pass on what it holds, or free it.
   * `remaining` are the connections still in the room.
   */
  function leave(documentName: string, socketId: string, remaining: C[]): void {
    for (const [key, slot] of [...(rooms.get(documentName) ?? [])]) {
      if (slot.holder.socketId !== socketId) {
        continue
      }
      const heir = GRANT_POLICIES[key].passOn
        ? remaining.find((c) => !c.readOnly && c.socketId !== socketId)
        : undefined
      if (!heir) {
        free(documentName, key)
        continue
      }
      // The heir may never have asked, so it gets the payload every client
      // version understands.
      const request = { key, legacy: key === 'seed' }
      hold(documentName, heir, request)
      send({ claimant: heir, request, granted: true })
    }
  }

  /** Forget a room that no longer exists. */
  function forget(documentName: string): void {
    for (const slot of rooms.get(documentName)?.values() ?? []) {
      clearTimeout(slot.lease)
    }
    rooms.delete(documentName)
  }

  return { request, release, settle, heldArg, leave, forget }
}
