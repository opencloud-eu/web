eplain why we need the selected part                                                                                                                                                                                                                                                                                      
⎿  ⧉ Selected 53 lines from dev/docker/hocuspocus/server.ts in WebStorm

⏺ That block exists because tiptap is a browser library, and we're running it inside flushRoom / onLoadDocument to convert markdown ↔ Y.Doc on the server. The order matters: every line in that block has to run before any tiptap or prosemirror import, because those modules touch DOM globals at module-load time, not
lazily on first use.

What each piece is for:

const dom = new JSDOM(...) — Spins up a fake browser environment. We never render anything, but tiptap's Editor (via prosemirror's EditorView) builds a live ProseMirror view internally as soon as you new Editor({...}). The view attaches event listeners, measures the viewport, etc., and needs the DOM API surface
to do so.

pretendToBeVisual: true — Makes jsdom expose requestAnimationFrame etc. as real functions instead of throwing. ProseMirror's view scheduler uses them.

definePolyfill(key, value) — Only assigns to globalThis[key] if (a) it isn't already there and (b) the global is writable. The try/catch swallows the case where Node 22 ships a read-only getter for things like navigator — we don't want a "Cannot set property" crash at boot when there's nothing to do.

pickFromWindow(key) — When you copy a method like addEventListener off dom.window onto globalThis, the implicit this is wrong (it points at globalThis, not at the window jsdom expects). bind(w) fixes that so calls like a bare addEventListener(...) route back to the window where the listener registry lives.

The for loop — Each entry is something a piece of tiptap / prosemirror / collaboration extensions actually reaches for at runtime:
- document, DOMParser, Node, Element, HTMLElement — ProseMirror's HTML parser used by setContent(htmlString).
- addEventListener / removeEventListener — EditorView listens for keystrokes, IME, selection events.
- requestAnimationFrame / cancelAnimationFrame — ProseMirror's view scheduler.
- innerWidth, innerHeight, pageXOffset, pageYOffset, scrollX, scrollY, devicePixelRatio, visualViewport — ProseMirror's measurement code reads these during view construction.
- Range, Selection, CSS, getComputedStyle — selection/decoration handling and layout queries.

Why we landed on jsdom (vs. linkedom) — linkedom is lighter, but only provides a DOM tree, not a real window with event APIs, animation frames, selection, etc. We hit the polyfill ceiling fast and had to switch. jsdom gives us a complete enough window that ProseMirror's new EditorView(...) works without further
patching.

This is the price of reusing the client's tiptap stack on the server to guarantee the prosemirror schema matches byte-for-byte (so Y.Doc conversions don't corrupt). An alternative would be to drop tiptap on the server and convert markdown ↔ Y.Doc with prosemirror-markdown + prosemirror-model directly — no DOM
needed — but then we'd have to keep the two schemas in lockstep manually.

✻ Cooked for 24s

❯ Tell me more about that This is the price of reusing the client's tiptap stack on the server to guarantee the prosemirror schema matches byte-for-byte (so Y.Doc conversions don't corrupt). An alternative would be to drop tiptap on the server and convert markdown ↔ Y.Doc with prosemirror-markdown +                
prosemirror-model directly — no DOM                                                                                                                                                                                                                                                                                       
needed — but then we'd have to keep the two schemas in lockstep manually.                                                                                                                                                                                                                                               
⎿  ⧉ Selected 1 lines from dev/docker/hocuspocus/server.ts in WebStorm

⏺ The core issue is that y-prosemirror's prosemirrorJSONToYDoc(schema, json, 'default') and yDocToProsemirrorJSON(doc, 'default') are schema-bound. They serialize ProseMirror nodes into a Y.XmlFragment whose XML element names, attribute keys, and mark names come straight from the schema's node/mark definitions. So
if the client's editor has, say, a node spec named paragraph with an attribute lineHeight, that exact spelling is encoded into the Y.Doc.

When a Y.Doc update flows from client A through the server back to client B, both ends decode the Y.XmlFragment using their own schema. If A's paragraph allows lineHeight and B's doesn't, B's ProseMirror parser will either drop the attribute, throw a validation error, or worst case construct an invalid document
tree. Run that for a few minutes of edits and you get content drift, dropped marks, missing list items, or hard "invalid content" crashes in the editor view. The data isn't deleted on disk, but the live collaborative state diverges from what the schema expects.

Today's approach is "schema parity by construction". The server imports the same tiptap extension packages at the same versions as the client (@tiptap/extension-link@^3.20.4 on both, @tiptap/extension-table@^3.20.4 on both, etc.) and instantiates a real new Editor({extensions}) for the conversion. Since both ends
materialize the schema from the same code, they're literally identical. The price: tiptap's Editor constructor builds a live ProseMirror EditorView, which assumes a browser → hence jsdom + the polyfill block. We never render anything, but we pay the cost of pretending we could.

The "no-DOM" alternative is to skip tiptap on the server and build a Schema from prosemirror-model directly, then use prosemirror-markdown's MarkdownParser / MarkdownSerializer. The conversion becomes a few hundred bytes of pure data manipulation, no jsdom, container is ~200 MB smaller, startup is ~200 ms faster,
and there's no risk of a future tiptap version pulling in some new DOM dependency.

What it costs:

1. Two schemas to maintain. The client gets its schema from tiptap extensions (each extension contributes node/mark specs declaratively). The server would describe the same schema by hand in Schema constructor form: every node spec (content, group, attrs, parseDOM/toDOM), every mark spec, every
   defining/isolating/atom flag, every default attribute. A few hundred lines of code that has to mirror what the tiptap extensions do — and stay in sync as they evolve.
2. prosemirror-markdown is a smaller, opinionated subset. It ships parser/serializer rules for headings, paragraphs, lists, blockquote, code blocks, inline marks, links, images. Tables, task lists, task items, footnotes, etc. are not there — you'd write the tokenizer extension and the serializer node rules
   yourself. Tiptap's @tiptap/markdown already bundles markdown-it plugins and renderers for the extensions we use, so we get table support, task-list checkboxes, etc. for free.
3. Round-trip semantics may diverge. Tiptap's markdown package and prosemirror-markdown have different rules for things like soft line breaks, list item indentation, table alignment, escape characters. Even if the schema is "the same", the wire format on disk would subtly differ from what the client saves
   locally. Confusing for users hot-switching between collab and non-collab.
4. Schema drift = silent Y.Doc corruption. This is the worst failure mode. If someone bumps @tiptap/extension-table on the client to a major that adds a new attribute, and the server's hand-rolled schema lacks it, Y.Doc updates carrying that attribute either get rejected or partially applied. Today, that's a
   "bump both package.jsons" mistake; in the alternative, it's a "bump tiptap and remember to also patch the server schema" mistake — much easier to miss in CI.

When the swap makes sense: when (a) the editor's schema stabilizes (rare changes, locked majors), (b) bundle size or cold-start time becomes a real operational concern (current setup is fine for the concept dev stack), or (c) tiptap pulls in a future browser-only dependency that even jsdom can't fake. None of
those apply right now, which is why I left the jsdom approach in place.

The middle ground worth considering, if/when this graduates from concept to feature: have the client export its schema as a serialized JSON spec at build time (write a tiny vite plugin that imports the strategies and calls editor.schema.toJSON() or hand-rolls a node-spec dump), commit that artifact, and the
server Schema.fromJSONs it. That gives "no DOM" + "no manual sync" but you pay a slightly weird build step. Probably overkill for the current scope.

## Comparison with the OpenProject approach

Their architecture in one sentence

A Hocuspocus 3.x server with a single Extension that authenticates a per-document encrypted token, loads/stores the Y.Doc as a base64 blob through OpenProject's REST API, and uses BlockNote's ServerBlockNoteEditor (a headless helper that ships with @blocknote/server-util) to derive a markdown rendering for the
API's description field on every save.

Where they're clearly better than us

1. No DOM polyfills. BlockNote ships a first-class server runtime — ServerBlockNoteEditor.create({schema}) is designed to run in Node without a window. Tiptap doesn't have an equivalent; using its Editor on the server inevitably constructs a ProseMirror EditorView, which is the entire reason for our jsdom block.
   If we adopted a similar split (an editor whose server-side helper is officially supported), the polyfill block disappears.

2. Schema parity by construction, in a shared package. They factor the project-specific blocks into a separate npm package op-blocknote-extensions that both the client and hocuspocus consume. No "make sure the two package.jsons have the same pinned tiptap majors" liability. The
   BlockNoteSchema.create().extend({...}) pattern lets them share the schema definition itself, not just the dependency versions.

3. Persistence is the CRDT, not the rendered text. This is the biggest model difference. They store two things on every save: the raw Y.Doc as Buffer.from(Y.encodeStateAsUpdate(doc)).toString('base64') and a lossy-markdown render as description. The Y.Doc blob is canonical for collab; the markdown is a derived
   artifact for human/API consumers. On load they just Y.applyUpdate(data.document, update) — no parsing, no schema round-trip, no information loss. Heading attributes, custom block specs, fine-grained marks all round-trip perfectly because they're never serialized through markdown.

   We're stuck doing tiptap-markdown-render on every save because the on-disk file is the markdown. Their model is only available to us if OpenCloud grows a side-channel for opaque binary state — an xattr, a sidecar file like foo.md.yjs, an OCS endpoint, etc.

4. Resource identity = URL. Their documentName is the resource URL itself, which doubles as the API endpoint for load/store. Our <fileId>__<ct> parsing exists only because we shoved a content-type hint into the room name to dispatch on the server. With CRDT-as-canonical storage there's no per-content-type
   dispatch, the room name is just the URL, and the server fetches whatever the URL points to. Much cleaner.

Where they made interesting different choices

5. Token model is encrypted-blob + shared secret, not direct OIDC validation. OpenProject mints a token by AES-256-GCM-encrypting {resource_url, oauth_token, expires_at, readonly} with a shared SECRET. Hocuspocus decrypts, then validates the resource binding and uses the unwrapped OAuth token to test access via a
   real REST call. Pros:
- Hocuspocus needs zero knowledge of the IdP (no JWKS discovery, no issuer config).
- The token is bound to a specific resource at issuance time — cross-room replay is structurally impossible.
- readonly is encoded in the token; no permission lookup needed on the server.

  Cons: requires OpenProject ↔ Hocuspocus to coordinate on the symmetric key (rotation is a two-place change), and OpenProject has to do the actual OAuth validation. We picked the more standard "Hocuspocus directly validates JWTs against the IdP" path, which is more independent but more setup.

6. Per-message token expiry + onTokenSync refresh. They check tokenExpiresAt on every incoming message (beforeHandleMessage) and force-close the connection with WebSocket code 4401 when expired. The client is expected to refresh proactively via provider.sendToken(newEncryptedToken), which triggers their
   onTokenSync to re-validate and swap connection.context.token in place — no reconnect. That's stricter and more secure than our "the WebSocket lives as long as the connection lives, next reconnect re-auths" model. It also requires us to be on Hocuspocus 3.x (we're on 2.15.2; onTokenSync and beforeHandleMessage are
   3.x additions).

7. Stateless event is a plain string. Their connection.sendStateless("storeEvent") is fired after every successful save, no payload structure — the client just reacts to the event ("a save happened"). We chose structured JSON {type, fromEtag, toEtag} because we currently only emit on conflict and want to convey
   the reason. Both are valid; theirs is simpler, ours is more informative.

Where their context makes the comparison apples-to-oranges

8. No 412 / external-write story. Their canonical store is the Y.Doc blob behind OpenProject's REST API, which only Hocuspocus ever writes. There's no curl-PUT scenario, no If-Match, no version-history sidestep. They simply don't have to solve the conflict problem we have, because their data isn't reachable by
   other writers. If we adopted CRDT-as-canonical storage in OpenCloud, the markdown sidecar would still be writable by anyone, but the collab state would be safe — we'd only need conflict handling on the markdown derivative, not the live document.

9. They have an "OpenProject document" abstraction. Their _links.update presence is what tells them whether the user can edit (readonly). OpenCloud's WebDAV PROPFIND has a different permission model. Not better/worse, just different.

My takeaway for our concept

The two changes that would most reduce our complexity, in order of bang-per-buck:

- Migrate to @tiptap/server-util-style headless (if/when tiptap ships one) or store the Y.Doc blob as a sidecar. Either eliminates the entire DOM polyfill block + the markdown round-trip risk + the schema-parity dance. The "sidecar" version doesn't require a new tiptap library — it requires an OpenCloud-side
  convention (e.g. write foo.md and .opencloud/collab/foo.md.yjs) and accepting that markdown-only consumers see "snapshots" rather than live collaboration state. This is the single change that would clean up the most of our current server code.
- Upgrade to Hocuspocus 3.x and use onTokenSync. Hocuspocus 3.x's Extension class API is cleaner, onTokenSync lets us swap tokens without reconnects, and beforeHandleMessage gives us per-message authorization decisions we currently don't have. Cost: minor API surface changes in our server.ts. Not urgent.

Things I'd not copy verbatim:

- The encrypted-token-with-shared-secret model. It's slick for OpenProject's case because they already proxy auth at the application layer, but for us it would mean OpenCloud growing a hocuspocus-aware token-mint endpoint. Standard JWT/JWKS is more boring but more decoupled.
- Per-message token expiry enforcement. We can borrow the beforeHandleMessage hook for a softer version (e.g., warn but don't close) once we move to 3.x, but force-closing every connection mid-edit when a token rolls over would be a worse UX than our current "let the open socket live, re-auth on reconnect".
