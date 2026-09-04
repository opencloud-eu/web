import { DeniedReason, refuse } from './errors.ts'

/** The subset of the Graph `/me` response this service relies on. */
export type GraphUser = {
  id?: string
  displayName?: string
  userPrincipalName?: string
  mail?: string
}

export type FileAccess = {
  canWrite: boolean
}

/**
 * A room name is `<prefix>::<storageid>$<spaceid>!<opaqueid>:<webVersion>` -
 * a few hundred characters at the very most. Anything longer is not a file we
 * could serve, so refuse it before it becomes a Graph URL.
 */
export const MAX_DOCUMENT_NAME_LENGTH = 512

/**
 * Bounds each Graph call so a stalled OpenCloud cannot keep WebSocket
 * handshakes hanging in `onAuthenticate` indefinitely.
 */
export const GRAPH_TIMEOUT_MS = 10_000

/**
 * The one action that means "may overwrite this file's content": it maps to
 * CS3's `InitiateFileUpload`, the same grant WebDAV writes go through.
 */
export const WRITE_ACTION = 'libre.graph/driveItem/upload/create'

/**
 * Splits OC's canonical composite id `<storageid>$<spaceid>!<opaqueid>` into
 * the (driveId, itemId) pair the Graph endpoint expects: driveID =
 * `<storageid>$<spaceid>`, itemID = the FULL composite.
 *
 * The wrapper namespaces room names by app id to avoid schema collisions
 * between different editors opening the same file. Strip any `<scope>::`
 * prefix and optional `:<webVersion>` suffix before parsing so the Graph
 * probe targets the raw file id.
 */
export function parseDocumentId(documentName: string): { driveId: string; itemId: string } {
  const scopeSep = documentName.indexOf('::')
  const scopedFileId = scopeSep >= 0 ? documentName.slice(scopeSep + 2) : documentName
  const versionSep = scopedFileId.lastIndexOf(':')
  const fileId = versionSep >= 0 ? scopedFileId.slice(0, versionSep) : scopedFileId
  const sep = fileId.indexOf('!')
  if (sep <= 0 || sep === fileId.length - 1) {
    throw refuse(
      DeniedReason.MalformedDocument,
      `documentName=${JSON.stringify(documentName)} is not a file id`
    )
  }
  return { driveId: fileId.slice(0, sep), itemId: fileId }
}

export async function validateTokenAgainstOpenCloud(
  opencloudUrl: string,
  token: string
): Promise<GraphUser> {
  const res = await fetch(`${opencloudUrl}/graph/v1.0/me`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(GRAPH_TIMEOUT_MS)
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    const reason = res.status === 401 ? DeniedReason.TokenInvalid : DeniedReason.ServerError
    throw refuse(reason, `graph /me returned ${res.status}: ${detail.slice(0, 200)}`)
  }
  return res.json() as Promise<GraphUser>
}

/**
 * Probes OC's Graph API for the user's effective access to the file. Returns
 * `{ canWrite }`, or refuses with a `reason`.
 *
 * The permissions endpoint reports the effective action set and 404s for a
 * file the user cannot see, which is what makes it the authorization gate.
 */
export async function probeFileAccess(
  opencloudUrl: string,
  token: string,
  documentName: string
): Promise<FileAccess> {
  const { driveId, itemId } = parseDocumentId(documentName)
  const permsUrl =
    `${opencloudUrl}/graph/v1beta1/drives/${encodeURIComponent(driveId)}` +
    `/items/${encodeURIComponent(itemId)}/permissions` +
    `?$select=${encodeURIComponent('@libre.graph.permissions.actions.allowedValues')}`

  const res = await fetch(permsUrl, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(GRAPH_TIMEOUT_MS)
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    let reason: DeniedReason
    switch (res.status) {
      case 401:
        reason = DeniedReason.TokenInvalid
        break
      case 403:
      case 404:
        reason = DeniedReason.AccessDenied
        break
      default:
        reason = DeniedReason.ServerError
    }
    throw refuse(
      reason,
      `graph permissions returned ${res.status} for document=` +
        `${JSON.stringify(documentName)}: ${detail.slice(0, 200)}`
    )
  }

  const body = (await res.json()) as Record<string, unknown>
  const actions = body['@libre.graph.permissions.actions.allowedValues']
  const allowed = Array.isArray(actions) ? (actions as string[]) : []

  return { canWrite: allowed.includes(WRITE_ACTION) }
}
