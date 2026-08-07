# Realtime collaboration

This doc explains the architecture and implementation of realtime collaboration in OpenCloud Web. It is intended for developers who want to understand how it works, or who want to implement their own collaborative app on top of the same infrastructure.

## Yjs

Collaboration is built on [Yjs](https://yjs.dev/), a CRDT framework for building collaborative applications. Yjs provides the data structures and algorithms for merging concurrent edits from multiple clients, ensuring that all clients eventually converge to the same state.

## System view

```mermaid
flowchart TB
    subgraph browsers["Browsers"]
        direction LR
        A["Client A<br/><i>web + text-editor</i>"]
        B["Client B<br/><i>web + text-editor</i>"]
    end

    subgraph oc["OpenCloud"]
        direction TB
        GRAPH["LibreGraph API"]
        DAV["WebDAV"]
    end

    HP["Yjs server<br/><i>in-memory replica per room</i><br/><i>never touches the file</i>"]

    A -->|"1 . load + save file<br/>GET / PUT, If-Match etag"| DAV
    B -->|"1 . load + save file"| DAV
    A <-->|"2 . CRDT sync + awareness<br/>websocket + bearer token"| HP
    B <-->|"2 . CRDT sync + awareness"| HP
    HP -->|"3 . who are you?"| GRAPH
    HP -->|"4 . may you write this?"| GRAPH
    HP -->|"5 . current etag"| DAV

    classDef client fill:#e8f0fe,stroke:#4285f4,color:#111
    classDef server fill:#e6f4ea,stroke:#34a853,color:#111
    classDef side fill:#fef7e0,stroke:#f9ab00,color:#111
    class A,B client
    class GRAPH,DAV server
    class HP side
```

### The Yjs server

The [OpenCloud Yjs server](https://github.com/opencloud-eu/web/tree/main/services/realtime) runs a [Hocuspocus](https://tiptap.dev/docs/hocuspocus) server that relays Yjs updates between clients editing the same file.

It is reachable at whatever URL the deployment configures. In the Web dev setup that is `/realtime` on the OpenCloud host, forwarded by OC's own proxy, but it could equally be a separate domain behind its own ingress. The server URL needs to be defined via the `WEB_OPTION_YJS_SERVER_URL` environment variable.

| It does                                           | It does not                                      |
| ------------------------------------------------- | ------------------------------------------------ |
| Hold an in-memory replica and sync it with peers  | Persist anything (no storage extension is wired) |
| Authenticate the bearer token against Graph `/me` | Read or write the file                           |
| Enforce read/write access per file, per user      | Decide when to save                              |
| Stamp the authenticated identity onto awareness   | Serialize the CRDT back to text                  |
| Reject peers running a mismatched app version     | Survive a restart, or an empty room              |

Notably it never converts the CRDT back into file content. That only happens in a browser, through the app's adapter - which is why saving needs a client to be online.

### Access control

`onAuthenticate` runs per connection, before any document data flows:

```mermaid
sequenceDiagram
    participant C as Client
    participant HP as Yjs server
    participant G as Graph API
    participant D as WebDAV

    C->>HP: connect(room, token, appVersion)
    HP->>HP: appVersion matches the room's baseline?
    Note over HP: first client into a room sets the baseline
    HP->>G: GET /graph/v1.0/me
    G-->>HP: user identity
    par ACL and etag probed together
        HP->>G: GET drives/{driveId}/items/{itemId}/permissions
        G-->>HP: allowed actions
    and
        HP->>D: HEAD /remote.php/dav/spaces/{itemId}
        D-->>HP: ETag
    end
    alt 401 / 403 / 404 from either
        HP-->>C: reject - access denied
    else write action present
        HP-->>C: accept (read-write)
    else read only
        HP-->>C: accept (readOnly)
    end
```

The room name is `<prefix>::<storageid>$<spaceid>!<opaqueid>`. The prefix is `collaborative.documentPrefix`, defaulting to the app's `applicationId`. The file id is `resource.id`, which is already global: a share recipient sees the same composite id as the owner, so both land in the same room. Note that this must not be `resource.remoteItemId` - `AppWrapper` fills that with the share space id, which identifies the mount point rather than the file, so every file inside a shared folder would collapse into one room. The server strips the `<prefix>::` part before parsing, so the ACL probe targets the real file. The prefix exists so two editors with incompatible Y.Doc layouts (Tiptap's `Y.XmlFragment` vs CodeMirror's `Y.Text`) never share a room for the same file.

Awareness is anti-spoofed: `beforeHandleAwareness` overwrites the `user` field on every inbound awareness state with the identity from the authenticated connection, so a client cannot present itself as someone else.

## Inside `web`

Ownership in one line: **`AppWrapper` owns the file and the session; the app owns the editor and the format.**

```mermaid
flowchart TB
    subgraph app["Extension - e.g. packages/web-app-text-editor"]
        IDX["index.ts<br/><i>AppWrapperRoute(App, { collaborative })</i>"]
        ADP["the adapter<br/><i>hydrate · serialize</i><br/><i>hasContent · reset</i>"]
        APP["App.vue<br/><i>useTextEditor(ydoc, awareness)</i>"]
    end

    subgraph pkg["web-pkg"]
        AW["AppWrapper.vue<br/><i>load · save · etag · dirty · autosave</i>"]
        UCD["useCollaborativeDocument<br/><i>Y.Doc · provider · hydration</i>"]
        UTE["useTextEditor<br/><i>Tiptap + Collaboration</i>"]
    end

    YDOC[("Y.Doc<br/><i>XmlFragment 'default'</i><br/><i>Map '_oc_meta'</i>")]
    HP["Yjs server"]
    DAV["WebDAV"]

    IDX -->|"collaborative: { appVersion, makeAdapter }"| AW
    AW -->|"makeAdapter(), once in setup"| ADP
    ADP -->|"CollaborativeAdapter"| UCD
    AW --> UCD
    UCD <-->|"reads + writes through the adapter"| YDOC
    UCD <-->|"sync + awareness"| HP
    AW -->|"slot props:<br/>ydoc · awareness · resource<br/>currentContent · isReadOnly"| APP
    APP --> UTE
    UTE <-->|"@tiptap/extension-collaboration"| YDOC
    AW <-->|"GET / PUT"| DAV

    classDef appc fill:#e8f0fe,stroke:#4285f4,color:#111
    classDef pkgc fill:#e6f4ea,stroke:#34a853,color:#111
    classDef data fill:#fce8e6,stroke:#ea4335,color:#111
    classDef ext fill:#fef7e0,stroke:#f9ab00,color:#111
    class IDX,ADP,APP appc
    class AW,UCD,UTE pkgc
    class YDOC data
    class HP,DAV ext
```

### Opting in

An app turns on collaboration with one route option.

```ts
// packages/web-app-text-editor/src/index.ts
AppWrapperRoute(TextEditor, {
  applicationId: 'text-editor',
  collaborative: {
    appVersion: pkg.version,
    makeAdapter: makeTextEditorAdapter
  }
})
```

### What happens when you open a file

1. WebDAV loads the file → gets saved to `currentContent` (`AppWrapper`)
2. Session creates the Y.Doc (empty, and it exists from here on) (`useCollaborativeDocument`, invoked by `AppWrapper`)
3. `HocuspocusProvider` gets handed the Y.Doc and connects to the Yjs server and syncs (`useCollaborativeDocument`)

From there on, first client:

1. `hasContent(ydoc)` is `false` → this client wins the election → `adapter.hydrate` (`collabAdapter.ts`)
2. `deserialize` (md/html pass through, json `JSON.parse`, plain-text builds the ProseMirror JSON itself) (`collabAdapter.ts`)
3. Headless editor is constructed with the strategy's extensions + Collaboration bound to the existing Y.Doc - `ySyncPlugin` attaches here (`collabAdapter.ts`)
4. `setContent` builds the ProseMirror tree, guided by `contentType` and the schema (`collabAdapter.ts`)
5. `ySyncPlugin` sees that transaction and writes the tree into the Y.XmlFragment
6. Y.Doc lives locally, and syncs to the Yjs server if a provider exists

Both lists run _after_ the version handshake and the etag drift check, which can short-circuit into a reload lock or into stale recovery before hydration is ever considered.

Client joining afterwards:

1. `hasContent(ydoc)` is `true` → return early, no hydration, no election, no 150 ms wait. (`useCollaborativeDocument.ts`)
2. Y.Doc lives locally, and syncs to the Yjs server if a provider exists

### Y.Doc

Y.Doc is the CRDT that holds the shared state. It is a tree of shared types, and the editor content lives in a `Y.XmlFragment` named `"default"`. The session also maintains a `Y.Map` named `"_oc_meta"` for coordination and metadata.

There is no single global document. Every participant holds its own `Y.Doc`, and the server holds one too:

```mermaid
flowchart LR
    subgraph room["One room = one file, one editor app"]
        direction LR
        DA[("Client A<br/>Y.Doc")]
        DS[("Yjs server<br/>Y.Doc<br/><i>memory only</i>")]
        DB[("Client B<br/>Y.Doc")]
        DA <-->|"updates"| DS
        DS <-->|"updates"| DB
    end

    F[("File on disk<br/><i>WebDAV</i>")]
    DA -.->|"hydrate: read once"| F
    DA -.->|"save: serialize + PUT"| F
    DB -.->|"save: serialize + PUT"| F

    classDef rep fill:#fce8e6,stroke:#ea4335,color:#111
    classDef file fill:#e6f4ea,stroke:#34a853,color:#111
    class DA,DB,DS rep
    class F file
```

All three are convergent replicas of the same CRDT. None is authoritative - that is the point of a CRDT: updates applied in any order end up at the same state. The server's copy is not a coordinator, it is a participant that happens to always be present.

It exists for two reasons. It gives a late joiner the room's current state in one initial sync, without any peer having to notice and re-send. And because it is a real `Y.Doc`, server-side hooks could read `_oc_meta` if a future stale probe ever needed to run server-side. Nothing does today.

The server's replica is memory-only - no storage extension is wired up. When the last client disconnects, the room empties and that copy is gone. Reconnecting later starts from a blank server doc, which is why hydration runs again. That is a deliberate trade - see [Known limits](#known-limits).

### The CollaborativeAdapter

The app provides a `CollaborativeAdapter` to the session, which is how the session reads and writes the Y.Doc. The adapter is responsible for converting between the native file format and the Y.Doc's shared types.

```ts
interface CollaborativeAdapter {
  hydrate(ydoc: Y.Doc, content: string): void | Promise<void>
  serialize(ydoc: Y.Doc): string | Promise<string>
  hasContent(ydoc: Y.Doc): boolean
  reset?(ydoc: Y.Doc): void
}
```

`makeAdapter` runs during `AppWrapper`'s setup - before the file is loaded - so it receives a reactive context (`{ resource: Ref<Resource> }`) and reads it lazily. It must run in setup because content strategies call `useGettext()`, which is why `makeTextEditorAdapter` resolves its strategies eagerly and only picks between them per call.

### Startup order

```mermaid
sequenceDiagram
    autonumber
    participant AW as AppWrapper
    participant DAV as WebDAV
    participant S as useCollaborativeDocument
    participant HP as Yjs server
    participant APP as App.vue

    AW->>DAV: PROPFIND - resource info
    DAV-->>AW: resource (id, etag, permissions)
    AW->>DAV: GET - file body
    DAV-->>AW: currentContent + OC-ETag
    Note over AW,S: only now is the session enabled -<br/>hydration seeds from currentContent
    AW->>S: enabled = true
    S->>HP: connect(room, token, appVersion)
    HP-->>S: authenticated
    S->>HP: initial sync
    HP-->>S: onSynced
    S->>S: version handshake · etag drift check · hydration election
    Note over S: winner runs adapter.hydrate(ydoc, currentContent)
    S-->>AW: isReady = true
    Note over AW: loading screen drops, slot renders
    AW->>APP: ydoc + awareness (non-null, hydrated)
    APP->>APP: useTextEditor binds Tiptap to the Y.Doc
```

`AppWrapper` keeps its loading screen up until the session reports ready, so `App.vue` mounts against a Y.Doc that is already synced and hydrated. That is what lets the app declare `ydoc` and `awareness` as required props and call `useTextEditor` directly, with no placeholder of its own.

### Hydration

Hydration is the process of taking the file content and seeding it into the Y.Doc. It usually only happens once per room, and only if the room is empty. The first client to arrive into an empty room runs `adapter.hydrate(ydoc, currentContent)`. All other clients skip hydration and wait for the Yjs server to sync them up. A state recovery may re-run hydration if the room turns out to be stale, i.e. `_oc_meta.etag` no longer matches the etag the joining client just fetched.

Two clients can arrive into an empty room at the same moment, and only one may seed it - otherwise the content lands twice. The elected client is the one with the lowest Yjs `clientID`, after a 150 ms pause to let peers announce themselves. The winner sets `_oc_meta.hydrated` before it seeds, so peers can react to the incoming content rather than merge with it.

### Stale recovery

When a joining client finds that `_oc_meta.etag` no longer matches the etag it just fetched, the file changed outside the room. It stamps `nativeEtag`, claims the job via `recoveryClientId` and raises `isStale`. Every peer's meta observer fires, but only the elected one gets through: recovery wipes the room and re-seeds it, and the only peer holding the body behind `nativeEtag` is the one that just fetched the file. Any other peer would publish the copy it opened with - or its own last serialization - and then stamp the fresh etag onto it, so the next save would overwrite the external writer with a matching `If-Match` and no conflict.

The elected peer captures that body at detection time rather than reading `currentContent` when recovery runs. By then the room has synced its own state into the Y.Doc and the debounced serialize has reported it straight back into `currentContent`.

`recoveryClientId` is last-write-wins, so if several clients detect the same drift at once, exactly one of them survives convergence. A peer that joins while `isStale` is already up offers itself the same way, provided its etag matches `nativeEtag` - the observer only fires on change, so without that the room would stay stuck if the elected peer navigated away mid-recovery.

Reset lands before hydrate, so a throw in between leaves every peer looking at an empty document. That path keeps `isStale` up for the next joiner to retry and locks the session, which is what stops the autosave from writing the emptiness to disk.

### `_oc_meta`

A `Y.Map` alongside the editor content, used for coordination the editor never sees:

| Key                | Written by          | Meaning                                       |
| ------------------ | ------------------- | --------------------------------------------- |
| `etag`             | whoever saved last  | the etag the room believes is on disk         |
| `lastSavedAt`      | whoever saved last  | fan-out trigger for a peer save               |
| `appVersion`       | first peer in       | schema version the room is running            |
| `isStale`          | any writer          | the file changed outside this room; rehydrate |
| `nativeEtag`       | writer that noticed | the etag recovery should settle on            |
| `recoveryClientId` | writer that noticed | which peer is elected to re-seed the room     |
| `hydrated`         | the seeding peer    | someone is seeding the room right now         |

Every key lives in the shared Y.Doc, so a read-only peer's writes to it are
rejected by the Yjs server along with everything else. Staleness noticed by a
read-only peer alone therefore never reaches the room.

### Saving

Saving is unchanged from single-user editing: `AppWrapper` PUTs over WebDAV with `If-Match`. Collaboration only changes where the content comes from and how conflicts resolve.

```mermaid
sequenceDiagram
    participant U as User A
    participant SA as Session A
    participant AWA as AppWrapper A
    participant HP as Yjs server
    participant SB as Session B
    participant AWB as AppWrapper B
    participant DAV as WebDAV

    U->>SA: types
    SA->>HP: CRDT update
    HP->>SB: CRDT update
    Note over SA: 300 ms after typing stops
    SA->>SA: adapter.serialize(ydoc)
    SA->>AWA: onContentChange
    Note over AWA: currentContent updated,<br/>isDirty flips to true - no PUT yet
    Note over AWA: later: Ctrl+S or the 120 s autosave
    AWA->>DAV: PUT If-Match: etag
    DAV-->>AWA: new etag
    AWA->>SA: resource.etag changed
    SA->>HP: _oc_meta.etag + lastSavedAt
    HP->>SB: meta update
    SB->>SB: serialize - this is now what's on disk
    SB->>AWB: onServerContentChange + onEtagChange
    Note over AWB: isDirty drops to false,<br/>next If-Match is already correct
```

The 300 ms debounce only refreshes `currentContent`, which is what drives `isDirty`. It never triggers a PUT on its own. The actual write comes from a manual save (Ctrl+S) or the autosave timer (default 120 s), and both go through the same path. If a PUT comes back 409/412, `AppWrapper` refetches, compares, and retries once with the fresh etag before showing a conflict message - the local Y.Doc already contains the peer's edits, so the retry publishes the merged state.

### Local mode

When `options.yjsServerUrl` is unset the session still creates a `Y.Doc` and a standalone `Awareness`, skips the provider, and hydrates immediately. The Y.Doc binding is the same in both modes, so adapters and editor extensions need no branch. Two things do differ: no peers ever appear, and `useTextEditor` re-reads `yjsServerUrl` itself to decide whether to drop the source-mode action. That is what "collaboration disabled" means here - the editor works as it always did, it just never syncs.

### File map

| Path                                                                         | Role                                                                          |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `packages/web-pkg/src/composables/collaborative/useCollaborativeDocument.ts` | the session: Y.Doc, provider, hydration, staleness, version gate, etag mirror |
| `packages/web-pkg/src/composables/collaborative/types.ts`                    | `CollaborativeAdapter`                                                        |
| `packages/web-pkg/src/components/AppTemplates/AppWrapper.vue`                | owns the session, the save loop and the loading gate                          |
| `packages/web-pkg/src/components/AppTemplates/types.ts`                      | `CollaborativeOptions`, `CollaborativeAdapterContext`, slot args              |
| `packages/web-pkg/src/editor/collabAdapter.ts`                               | `makeTiptapCollabAdapter` - any strategy to a Y.Doc                           |
| `packages/web-pkg/src/editor/composables/useTextEditor.ts`                   | binds Tiptap to a Y.Doc and renders peer carets                               |
| `packages/web-app-text-editor/src/collab.ts`                                 | the text editor's adapter and content-type detection                          |
| `services/realtime/src/server.ts`                                            | the Yjs server (Hocuspocus)                                                   |

---

## Known limits

These are open items, not bugs to be surprised by.

**Durability depends on an open browser.** The Yjs server holds no state and does not save. If every client closes between autosaves, edits made since the last save are lost with the room. A server-side flush would require `serialize` to run in Node, which the Tiptap-based adapter cannot do today.

**Every peer autosaves.** A remote edit marks _your_ `AppWrapper` dirty, so with N clients open the same document gets saved N times per autosave interval. There is election for hydration but none for saving.

**Peer edits arm your unsaved-changes guard.** Same root cause: remote CRDT updates flow into `currentContent`, so `beforeunload` and the unsaved-changes modal fire for edits you did not make. Writers only - `isDirty` is hard-wired to `false` for a read-only client, which has nothing to save.

**Hydration election can race.** The 150 ms awareness-settle window is heuristic. If awareness has not propagated in time, two peers can both elect themselves and hydrate, duplicating content. Server-side hydration would remove the whole class.

**`_oc_meta` is writable by any client with write access.** A buggy or hostile client can set `appVersion` or `isStale` and lock or reset every peer in the room. The room's control plane has no server authority beyond the read-only gate.

**`appVersion` is `0.0.0`.** `web-app-text-editor` is a private package with a placeholder version, so the version gate never actually fires for it.

**Source mode is disabled in collab.** It swaps the ProseMirror view for a plain textarea, which has no Y.Doc binding, so `useTextEditor` drops the `source-mode` action whenever a realtime session is active. Marked as a `FIXME`.

**Connection state is invisible.** The session exposes a `status` ref (`connecting` / `connected` / `disconnected` / `local`), but `AppWrapper` ignores it. A dropped websocket produces no indicator: the user keeps typing into a Y.Doc that no longer reaches anyone.

**`_oc_meta.hydrated` is never cleared.** Stale recovery deletes `isStale`, `nativeEtag` and `recoveryClientId` but leaves `hydrated` set. Harmless today, since the recovered room really is seeded, but it means the flag tracks "this room was ever seeded" rather than "a peer is seeding right now".

**Stale recovery needs someone who holds the fresh body.** Only a peer whose fetched etag matches `nativeEtag` may re-seed the room. If that peer leaves before finishing, the room stays flagged until another client opens the file and picks the job up. Peers already in the room keep editing a document that no longer matches disk in the meantime.

**Bundle weight.** `AppWrapper` imports the session directly, so `yjs`, `y-protocols` and `@hocuspocus/provider` land in web-pkg's main entry - loaded even by users who never open an editor. Moving the session behind a `defineAsyncComponent` would fix it at the cost of some indirection.
