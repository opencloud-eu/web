/**
 * Stateless message that tells a connection who the server thinks it is.
 * Peers get this identity stamped into every awareness update, but Yjs never
 * echoes a client's own awareness back, so without this message a client
 * would never learn its own name and color.
 *
 * The prefix has to match `IDENTITY_MESSAGE_PREFIX` in the client.
 */
export const IDENTITY_MESSAGE_PREFIX = '_oc_identity:'

export type IdentityUser = {
  id: string
  displayName: string
  color: string
}

/** Same shape as the `user` awareness field `beforeHandleAwareness` stamps. */
export function encodeIdentityMessage(user: IdentityUser): string {
  return (
    IDENTITY_MESSAGE_PREFIX +
    JSON.stringify({ id: user.id, name: user.displayName, color: user.color })
  )
}
