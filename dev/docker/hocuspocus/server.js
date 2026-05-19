import { Server } from '@hocuspocus/server'
import { SQLite } from '@hocuspocus/extension-sqlite'

const port = parseInt(process.env.PORT ?? '1234', 10)
const dbPath = process.env.DB_PATH ?? '/var/lib/hocuspocus/state.db'
const opencloudUrl = (process.env.OPENCLOUD_URL ?? 'https://host.docker.internal:9200').replace(/\/$/, '')
const devFakeToken = process.env.DEV_FAKE_TOKEN ?? ''

// Per-document first-seen app version. Acts as the authoritative gate for
// "everybody in this room must run the same client version". First connect
// for a documentName sets the baseline; subsequent connects with a different
// appVersion are rejected at authenticate-time. In-memory only; on restart
// the next connecter becomes the new baseline (acceptable for a stateless
// sidecar). Empty appVersion is tolerated for legacy/test clients.
const appVersionByDocument = new Map()

function deterministicColor(seed) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  return `hsl(${Math.abs(hash) % 360}, 70%, 50%)`
}

async function validateTokenAgainstOpenCloud(token) {
  const res = await fetch(`${opencloudUrl}/graph/v1.0/me`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`graph /me returned ${res.status}: ${detail.slice(0, 200)}`)
  }
  return res.json()
}

// Heuristic: a libregraph permission action implies write access when its
// trailing verb is create/update/delete/allTasks on driveItem properties.
const WRITE_ACTION = /\/(update|create|delete|allTasks)$/

// Splits OC's canonical composite id `<storageid>$<spaceid>!<opaqueid>` into
// the (driveId, itemId) pair the Graph endpoint expects: driveID =
// `<storageid>$<spaceid>`, itemID = the FULL composite.
function parseDocumentId(documentName) {
  const sep = documentName.indexOf('!')
  if (sep <= 0 || sep === documentName.length - 1) {
    throw new Error(`malformed documentName="${documentName}"`)
  }
  return { driveId: documentName.slice(0, sep), itemId: documentName }
}

// Probes OC's Graph API for the user's effective access AND the file's
// current native etag. Returns `{ canWrite, etag }` on success; `null` when
// OC denies access entirely (401/403/404).
//
// Two parallel calls:
// - Graph /permissions for the effective action set (top-level
//   @libre.graph.permissions.actions.allowedValues, which is the merged
//   PermissionSet that backs WebDAV's oc:permissions).
// - WebDAV HEAD for the native eTag (Graph's /items endpoint is share-jail-
//   only and 400s on personal drives; WebDAV works uniformly).
async function probeFileAccess(token, documentName) {
  const { driveId, itemId } = parseDocumentId(documentName)
  const permsUrl =
    `${opencloudUrl}/graph/v1beta1/drives/${encodeURIComponent(driveId)}` +
    `/items/${encodeURIComponent(itemId)}/permissions`
  const davUrl = `${opencloudUrl}/remote.php/dav/spaces/${encodeURIComponent(itemId)}`
  const headers = { Authorization: `Bearer ${token}` }

  const [permsRes, headRes] = await Promise.all([
    fetch(permsUrl, { headers }),
    fetch(davUrl, { method: 'HEAD', headers })
  ])

  if ([permsRes.status, headRes.status].some((s) => s === 401 || s === 403 || s === 404)) {
    return null
  }
  if (!permsRes.ok) {
    const detail = await permsRes.text().catch(() => '')
    throw new Error(`graph permissions returned ${permsRes.status}: ${detail.slice(0, 200)}`)
  }
  if (!headRes.ok) {
    const detail = await headRes.text().catch(() => '')
    throw new Error(`webdav HEAD returned ${headRes.status}: ${detail.slice(0, 200)}`)
  }

  const permsBody = await permsRes.json()
  const allowed = Array.isArray(permsBody?.['@libre.graph.permissions.actions.allowedValues'])
    ? permsBody['@libre.graph.permissions.actions.allowedValues']
    : []
  const canWrite = allowed.some((a) => WRITE_ACTION.test(a))

  // WebDAV emits the strong validator under `ETag` (and sometimes `OC-ETag`
  // for OC-specific extensions). Strip surrounding quotes for consistency
  // with the etag the wrapper sees from `props.resource.etag`.
  const rawEtag = headRes.headers.get('etag') || headRes.headers.get('oc-etag') || ''
  const etag = rawEtag.replace(/^"(.*)"$/, '$1')

  return { canWrite, etag }
}

const META_KEY = '_oc_meta'

const server = new Server({
  port,
  address: '0.0.0.0',
  extensions: [new SQLite({ database: dbPath })],

  async onAuthenticate({ token, documentName, requestParameters }) {
    if (!token) {
      throw new Error('missing token')
    }

    // App-version gate. First connect to a documentName sets the baseline,
    // subsequent connects with a different appVersion are rejected so old
    // clients can't poison the room. Empty client appVersion is permitted
    // (back-compat for the integration test harness using a raw provider).
    const clientAppVersion = requestParameters.get('appVersion') ?? ''
    const baselineAppVersion = appVersionByDocument.get(documentName)
    if (clientAppVersion && baselineAppVersion && clientAppVersion !== baselineAppVersion) {
      throw new Error(
        `app version mismatch for document="${documentName}": ` +
          `client=${clientAppVersion} room=${baselineAppVersion}, please reload`
      )
    }
    if (clientAppVersion && !baselineAppVersion) {
      appVersionByDocument.set(documentName, clientAppVersion)
    }

    // Dev shortcut for integration tests: any token matching DEV_FAKE_TOKEN
    // returns a synthetic identity. ACL check is skipped (tests use random
    // documentNames that don't exist in OC). Disabled when DEV_FAKE_TOKEN is
    // unset. Tests can pass `devEtag` to drive the stale-state detection
    // path without touching real OC.
    if (devFakeToken && token === devFakeToken) {
      const id = 'dev-fake-user'
      const nativeEtag = requestParameters.get('devEtag') ?? ''
      console.log(
        `[onAuthenticate] dev-fake document="${documentName}" nativeEtag="${nativeEtag}"`
      )
      return {
        nativeEtag,
        user: {
          id,
          displayName: 'Dev Fake User',
          color: deterministicColor(id)
        }
      }
    }

    const me = await validateTokenAgainstOpenCloud(token)
    const id = me.id ?? me.userPrincipalName ?? 'unknown'

    // ACL + native etag probe via Graph: enforces access AND captures the
    // current native etag so onLoadDocument can detect a stale persisted
    // Y.Doc snapshot (Hocuspocus persistence vs external file write).
    const access = await probeFileAccess(token, documentName)
    if (access === null) {
      throw new Error(`access denied for document="${documentName}"`)
    }
    const readOnly = !access.canWrite

    console.log(
      `[onAuthenticate] document="${documentName}" user="${me.displayName ?? id}" ` +
        `id="${id}" readOnly=${readOnly} nativeEtag="${access.etag}"`
    )
    return {
      readOnly,
      nativeEtag: access.etag,
      clientAppVersion,
      user: {
        id,
        displayName: me.displayName ?? me.userPrincipalName ?? id,
        color: deterministicColor(id)
      }
    }
  },

  // Stale-state detection: SQLite extension has loaded the persisted Y.Doc
  // by the time this runs (extension hooks run before the configuration
  // hook). onLoadDocument only fires when a doc is loaded into memory for
  // the first time after eviction — i.e. nobody else is in the room — so
  // we can safely flag-and-rehydrate without racing live peers.
  //
  // Two staleness dimensions, both produce the same `_oc_meta.isStale = true`
  // signal for the wrapper to act on:
  //  1. etag drift: external file write happened between sessions
  //     (persisted etag != caller's native etag)
  //  2. app-version drift: persisted Y.Doc was written by an older client
  //     version whose adapter layout the new client can no longer read
  async onLoadDocument({ document, context }) {
    const meta = document.getMap(META_KEY)
    const persistedEtag = meta.get('etag')
    const nativeEtag = context?.nativeEtag
    const persistedAppVersion = meta.get('appVersion')
    const clientAppVersion = context?.clientAppVersion

    const etagDrift = !!persistedEtag && !!nativeEtag && persistedEtag !== nativeEtag
    const versionDrift =
      !!persistedAppVersion && !!clientAppVersion && persistedAppVersion !== clientAppVersion

    if (!etagDrift && !versionDrift) return

    const reasons = []
    if (etagDrift) reasons.push(`etag(${persistedEtag}→${nativeEtag})`)
    if (versionDrift) reasons.push(`appVersion(${persistedAppVersion}→${clientAppVersion})`)
    console.log(
      `[onLoadDocument] stale state document="${document.name}" ` +
        `${reasons.join(' ')} → marked for rehydrate`
    )
    document.transact(() => {
      meta.set('isStale', true)
      if (nativeEtag) meta.set('nativeEtag', nativeEtag)
    })
  },

  async onConnect({ documentName, requestHeaders }) {
    console.log(`[onConnect] document="${documentName}" origin=${requestHeaders.origin ?? '-'}`)
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
  // the authenticated identity from the connection's context. Provided by
  // the patched @hocuspocus/server (see patches/).
  async beforeHandleAwareness({ states, connection }) {
    const user = connection?.context?.user
    if (!user) return
    const canonical = {
      id: user.id,
      name: user.displayName,
      color: user.color
    }
    for (const state of states.values()) {
      state.user = canonical
    }
  }
})

server.listen().then(() => {
  console.log(`hocuspocus v4 listening on :${port}, db=${dbPath}, oc=${opencloudUrl}`)
})
