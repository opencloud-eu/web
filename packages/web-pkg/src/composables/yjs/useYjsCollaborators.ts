import { onScopeDispose, shallowRef } from 'vue'
import type { Ref } from 'vue'
import type { Awareness } from 'y-protocols/awareness'

/** The `user` awareness field. The Yjs server stamps it on every peer state. */
export interface YjsAwarenessUser {
  id: string
  name: string
  /** Hex color, shared by the remote cursor and the avatar in the toolbar. */
  color: string
}

export interface YjsCollaborator extends YjsAwarenessUser {
  isSelf: boolean
}

/**
 * Prefix of the stateless message the Yjs server sends a connection with its
 * own identity. Mirrors `IDENTITY_MESSAGE_PREFIX` in
 * `services/yjs/src/lib/identity.ts`, keep the two in sync.
 */
export const IDENTITY_MESSAGE_PREFIX = '_oc_identity:'

/** Fallback when a state carries no color. Same as the remote cursor default. */
const DEFAULT_COLOR = '#ffa500'

/** Parses a server identity message. Null for any other stateless payload. */
export function decodeIdentityMessage(payload: string): YjsAwarenessUser | null {
  if (!payload.startsWith(IDENTITY_MESSAGE_PREFIX)) return null
  try {
    const user: unknown = JSON.parse(payload.slice(IDENTITY_MESSAGE_PREFIX.length))
    if (!isAwarenessUser(user)) return null
    return normalizeUser(user)
  } catch {
    return null
  }
}

function isAwarenessUser(value: unknown): value is YjsAwarenessUser {
  if (!value || typeof value !== 'object') return false
  const user = value as Partial<YjsAwarenessUser>
  return typeof user.id === 'string' && user.id !== ''
}

function normalizeUser(user: YjsAwarenessUser): YjsAwarenessUser {
  return {
    id: user.id,
    name: typeof user.name === 'string' ? user.name : '',
    color: typeof user.color === 'string' ? user.color : DEFAULT_COLOR
  }
}

/** One entry per user, so a user with several tabs open appears once. */
function readCollaborators(awareness: Awareness): YjsCollaborator[] {
  const byId = new Map<string, YjsCollaborator>()
  for (const [clientId, state] of awareness.getStates() as Map<number, Record<string, unknown>>) {
    const user = state?.user
    if (!isAwarenessUser(user)) continue
    const isSelf = clientId === awareness.clientID
    const existing = byId.get(user.id)
    if (existing) {
      if (isSelf) existing.isSelf = true
      continue
    }
    byId.set(user.id, { ...normalizeUser(user), isSelf })
  }
  return Array.from(byId.values()).sort((a, b) => {
    if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

function signatureOf(collaborators: YjsCollaborator[]): string {
  return collaborators.map((u) => `${u.id}|${u.name}|${u.color}|${u.isSelf}`).join('\n')
}

/**
 * The people in the room, derived from the awareness states. The own user
 * comes first, peers follow sorted by name. Bound to the awareness passed at
 * setup time, like the cursor extension, and detached when the scope ends.
 */
export function useYjsCollaborators(awareness?: Awareness | null): Ref<YjsCollaborator[]> {
  const collaborators = shallowRef<YjsCollaborator[]>([])
  if (!awareness) return collaborators

  const aw = awareness
  let signature = ''

  function update() {
    const next = readCollaborators(aw)
    const nextSignature = signatureOf(next)
    // Awareness fires on every cursor move. Only publish when the people change.
    if (nextSignature === signature) return
    signature = nextSignature
    collaborators.value = next
  }

  aw.on('change', update)
  update()
  onScopeDispose(() => aw.off('change', update), true)

  return collaborators
}
