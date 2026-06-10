# Design: Multi-scheme folder vaults — Cryptomator support & vault URL addressing

Status: **draft for discussion** — written record of the design discussion on 2026-06-10.

## 1. Goal

With rclone-crypt merged as the first `folderVault` scheme, this document answers:
can the existing plugin architecture host further encrypted vault schemes —
primarily **Cryptomator (vault format 8)** — and what has to change?

Summary of the conclusion:

- Yes. The `folderVault` extension type and `FolderVaultEngine` stay; a Cryptomator
  plugin is a new `web-app-*` package like `web-app-rclone-crypt`.
- A small, strictly **additive** contract evolution is required (section 5). The
  rclone-crypt engine and the decorator behavior for existing vaults stay untouched.
- One security fix falls out of the discussion that applies to rclone-crypt **today**,
  independent of Cryptomator: clear-text names leak into URLs (section 7). It should
  ship first (phase 0).

## 2. Cryptomator format essentials

What differs structurally from rclone-crypt (verified against the
[vault format docs](https://docs.cryptomator.org/security/vault/)):

- **Names**: AES-SIV, with the **directory ID of the parent folder as associated
  data**. Directory IDs are random UUIDs that exist only server-side (in `dir.c9r`
  files); the vault root's dirId is the empty string. Consequence: a name's
  ciphertext depends on *where* it sits, and a bare name without its parent context
  is neither encryptable nor decryptable. Wrong AD ⇒ authenticated failure (this is
  the anti-tampering feature, not an accident).
- **Storage layout is flattened**: a folder's children live under
  `d/XX/YYYY…` where `XX/YYYY… = base32(sha1(aesSiv(dirId)))`. Subfolder entries are
  small `<encName>.c9r/` directories containing `dir.c9r` (the child's dirId) — an
  indirection resolved per descend. `dirid.c9r` is a backup copy; names > 220 chars
  are shortened via `.c9s`; symlinks are `symlink.c9r`.
- **Content**: AES-GCM in 32 KiB chunks below a file header carrying the content
  key; per-chunk AAD includes the chunk number and header nonce ⇒ genuinely
  streamable and range-capable (fits the engine's stream API better than
  rclone-crypt's current buffer-everything implementation).
- **Keys**: `masterkey.cryptomator` (scrypt → RFC 3394 AES-KW unwrap),
  `vault.cryptomator` config JWT (HMAC).

### Operation shapes

The flattened layout changes *what server operations look like*, not just names:

| Operation | rclone-crypt | Cryptomator |
| --- | --- | --- |
| list / stat | 1 call, 1:1 path | 1 PROPFIND + cached dirId chain (cold: 1 GET `dir.c9r` per segment) |
| file read/write | 1:1 | OK — content is location-independent (header + chunks) |
| file delete / move / copy | 1 call | OK — 1 call each (move re-encrypts the name in the target path) |
| **folder rename/move** | 1 MOVE | OK — 1 MOVE of the *entry*; content subtree stays put (cheap) |
| **folder create** | 1 MKCOL | ✗ 3–4 ops: entry dir + `dir.c9r` + `d/XX/YYYY` (+ `dirid.c9r`) |
| **folder delete** | 1 DELETE | ✗ recursive walk + n DELETEs; deleting only the entry **orphans** all descendant content subtrees |
| **folder copy** | 1 COPY | ✗ deep copy with fresh dirIds; a 1:1 COPY duplicates `dir.c9r` ⇒ two folders alias one content subtree (corruption) |
| trash restore | 1:1 paths | original paths are storage paths; folder delete/restore semantics are inconsistent without delegation |

## 3. What already holds in the current architecture

- `encryptPath`/`decryptPath` take **full vault-relative paths** — the path *is* the
  parent chain. Both are async, and `FolderVaultExtension.resolve()` is documented to
  allow loading per-vault state. Forward resolution (clear → server) therefore always
  works; it just becomes stateful and I/O-bearing.
- Per-resource decrypt failures are already graceful
  (`decryptResourceInPlace` catches, keeps ciphertext, flags `isInVault`) — undecryptable
  names degrade instead of crashing listings.
- Capability gating precedents exist: `claim.encryptsNames` (activities, search) and
  `Resource.isInVault` action gates.
- The upload pipeline has full context (`uploadFolder.path` + `relativeFolder`); its
  current bare-name `encryptPath(file.name)` calls are an implementation shortcut
  exploiting rclone's position independence, not missing information.
  `createDirectoryTree` already runs top-down through the decorated
  `webdav.createFolder`.
- Two callers translate genuinely bare names: the activity feed (no context in the
  data — degrade) and the upload pipeline (context available — refactor).

## 4. Cryptomator engine design

- **Stateful engine** with a lazy dirId chain cache (forward) and a reverse map
  (`dirIdHash → {dirId, clearPath}`) learned during navigation. Warm listings cost one
  PROPFIND; cold chains cost one `dir.c9r` GET per segment (cacheable; rclone's
  Cryptomator PR uses the same DirCache strategy).
- A **full crawl** (building the complete reverse index) is only needed on demand:
  trash display and cold fileId deep links. Do not precompute at unlock: a vault with
  *n* folders costs *n* GETs, and staleness handling (other clients create/move
  folders concurrently) is required either way — re-resolve on miss/404.
- Bare names stay untranslatable by design. Optional later: try-all-cached-dirIds
  heuristic for *decryption* (SIV is authenticated, a hit is certain) — O(folders)
  per name, not v1.
- **Crypto in the browser**: AES-GCM, AES-KW, HMAC, SHA-1 are native WebCrypto;
  scrypt is already in the dependency tree (rclone-crypt lib); AES-SIV (RFC 5297)
  needs a JS implementation (miscreant, or a small one over WebCrypto AES-CTR + JS
  CMAC).
- No production-grade JS implementation exists to reuse
  ([cryptomator-ts](https://github.com/MangoCubes/cryptomator-ts) and
  [marcboeker/cryptomator](https://github.com/marcboeker/cryptomator) are
  experimental prototypes). Reference implementations: cryptofs (Java),
  [rclone PR #8302](https://github.com/rclone/rclone/pull/8302) (Go). Interop
  behavior (creation order, healing) should follow cryptofs to avoid confusing the
  official clients.

## 5. Contract evolution (additive)

The guiding insight: encryption schemes differ in the **semantics of operations**,
not only in naming. Mature implementations all converge on a virtual-filesystem
boundary (cryptofs implements `java.nio.file.FileSystem`; rclone models crypt and
Cryptomator as wrapping backends). Our VFS interface already exists — it is the
`WebDAV` client interface — and `createVaultWebDav` is its "mirrored" implementation
(every operation = translate paths + delegate).

Additions (defaults preserve today's behavior; the rclone engine changes not at all):

```ts
interface FolderVaultClaim {
  // ...existing...
  layout: 'mirrored' | 'indexed'        // rclone: mirrored; cryptomator: indexed
  positionIndependentNames: boolean     // gates bare-name features (activity feed)
}

// Subset of the WebDAV interface, same signatures:
type VaultOperations = Pick<WebDAV, 'createFolder' | 'deleteFile' | 'copyFiles' /* … */>

interface FolderVaultEngine {
  // ...existing...
  encryptPath(rel: string, opts?: { as?: 'entry' | 'container' }): Promise<string>
  ops?: Partial<VaultOperations>        // scheme may own individual operations
}
```

- `entry | container`: a folder has two server forms in the flattened layout — as a
  directory *entry* (`d/<parentHash>/<encName>.c9r`, for move/delete/stat) and as a
  *container* to list into (`d/<ownHash>`). Only `listFiles` and the upload endpoint
  builder need the container form; default is `entry`.
- `ops?`: the decorator branches per method: `engine.ops?.createFolder ?? <today's
  translate-and-delegate>`. The hook set is bounded and named by the existing WebDAV
  interface — not an ad-hoc list.

### Decisions on the three divergent operations

- **createFolder: delegate.** Alternative considered ("lazy heal": single MKCOL for
  the entry, engine creates `dir.c9r` + content dir on first access) works but leaves
  transiently broken folders visible to concurrently syncing desktop clients and puts
  write side effects into path translation. Rejected as default; recorded as option.
- **deleteFolder: delegate (recursive walk + deletes).** Alternative considered
  (delete the entry only, orphaning content): keeps the vault *valid* — orphans are
  invisible, Cryptomator Desktop's health check collects them into `LOST+FOUND` — and
  incidentally makes trash-restore of folders work (content never deleted). Rejected
  as default because storage is never reclaimed and, worse, "deleted" content
  **resurfaces in LOST+FOUND** on the next health check — an expectation break for
  E2E users. Recorded as option.
- **copyFolder: blocked in v1** (file copy stays enabled — content is
  location-independent). A 1:1 COPY duplicates `dir.c9r` (aliasing corruption), and
  the engine cannot distinguish copy from move at translation time (identical
  source-translate call; move is legal and cheap). The block therefore lives in the
  decorator/action layer, keyed on `claim.layout` — this is why the claim field is
  not avoidable without either corruption or regressing rclone (where folder copy
  works). Deep copy with fresh dirIds is a later phase.

### Worker boundary

Keys live in the main thread (folder-vault store) and must not move into web
workers. Delete/paste/restore workers keep consuming pre-translated paths (see
`serverName` below, which simplifies this); folder operations on `indexed` vaults
bypass the workers and run in the main thread via `ops`. Vault items are a small
fraction of operation volume.

## 6. Vault URL addressing

### Invariant

> Route segments below a virtual anchor carry the **name form the server already
> knows** — never the decrypted form.

The anchor (vault root, zip file) is a real server resource and stays ordinary
path routing. Below it:

| Provider | Server-known name form | URL segments |
| --- | --- | --- |
| rclone-crypt | EME ciphertext names (in every PROPFIND anyway) | ciphertext |
| Cryptomator | SIV entry names (forward-resolvable while navigating) | ciphertext |
| zip browser | central directory is server-readable plaintext | cleartext (harmless by definition) |
| archives w/ encrypted name tables (7z `-mhe`, RAR `-hp`) | none | opaque/ciphertext (E2E context) |

Properties: URL prefixes remain valid URLs (breadcrumbs for free); Cryptomator SIV
names hang off the rename-stable parent dirId, so URLs break exactly when an
ancestor is renamed — the same semantics as ordinary folders. Zip providers must
normalize/encode inner names (encodings, zip-slip) before they reach routes.

Alternatives rejected:

- **Cleartext interior in path/query** — leaks to the operator's access log on every
  hard reload (history-mode SPA: the full path is the GET request line). This is
  exactly the adversary the vault blinds; see section 7.
- **Fragment routing** (`#/notes/q1.txt`) — collides with scroll anchors (`#L42`
  in pastebin-style apps) and adds hash-subrouter complexity.
- **Opaque query-param token** (`?vpath=…`) — no security advantage over opaque path
  segments (query strings also reach the server; opacity is what matters), and it
  loses free prefix URLs/breadcrumbs.

### Mechanics: `Resource.serverName`

Store the mechanism, encrypt only as refresher:

1. **Capture at listing**: `decryptResourceInPlace` has the encrypted path in hand
   (the `encryptedSuffix` local) immediately before overwriting `path`/`name`/
   `webDavPath` — keep the last segment as `resource.serverName`. Free; no engine
   API involved; works for every scheme since listings *arrive* in server form.
   Invariant: `serverName` exists iff decryption happened; absent ⇒ `name` *is* the
   server form (locked vaults, non-vault resources, zip).
   *`indexed`-layout caveats*: (a) children of a listing arrive as entries (last
   segment = entry name ✓), but the listed folder *itself* arrives in container form
   (`d/XX/YYYY…`) — capturing its last path segment would store a hash fragment.
   For `indexed` layouts the self-resource's `serverName` comes from the navigation
   context (last route segment / the engine's chain cache) instead. (b) The
   `webDavPath` rewrite must *rebuild* from dav-root + clear path; the current
   suffix-swap assumes a mirrored tree.
2. **Link building** (the existing narrow waist: `useResourceRouteResolver`,
   `createFileRouteOptions`, `useFolderLink`): child link = current route path
   (already ciphertext) + `/` + `serverName ?? name`. Synchronous — no async
   `encryptPath` in render paths.
3. **Reverse direction in the folder loader**: decrypt URL segments via
   `decryptPath` (async is fine there; for Cryptomator this is ordinary forward
   resolution). Breadcrumb *labels* from cleartext, breadcrumb *links* from the
   route's ciphertext segments.
4. **Staleness — the one bug magnet**: `serverName` is a cache. Three refresh
   points: rename/move handlers (store patch), upload announce (the pipeline already
   computes the encrypted name), and the decorator's `moveFiles`, which today returns
   the result without a `fromServer` pass and should gain one. EME and AES-SIV are
   deterministic — recomputation reproduces the server name exactly. One unit test
   per flow ("after rename, the built link targets the new server name").
5. **Simplification**: the worker handoffs (`encryptResourcePathsForServer`) can read
   `serverName` instead of re-encrypting — one less engine dependency in a delicate
   spot.

### Depth mismatch (flat layouts)

For Cryptomator the URL is deliberately **not a server path** — it is a chain of
per-level *entry names*, so URL depth always equals virtual depth:

```
virtual:  /vault/notes/q1.txt                  (depth 2)
URL:      /vault/R7wQz3Lk….c9r/m2Vt8xAq….c9r   (depth 2 — entry names)
server:   /vault/d/QR/STUVWX…/m2Vt8xAq….c9r    (depth 4, flat — never in the URL)
```

The chain is forward-resolvable level by level without a reverse index (root
container is computable from dirId `""`; each segment's `dir.c9r` yields the next
container) — even cheaper than a clear path, since segments need no re-encryption.
URL prefixes remain valid virtual levels (breadcrumbs), and `dirname()` works on
both the route and the clear `resource.path`.

The flat layout pokes through the generic mechanics in exactly three places:

1. the **self-resource** of a listing (container form — see capture caveat above),
2. **trash originals** and **`getPathForFileId`** — the only sources handing us
   server paths *without* listing context; their parent chain is hash-form and only
   translatable via the on-demand index (hence the v1 degrades), and
3. **`.c9s`-shortened names** — the `serverName` is the shortened form (stable,
   addressable, navigable); only the clear-text display costs one extra `name.c9s`
   read, which chain resolution performs anyway.

Side note: with the flat layout the *server* path depth is constant regardless of
virtual depth — deep virtual trees never stress server path limits; only the URL
grows. Under rclone-crypt both grow together.

## 7. Security issue in current main (ship first, independent of Cryptomator)

Today the vault interior is **cleartext in routing URLs**:

- the browsing route carries the clear path in `driveAliasAndItem`
  (`setupVaultUnlockGuard.ts` derives the clear vault path from it), and
- the unlock guard puts `to.fullPath` (cleartext) into the `redirectUrl` query.

On a hard reload (history-mode SPA) the full path — and on the unlock page, the
query — is sent as the GET request line and lands in the operator's access log.
That defeats the vault's purpose for exactly the adversary it targets. The data
paths are clean (apps consume `blob:` URLs; signed download URLs carry the
encrypted form) — the leak is isolated to routing.

Fix = section 6 applied to rclone-crypt (ciphertext segments + `serverName`
mechanics). With opaque segments, `redirectUrl` heals automatically (no cleartext in
`to.fullPath`). Draft issue title: *"rclone-crypt: clear-text vault paths leak into
URLs (reload + redirectUrl) — build vault routes from server name form"*.

## 8. v1 scope

| Area | v1 behavior |
| --- | --- |
| navigate, open/edit files, upload | works (streamed AES-GCM; range-capable later) |
| file rename/move/copy/delete | works (single ops) |
| folder create/rename/move/delete | works (`ops` delegation; delete recursive) |
| folder copy | blocked (action gate on `claim.layout`) |
| activity feed names | ciphertext (gate on `positionIndependentNames`) |
| trash | display via index when available; restore disabled for vault items |
| symlinks (`symlink.c9r`) | ignored / shown unsupported |
| names > 220 chars | read `.c9s`; reject creating over-long names |
| fileId deep links into vaults | unresolved (existing documented limitation; index closes it later) |
| sizes | ciphertext size shown (cosmetic; conversion formula later — same gap exists for rclone today) |

## 9. Vault detection (open product decision)

`claimsPath` is sync and convention-based today (`.vault` suffix). Existing
Cryptomator vaults — the whole point of interop — are only detectable via the
`vault.cryptomator` marker file (server probe, async). Bridge until the planned
per-user vault registry (already noted in `vaultWebDav.ts`) lands: an explicit
"Add vault" flow that stores the location in user settings/store, from which
`claimsPath` reads synchronously. A naming convention can be offered additionally
but does not cover existing vaults.

## 10. Alternatives to Cryptomator (for the record)

- **gocryptfs** — nearest architectural fit, especially with `-deterministic-names`
  (position-independent EME names, mirrored tree: fits today's contract almost
  unchanged; EME is already in the dependency tree via the rclone-crypt lib).
  Standard DirIV mode has a milder form of position dependence (one `gocryptfs.diriv`
  read per directory, tree still mirrored).
- **age (typage)** — not a vault format, but `encryptsNames: false` content-only
  schemes are already anticipated by the claim model; official TS lib exists;
  interesting for public-key "share encrypted" flows.
- Rejected: EncFS (legacy, negative 2014 audit), CryFS/securefs-full (block-based /
  structure-hiding — no 1:1 file mapping, incompatible with a per-file WebDAV
  overlay), VeraCrypt/LUKS (monolithic containers, no per-file sync).

## 11. Phasing

- **Phase 0 — URL leak fix (rclone-crypt, ships first):** `serverName` capture,
  link builders on server name form, folder loader decrypt, `moveFiles` fromServer
  pass, refresh points + unit tests.
- **Phase 1 — Cryptomator read-only spike:** unlock flow (scrypt/AES-KW/JWT),
  AES-SIV names, dirId chain cache, navigate + open files against a reference vault
  created with Cryptomator Desktop.
- **Phase 2 — write path:** upload (content header/chunks; endpoint = container
  form), `ops.createFolder`, file rename/move/copy/delete, `ops.deleteFile` for
  folders, folder-copy block.
- **Phase 3 — polish:** trash via on-demand crawl, `.c9s` write support or
  rejection UX, size conversion, DirCache warming, optional try-all-AD activity
  decryption.
- **Later:** Cryptomator Hub (OIDC-based key management — natural fit, OpenCloud
  speaks OIDC), gocryptfs as a second scheme to prove the multi-scheme contract.

## 12. Open questions

- Detection UX (section 9) — final form of "Add vault" + registry timeline.
- E2E test infrastructure: generate reference vaults in CI (cryptomator-cli, as the
  rclone PR does) vs. fixture vaults in the repo.
- AES-SIV dependency choice: miscreant (unmaintained?) vs. small in-house
  implementation over WebCrypto AES-CTR + CMAC (audit surface).

## References

- Cryptomator vault format: https://docs.cryptomator.org/security/vault/ and
  https://docs.cryptomator.org/security/architecture/
- Vault format 8 announcement: https://cryptomator.org/blog/2021/10/11/vault-format-8/
- rclone Cryptomator backend PR: https://github.com/rclone/rclone/pull/8302
- cryptofs (reference implementation): https://github.com/cryptomator/cryptofs
- gocryptfs spec: https://nuetzlich.net/gocryptfs/forward_mode_crypto/
- Health check / LOST+FOUND behavior:
  https://community.cryptomator.org/t/can-not-read-in-a-lost-found-folder-after-health-check/12620
