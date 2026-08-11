import { Server } from '@hocuspocus/server'

const port = parseInt(process.env.PORT ?? '1234', 10)
const opencloudUrl = (process.env.OPENCLOUD_URL ?? '').replace(/\/$/, '')

if (!opencloudUrl) {
  console.error('OPENCLOUD_URL is required, e.g. https://cloud.example.com')
  process.exit(1)
}

// Dev-only escape hatch for the integration test harness. Refused outright in
// production so a stray env var can never turn into an auth bypass.
const devFakeToken = process.env.DEV_FAKE_TOKEN ?? ''

if (devFakeToken) {
  if (process.env.NODE_ENV !== 'development') {
    console.error('DEV_FAKE_TOKEN requires NODE_ENV=development')
    process.exit(1)
  }
  console.warn('DEV_FAKE_TOKEN is set, authentication can be bypassed. Never do this in production')
}

/** The subset of the Graph `/me` response this service relies on. */
type GraphUser = {
  id?: string
  displayName?: string
  userPrincipalName?: string
  mail?: string
}

type FileAccess = {
  canWrite: boolean
}

// Per-document first-seen app version. Acts as the authoritative gate for
// "everybody in this room must run the same client version". First connect
// for a documentName sets the baseline; subsequent connects with a different
// appVersion are rejected at authenticate-time. In-memory only; on restart
// the next connecter becomes the new baseline (acceptable for a stateless
// yjs server). Empty appVersion is tolerated for legacy/test clients.
const appVersionByDocument = new Map<string, string>()

// A room name is `<prefix>::<storageid>$<spaceid>!<opaqueid>` - a few hundred
// characters at the very most. Anything longer is not a file we could serve, so
// refuse it before it becomes a Graph URL.
const MAX_DOCUMENT_NAME_LENGTH = 512

/**
 * App-version gate: everybody in a room must run the same client version, or
 * two incompatible Y.Doc layouts end up in one document. The first connect for
 * a documentName sets the baseline and later connects with a different version
 * are rejected. An empty client version is tolerated (back-compat for a raw
 * provider in a test harness).
 *
 * MUST run only after the connection is both authenticated and authorized.
 * Recording a baseline any earlier let an unauthenticated caller name any room,
 * claim a version nobody else runs and lock every legitimate client out of that
 * file until the process restarted - the entry is only cleared by
 * `onDisconnect`, which never fires for a rejected connection. The same path
 * grew the map without bound under attacker-chosen keys.
 */
function enforceAppVersion(documentName: string, clientAppVersion: string): void {
  if (!clientAppVersion) return

  const baseline = appVersionByDocument.get(documentName)
  if (!baseline) {
    appVersionByDocument.set(documentName, clientAppVersion)
    return
  }
  if (clientAppVersion !== baseline) {
    throw new Error(
      `app version mismatch for document="${documentName}": ` +
        `client=${clientAppVersion} room=${baseline}, please reload`
    )
  }
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l)
  function channel(n: number): string {
    const k = (n + h / 30) % 12
    const value = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${channel(0)}${channel(8)}${channel(4)}`
}

// Hex, not hsl(): @tiptap/extension-collaboration-caret rejects any other
// format and warns on every awareness update.
function deterministicColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  return hslToHex(Math.abs(hash) % 360, 0.7, 0.5)
}

async function validateTokenAgainstOpenCloud(token: string): Promise<GraphUser> {
  const res = await fetch(`${opencloudUrl}/graph/v1.0/me`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`graph /me returned ${res.status}: ${detail.slice(0, 200)}`)
  }
  return res.json() as Promise<GraphUser>
}

// Awareness field marking a connection as able to seed an empty room. Read by
// the client's hydration election in `useYjsSession`; the name has
// to match `SEED_CAPABLE_KEY` there.
const SEED_CAPABLE_KEY = '_oc_canSeed'

// The one action that means "may overwrite this file's content": it maps to
// CS3's `InitiateFileUpload`, the same grant WebDAV writes go through. Matched
// exactly, because sibling actions like `permissions/create` or
// `children/create` say nothing about writing the file itself.
const WRITE_ACTION = 'libre.graph/driveItem/upload/create'

// Splits OC's canonical composite id `<storageid>$<spaceid>!<opaqueid>` into
// the (driveId, itemId) pair the Graph endpoint expects: driveID =
// `<storageid>$<spaceid>`, itemID = the FULL composite.
//
// The wrapper namespaces room names by app id to avoid schema collisions
// between different editors opening the same file (e.g.
// `text-editor::<composite>` vs `codemirror::<composite>`). Strip any
// `<scope>::` prefix before parsing so the Graph probe targets the raw
// file id.
function parseDocumentId(documentName: string): { driveId: string; itemId: string } {
  const scopeSep = documentName.indexOf('::')
  const fileId = scopeSep >= 0 ? documentName.slice(scopeSep + 2) : documentName
  const sep = fileId.indexOf('!')
  if (sep <= 0 || sep === fileId.length - 1) {
    throw new Error(`malformed documentName="${documentName}"`)
  }
  return { driveId: fileId.slice(0, sep), itemId: fileId }
}

// Probes OC's Graph API for the user's effective access to the file. Returns
// `{ canWrite }` on success; `null` when OC denies access (401/403/404).
//
// The permissions endpoint reports the effective action set (top-level
// `@libre.graph.permissions.actions.allowedValues`, the merged PermissionSet
// that also backs WebDAV's `oc:permissions`) and 404s for a file the user
// cannot see, which is what makes it the authorization gate.
async function probeFileAccess(token: string, documentName: string): Promise<FileAccess | null> {
  const { driveId, itemId } = parseDocumentId(documentName)
  // `$select` on the action set is what keeps this cheap: the endpoint returns
  // right after resolving the effective actions instead of also listing user,
  // OCM and public shares - three gateway round-trips, and three more ways for
  // the probe to fail, that this service has no use for.
  const permsUrl =
    `${opencloudUrl}/graph/v1beta1/drives/${encodeURIComponent(driveId)}` +
    `/items/${encodeURIComponent(itemId)}/permissions` +
    `?$select=${encodeURIComponent('@libre.graph.permissions.actions.allowedValues')}`

  const res = await fetch(permsUrl, { headers: { Authorization: `Bearer ${token}` } })

  if (res.status === 401 || res.status === 403 || res.status === 404) {
    return null
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`graph permissions returned ${res.status}: ${detail.slice(0, 200)}`)
  }

  const body = (await res.json()) as Record<string, unknown>
  const actions = body['@libre.graph.permissions.actions.allowedValues']
  const allowed = Array.isArray(actions) ? (actions as string[]) : []

  return { canWrite: allowed.includes(WRITE_ACTION) }
}

const server = new Server({
  port,
  address: '0.0.0.0',
  // No server-side persistence: every doc is file-backed via WebDAV.
  // Cold-start for a fresh peer = hydrate from `currentContent` in the
  // wrapper. The persisted SQLite snapshot would get discarded on stale-
  // state recovery anyway (etag drift triggers rehydrate); keeping it
  // here is "mostly ceremony" per the migration plan. Stale detection
  // moved to the client (see useYjsSession.onProviderSynced).

  async onAuthenticate({ token, documentName, requestParameters, connectionConfig }) {
    if (!token) {
      throw new Error('missing token')
    }
    if (documentName.length > MAX_DOCUMENT_NAME_LENGTH) {
      throw new Error(`documentName too long (${documentName.length})`)
    }

    const clientAppVersion = requestParameters.get('appVersion') ?? ''

    // Dev shortcut for integration tests: any token matching DEV_FAKE_TOKEN
    // returns a synthetic identity. The ACL check is skipped (tests use random
    // documentNames that don't exist in OC). Disabled when DEV_FAKE_TOKEN is
    // unset.
    if (devFakeToken && token === devFakeToken) {
      const id = 'dev-fake-user'
      // Gated the same way as a real connection, so the two paths cannot drift.
      enforceAppVersion(documentName, clientAppVersion)
      console.log(`[onAuthenticate] dev-fake document="${documentName}"`)
      return {
        user: {
          id,
          displayName: 'Dev Fake User',
          color: deterministicColor(id)
        }
      }
    }

    const me = await validateTokenAgainstOpenCloud(token)
    const id = me.id ?? me.userPrincipalName ?? me.mail ?? 'unknown'

    // Authorization: does this user have the file at all, and may they write it.
    const access = await probeFileAccess(token, documentName)
    if (access === null) {
      throw new Error(`access denied for document="${documentName}"`)
    }

    // Identity and access are settled, so this caller is entitled to influence
    // the room's version baseline.
    enforceAppVersion(documentName, clientAppVersion)

    const readOnly = !access.canWrite

    // Writes are gated on `connectionConfig.readOnly`, which Hocuspocus reads
    // when it builds the Connection. The hook's return value only feeds
    // `context`, so setting it there would leave the connection writable.
    connectionConfig.readOnly = readOnly

    console.log(
      `[onAuthenticate] document="${documentName}" user="${me.displayName ?? id}" ` +
        `id="${id}" readOnly=${readOnly}`
    )
    return {
      readOnly,
      clientAppVersion,
      user: {
        id,
        displayName: me.displayName ?? me.userPrincipalName ?? id,
        color: deterministicColor(id)
      }
    }
  },

  async onConnect({ documentName, requestHeaders }) {
    const origin = requestHeaders.get('origin') ?? '-'
    console.log(`[onConnect] document="${documentName}" origin=${origin}`)
  },

  async onDisconnect({ documentName, clientsCount }) {
    console.log(`[onDisconnect] document="${documentName}" remaining=${clientsCount}`)
    if (clientsCount === 0) {
      // Forget the version baseline once the room empties out so a new
      // deploy can start fresh without manual restart.
      appVersionByDocument.delete(documentName)
    }
  },

  // Anti-spoof identity stamp: before each inbound awareness update is
  // applied, overwrite the `user` field on every state in the update with
  // the authenticated identity from the connection's context.
  //
  // Hocuspocus v4 invokes extension hooks with a single payload object. The
  // positional `(document, states, origin)` signature applies only to the
  // document-level callback the lib wires up internally (see
  // hocuspocus-server.cjs ~line 1299). Using positional args here would
  // silently no-op (states=undefined -> no user found -> return).
  async beforeHandleAwareness({ states, context, connection }) {
    const user = context?.user ?? connection?.context?.user
    if (!user) return
    const canonical = {
      id: user.id,
      name: user.displayName,
      color: user.color
    }
    const readOnly = Boolean(context?.readOnly ?? connection?.context?.readOnly)
    for (const state of states.values()) {
      state.user = canonical
      // Whether this connection may seed an empty room. The client publishes
      // its own guess, but it derives read-only from WebDAV permissions while
      // this service uses Graph actions, and the two can disagree. The peer
      // election that decides who hydrates has to follow the verdict that
      // actually gates writes, which is this one.
      state[SEED_CAPABLE_KEY] = !readOnly
    }
  }
})

server.listen().then(
  () => {
    console.log(`yjs server listening on :${port}, oc=${opencloudUrl}`)
  },
  (err: unknown) => {
    // Most often the port is already taken. Without this the process died on an
    // unhandled rejection and a stack trace instead of saying what went wrong.
    console.error(`yjs server failed to listen on :${port}:`, err)
    process.exit(1)
  }
)
