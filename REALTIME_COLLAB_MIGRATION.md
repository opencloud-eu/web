# Plan: Realtime-Collab Migration — web-extensions PoC → opencloud-eu/web

## Context

The realtime collaboration PoC in `opencloud-eu/web-extensions` (PR #447, branch `feat/realtime-collaboration-poc`) is now functionally complete:

- `CollaborativeWrapper.vue` (in `web-app-codemirror`, reused by `web-app-tiptap`) provides Y.Doc + Awareness + optional Hocuspocus provider + stale-state recovery + app-version locking
- AppWrapper integration: wrapper emits `update:currentContent` so OC's Save action / Ctrl+S / unsaved-changes modal / auto-save loop all work transparently
- Local-only fallback when `applicationConfig.realtimeUrl` is unset: same wrapper, no provider, standalone Awareness, immediate hydration. The wrapper is the universal API for both modes.
- Tiptap on v3.20.4 aligned with web, custom Tiptap extension wires `@tiptap/y-tiptap`'s `yCursorPlugin` (upstream `@tiptap/extension-collaboration-cursor@3.0.0` still imports from `y-prosemirror` and is incompatible with v3 `@tiptap/extension-collaboration`)
- All 17/17 tests green (5 codemirror e2e + 4 tiptap e2e + 8 integration)

User now wants:
- Move both apps and the wrapper into the canonical `opencloud-eu/web` repo
- Refactor the existing `web-app-text-editor` so it uses the realtime API (the wrapper) exclusively — every editor instance goes through Y.Doc, whether or not a sidecar is reachable (local-mode handles the no-server case)
- Bring the Hocuspocus sidecar into web's docker-compose so the whole dev loop lives in one repo

User-clarified scope:
- **One canonical wrapper in web-pkg**, used by all three apps (codemirror, tiptap, refactored text-editor). The wrapper does NOT get forked. If integration churn is needed during the text-editor refactor, fork the `web-app-text-editor` package itself (not the wrapper) so we can iterate without fixing all call sites at once. Wrapper API stays single source of truth.
- **Y.Doc is always-on, no optional.** `useTextEditor` and friends always receive a Y.Doc; the wrapper's local-mode is the universal "no realtime backend" branch. Experimental but the wrapper just gained this capability and we want to see it carry the full text-editor surface.
- **App naming stays:** `web-app-codemirror` + `web-app-tiptap` as separate apps alongside the refactored `web-app-text-editor`.
- **E2E migration target:** Cucumber, reuse web's existing step helpers where possible.
- **Tiptap history under collab:** Y.Js Collaboration replaces Tiptap's StarterKit history extension with `yUndoPlugin` (from `@tiptap/y-tiptap` — Tiptap's fork of y-prosemirror). The feature isn't lost — undo/redo still work and become collab-aware (only undo your own edits). What changes is the wiring: `StarterKit.configure({ undoRedo: false })` (v3 name; was `history: false` in v2) and the `Collaboration` extension brings yUndoPlugin in automatically. Toolbar's undo/redo actions continue to call `editor.commands.undo()` / `redo()` and y-tiptap handles them. **One TS issue to clean up while we're there:** our current `StarterKit.configure({ history: false })` is the v2 name and emits a vue-tsc error (`'history' does not exist in type Partial<StarterKitOptions>`). Renaming to `undoRedo: false` clears it.

---

## Phase 0 — web-extensions cleanup (prereq, must land before migration starts)

While debugging the unit test for the etag-mirror behaviour I discovered a real bug in `CollaborativeWrapper.vue`: the `watchEffect((onCleanup) => { ... })` lifecycle re-runs whenever any tracked prop changes — including the `resource` prop update that AppWrapper fires after every save (via `resourcesStore.upsertResource`). Each AppWrapper save would tear down and rebuild the Y.Doc, losing peer state. The shared-file e2e doesn't catch it because the two peers' saves happen far apart in test time and the wrapper successfully re-hydrates from `currentContent`.

**Fix (mid-edit in the current working tree, broken intermediate state):**
- Replace `watchEffect((onCleanup) => { ... })` with `watch(sessionKey, (key, _, onCleanup) => { ... }, { immediate: true })`
- `sessionKey = computed(() => name && `${name}::${realtimeUrl ?? 'local'}`)` — only rebuilds when the actual session identity changes
- Vue's computed equality check ensures `setProps({ resource: newResource })` with same `id` doesn't re-fire the watch
- Remove the debug `console.error` lines I added during diagnosis
- Close the `watch` callback + outer block properly (current state has dangling brace + leftover body)

**Files:**
- `packages/web-app-codemirror/src/CollaborativeWrapper.vue` — finish refactor; remove debug logs
- `packages/web-app-codemirror/tests/unit/CollaborativeWrapper.spec.ts` — clean up the debug `console.log` I added in the etag-mirror test
- `packages/web-app-codemirror/tests/unit/CollaborativeWrapper.spec.ts` — **add a dedicated regression test** (separate from etag-mirror) that asserts: given a wrapper mounted with a resource, calling `setProps({ resource })` with a NEW resource object whose `id` is unchanged keeps the same `wrapper.vm.ydoc` instance reference (no rebuild). Tag the test name explicitly as "regression: does not rebuild Y.Doc when resource prop changes without identity change" so future readers see why it's there.

**Verification:**
- `pnpm vitest run tests/unit/CollaborativeWrapper.spec.ts` — all unit tests green (12 existing + 1 regression)
- `pnpm playwright test --project=codemirror-chromium` — 5/5 green (regression check on real e2e)
- `pnpm playwright test --project=tiptap-chromium` — 4/4 green
- `pnpm --filter=codemirror exec vitest run tests/integration/realtime-sync.spec.ts` — 8/8 green

**Commit:** one tight commit on `feat/realtime-collaboration-poc` summarising the bug fix + the new regression test. Push.

Only AFTER Phase 0 is committed and pushed do we start Phase 1.

---

## Phase 1 — Move CollaborativeWrapper into web-pkg

**Target:** make `CollaborativeWrapper` importable as `import { CollaborativeWrapper } from '@opencloud-eu/web-pkg'`.

**Files to create in `/home/domme/dev/sources/opencloud-eu/web/packages/web-pkg/`:**
- `src/components/Collaborative/CollaborativeWrapper.vue` — straight copy of the final web-extensions wrapper (post Phase 0). Reads `useAuthStore` from `../../composables/piniaStores/...` — verify the relative import path during the move.
- `src/components/Collaborative/types.ts` — the `CollaborativeAdapter` interface (currently at `packages/web-app-codemirror/src/types.ts`).
- `src/components/Collaborative/index.ts` — barrel export `{ default as CollaborativeWrapper } from ...` + `type CollaborativeAdapter`.
- Wire into `src/components/index.ts` so the named import works at the web-pkg root.

**Dependency audit (the user explicitly asked for thoroughness here — many deps belong in the consuming apps, not in web-pkg):**

Belongs in `web-pkg` (the wrapper uses them directly):
- `@hocuspocus/provider ^4.0.0` — runtime, the wrapper instantiates `HocuspocusProvider`
- `yjs ^13.6.0` — the wrapper imports `* as Y` for `new Y.Doc()`
- `y-protocols ^1.0.7` — the wrapper imports `Awareness` for the local-mode standalone
- `semver ^7.8.0` — the wrapper uses `semver/functions/{compare,valid}` for app-version handshake
- `@types/semver ^7.7.0` (devDep)

Does NOT belong in web-pkg (consumer-specific):
- `y-codemirror.next` — only the codemirror app's adapter uses this
- `@tiptap/y-tiptap` — only the tiptap-using apps' adapters / editor components use this. Already pulled transitively via `@tiptap/extension-collaboration` (which web-pkg DOES have via its `useTextEditor`). When the tiptap app or text-editor needs to import from `@tiptap/y-tiptap` directly (custom cursor extension), it lists its own direct dep — same pattern as the codemirror app.
- `@tiptap/markdown` — already in web-pkg via the markdown strategy; stays as-is
- `@hocuspocus/server` — sidecar only, not a web-pkg concern

This minimises web-pkg's surface — the wrapper is editor-agnostic, so adapter-bound deps stay with their consumers.

**No web-pkg test added in this phase** — unit test moves with the wrapper in Phase 5.

**Verification:**
- `pnpm install` in web root resolves cleanly with no peer warnings
- `pnpm --filter=@opencloud-eu/web-pkg build` succeeds (web-pkg's own build / type-check validates imports)

---

## Phase 2 — Move web-app-codemirror + web-app-tiptap into web/packages

**Per app (codemirror first as canonical, then tiptap):**

1. `cp -R` the package directory: `web-extensions/packages/web-app-codemirror` → `web/packages/web-app-codemirror`
2. Rewrite `src/App.vue` import of the wrapper from local `./CollaborativeWrapper.vue` → `from '@opencloud-eu/web-pkg'`
3. Delete the now-unused `src/CollaborativeWrapper.vue` + `src/types.ts` from the moved app directory
4. Update `package.json` to match web's app conventions (study `web-app-text-editor/package.json` first as template):
   - `@opencloud-eu/web-client` / `@opencloud-eu/web-pkg` become workspace siblings (peerDeps on `^7.0.0`, not devDeps — verify against the convention in other web apps)
   - Drop `@hocuspocus/provider` / `y-protocols` (now indirect via web-pkg)
   - Keep `y-codemirror.next` in codemirror app, keep `@tiptap/*` + `@tiptap/y-tiptap` + `@tiptap/markdown` in tiptap app — those are app-bound
5. Don't move tests yet — they go in Phase 5

**Files to update in web (not web-app-*):**
- `dev/docker/opencloud.apps.yaml` (or web's equivalent) — add `codemirror` / `tiptap` entries with `config.realtimeUrl: wss://host.docker.internal:9200/realtime`
- `docker-compose.yml` — add `./packages/web-app-codemirror/dist:/web/apps/codemirror` and `./packages/web-app-tiptap/dist:/web/apps/tiptap` volume mounts

**Verification:**
- `pnpm --filter=codemirror build` + `pnpm --filter=tiptap build` succeed
- OC sees both apps via `/config.json` `external_apps`
- Manual smoke test: open .md file, both apps appear in "Open with...", both load + edit + save

---

## Phase 3 — Hocuspocus sidecar in web's docker-compose

1. Copy `web-extensions/dev/docker/hocuspocus/` → `web/dev/docker/hocuspocus/` verbatim (Dockerfile, patches/, package.json, server.js)
2. Append the `hocuspocus` service to `web/docker-compose.yml` matching the web-extensions definition (same env vars, same Traefik labels, same volume for SQLite state)
3. Reuse the existing `host.docker.internal:9200` Traefik route — `/realtime` path-prefix routes to hocuspocus
4. Verify the sidecar's `OPENCLOUD_URL` env points to the web compose's OC service name (likely identical to web-extensions)
5. **Switch the etag probe in `server.js` from WebDAV HEAD to Graph API.** The current code uses WebDAV HEAD `/remote.php/dav/spaces/{itemId}` with the comment "Graph's /items endpoint is share-jail-only and 400s on personal drives" — verify whether that's still true against current OC Graph API. Likely the right endpoint is Graph `/v1.0/drives/{driveId}/items/{itemId}` which returns a DriveItem with `eTag`. If 400 still happens on personal drives, dig into why (might be v1beta1 vs v1.0, or missing query param). Goal: one consistent Graph call for permissions + etag, drop the WebDAV path from the sidecar.

**Verification:**
- `docker compose up -d hocuspocus` reachable at `wss://host.docker.internal:9200/realtime`
- Apps from Phase 2 connect successfully
- Integration spec (when ported in Phase 5) runs green against it

---

## Phase 4 — Refactor web-app-text-editor onto the wrapper

This is the biggest piece. `web-app-text-editor` currently uses `useTextEditor` from `web-pkg/editor`, which owns the Tiptap editor instance and handles content via strategies (markdown / html / plain-text / tiptap-json). AppWrapper handles load/save/dirty/etag.

The user's directive: every text-editor instance goes through the realtime API (the wrapper). Y.Doc is always-on. Local-mode handles the no-sidecar case transparently. UX (toolbar, slash commands, strategies, multi-content-type support) is preserved.

**Architectural shape:**
- `CollaborativeWrapper` is the outer shell. text-editor's `App.vue` sits inside it.
- `useTextEditor` is reworked to accept a **mandatory** Y.Doc parameter (NOT optional — the user explicitly wants this to always go through Y.Doc). When invoked, it includes the `Collaboration.configure({ document: ydoc, field: 'default' })` extension and disables StarterKit's built-in `undoRedo` (yUndoPlugin from y-tiptap takes over).
- The toolbar / slash commands keep operating on the Tiptap editor instance the composable returns — they don't know about Y.Doc, they just call `editor.commands.bold()` / `undo()` / `setLink()` / etc.
- Adapter per strategy: each existing strategy (markdown / html / plain-text / tiptap-json) gets a matching `CollaborativeAdapter` (`hydrate(ydoc, content)` deserializes via the strategy's own logic into the Tiptap editor bound to ydoc; `serialize(ydoc)` runs the strategy's serializer).
- text-editor's `App.vue` emits `update:currentContent` from the wrapper, AppWrapper drives the save (same pattern as our PoC apps).

**`CollaborativeAdapter` contract extension (important for performance):**
The PoC adapters spawn a headless Tiptap editor inside `serialize(ydoc)` (see `web-app-tiptap/src/adapters/tiptapMarkdown.ts`). That's cheap when StarterKit + Markdown are the only extensions, but for text-editor's 4 strategies × 10+ extensions (link, image, table, task-list, etc.) we'd be re-instantiating Tiptap on every debounced serialize. The contract should be extended to optionally accept the LIVE editor for `serialize`, falling back to headless when no editor is bound (e.g., during stale-recovery on a peer that has the doc but no UI):
```ts
export interface CollaborativeAdapter {
  hydrate(ydoc: Y.Doc, content: string): void | Promise<void>
  serialize(ydoc: Y.Doc, editor?: TiptapEditor): string | Promise<string>
  // ... rest unchanged
}
```
Wrapper's `scheduleEmit` passes the live editor when one is bound (the editor component exposes it via `defineExpose` or a slot). This change is BACKWARDS compatible (existing adapters ignore the new arg) and lands as part of Phase 4 — no need to touch the wrapper in Phase 1.

**What does NOT break going all-in collab:**
- Strategies, toolbar, slash commands, undo/redo, multi-extension setup — all preserved
- Single-user UX (no sidecar) — covered by the wrapper's local mode
- The existing 250ms debounce in `useTextEditor` becomes the wrapper's 300ms debounce — close enough, can be tuned via prop

**What could break if uncareful:**
- Custom extensions that mutate editor state outside of commands (rare; none in current StarterKit / web-pkg extension set)
- Schema drift between peers running different bundles — already handled by `enableContentCheck` + `onContentError` (the wrapper's app-version lock plus Tiptap's content-check is belt-and-braces)

**Forking discipline (per user clarification):**
- **DO NOT fork the wrapper.** It stays canonical in web-pkg.
- **CAN fork `web-app-text-editor`** if the refactor would otherwise need to touch every call-site of `useTextEditor` in web. The text-editor app may diverge during the migration, the rest of web stays on the old `useTextEditor` for now. Reconverge in a follow-up.

**Files to touch:**
- `packages/web-app-text-editor/src/App.vue` — wrap content rendering inside `CollaborativeWrapper`; emit `update:currentContent`; drop the manual content-loading scaffolding
- `packages/web-pkg/src/editor/composables/useTextEditor.ts` — require `ydoc: Y.Doc` parameter; add `Collaboration` to the extension list; flip `undoRedo: false` (was `history: false` in v2, now lint-warns) on `StarterKit.configure(...)`
- `packages/web-pkg/src/editor/composables/strategies/markdown.ts` — expose a `CollaborativeAdapter` companion that uses the existing `editor.getMarkdown()` / `setContent(content, { contentType: 'markdown' })` logic
- Same shape for `html.ts`, `plainText.ts`, `tiptapJson.ts` — see Open Q #1 about whether all four ship in this PR or just markdown
- `packages/web-app-text-editor/src/index.ts` — pass `applicationConfig.realtimeUrl` from AppWrapperRoute config through to the wrapper

**Local-mode safety net:** `CollaborativeWrapper` handles `realtimeUrl: null` → standalone Awareness, immediate hydrate, no provider. text-editor inherits this for free. Single-user mode works without a sidecar.

**Verification:**
- Existing text-editor unit tests still pass (the editor's public behaviour is unchanged: it receives content, emits content)
- Manual: open .md → toolbar works, formatting buttons apply, slash commands work, content saves, isDirty flips, Ctrl+S works, undo/redo works (via yUndoPlugin now), route-leave modal — all unchanged from user POV
- Open same .md in second tab → realtime sync works (new capability)
- Local mode (realtimeUrl unset for text-editor in apps.yaml): single-user, no sidecar needed

---

## Phase 5 — Tests in web

**Unit:**
- Move `tests/unit/CollaborativeWrapper.spec.ts` to `web/packages/web-pkg/tests/unit/components/CollaborativeWrapper.spec.ts`
- Adapt to web-test-helpers' `shallowMount` + `defaultPlugins()` pattern (see `web/packages/design-system/src/components/OcButton/OcButton.spec.ts` as template)
- web-pkg's vitest config (`web/tests/unit/config/vitest.config.ts`) already has happy-dom + Vue SFC support — no config additions needed

**Integration:**
- Move `realtime-sync.spec.ts` to `web/packages/web-pkg/tests/integration/realtime-sync.spec.ts` (new directory)
- Add an integration vitest config or extend the existing one to include this path
- Document `DEV_FAKE_TOKEN` setup in the integration test file for future maintainers

**E2E (Cucumber, per user clarification):**
- Convert the 9 Playwright specs from `web-extensions/packages/web-app-{codemirror,tiptap}/tests/e2e/*.spec.ts` into Cucumber features under `web/tests/e2e/cucumber/features/` + step definitions under `web/tests/e2e/cucumber/steps/`
- Reuse existing helpers from `web/tests/e2e/support/` (login, file upload, navigation) as much as possible — the existing `editor.ts` page object is probably the right starting template
- New feature files to create (one per scenario from our existing specs):
  - `collaboration/codemirror-open.feature` (load .md → connected → initial content visible)
  - `collaboration/codemirror-switching.feature` (route between two .md files keeps the wrapper clean)
  - `collaboration/codemirror-multi-user.feature` (admin + recipient on a shared space, cursor + CRDT propagation)
  - `collaboration/codemirror-save-back.feature` (type + Ctrl+S → persists via WebDAV)
  - `collaboration/codemirror-shared-file.feature` (owner + recipient share scenario)
  - same five for tiptap (or fewer — empty-file + open + switching + multi-user)
- Step definitions reuse existing `app-files/utils/editor.ts` patterns; add collab-specific helpers where needed (`when admin opens file in CodeMirror`, `then realtime status reads "connected"`, etc.)

---

## Resolved scope decisions

1. **All 4 text-editor content-type strategies get a `CollaborativeAdapter`.** markdown + html + plain-text + tiptap-json all become collab-capable in this PR. Risk: only markdown is validated by the PoC e2e suites. The other three need new manual smoke tests (load a sample of each type → verify hydrate / serialize round-trip preserves content; type something → verify update:currentContent emits the right serialized form; save → verify file content on disk matches what was typed). Phase 4 grows by 3 adapters + 3 smoke tests.

2. **Hocuspocus sidecar runs in web's CI woodpecker config.** Mirror the web-extensions woodpecker setup. The new `hocuspocus` service is started alongside the OC service in the e2e CI job; the Cucumber collab features (Phase 5) run against it. CI failure on collab regression becomes a hard signal instead of a silent local-only check.

3. **Cross-peer `AppWrapper.currentETag` fix is in scope.** AppWrapper's private `currentETag` ref needs a way to be updated from outside so peer-saved etags don't 412 the local user's next save. Approach: extend AppWrapper to `provide()` a setter (or `defineExpose` a writable ref) — the CollaborativeWrapper `inject()`s it and writes whenever `_oc_meta.etag` is updated via CRDT (signal from a peer save). Cleaner than emit (other editors that don't care about etag pay nothing). Concretely:
   - `web/packages/web-pkg/src/components/AppTemplates/AppWrapper.vue`: `provide('appWrapperEtagSync', { setCurrentETag: (etag: string) => { currentETag.value = etag } })` (or a similar named injection key — exported as a typed symbol from AppTemplates/types.ts)
   - `web/packages/web-pkg/src/components/Collaborative/CollaborativeWrapper.vue`: `const etagSync = inject(appWrapperEtagSync, null)` — when set and `_oc_meta.etag` changes via meta observer, call `etagSync.setCurrentETag(newEtag)`
   - Inject is `null` when CollaborativeWrapper is used standalone (outside an AppWrapper context) — the sync is a no-op, no regression
   - Adds one new test: peer A saves, peer B's AppWrapper `currentETag` updates without a refresh (Cucumber feature, Phase 5)

---

## Critical files referenced

- `web-extensions/packages/web-app-codemirror/src/CollaborativeWrapper.vue` — source (Phase 0 fix, then move in Phase 1)
- `web-extensions/packages/web-app-codemirror/src/types.ts` — adapter contract
- `web-extensions/packages/web-app-codemirror/tests/unit/CollaborativeWrapper.spec.ts` — unit suite (Phase 0 regression test, Phase 5 move)
- `web-extensions/dev/docker/hocuspocus/` — sidecar (Phase 3)
- `web/packages/web-pkg/src/components/AppTemplates/AppWrapper.vue` — host wrapper, integration target
- `web/packages/web-pkg/src/editor/composables/useTextEditor.ts` — text-editor's editor factory (Phase 4)
- `web/packages/web-pkg/src/editor/composables/strategies/markdown.ts` — strategy (Phase 4, adapter source)
- `web/packages/web-app-text-editor/src/App.vue` — text-editor entry (Phase 4)
- `web/tests/unit/config/vitest.config.ts` — web's vitest baseline (Phase 5)
- `web/packages/design-system/src/components/OcButton/OcButton.spec.ts` — Vue spec template to match
- `web/tests/e2e/support/objects/app-files/utils/editor.ts` — existing editor page object (Phase 5, Cucumber port)

---

## Future considerations / follow-ups (not in this PR)

1. **Proper config field for `realtimeUrl`.** Phase 2 ships an auto-derive fallback (`wss://{configStore.serverUrl}/realtime` when no per-app config is set). Long-term we want a first-class config option — likely in `web/config.json` `options.realtimeUrl` — that requires extending `OptionsConfigSchema` in `web-pkg/composables/piniaStores/config/types.ts`. Until then, convention does the job.

2. **Non-file collaborative rooms.** Right now the wrapper + sidecar assume every `documentName` is an OC file id (`<storageid>$<spaceid>!<opaqueid>`) and runs WebDAV/Graph permission checks against it. There are use cases for a room that has no file backing — ephemeral whiteboard-style collaboration, comment threads, etc. Idea: the sidecar treats `documentName` prefixes as a routing hint. `file_<composite-id>` → run the current ACL/etag probe path. `room_<arbitrary-id>` → no permission checks, no etag, no save loop. Wrapper would need to know about this distinction too (skip save when in room mode).

2. **File vs folder check in `onAuthenticate`.** Currently the sidecar's `probeFileAccess` runs WebDAV HEAD on `/remote.php/dav/spaces/{itemId}` and accepts any 200 response, including folders. A user could theoretically open a folder id in a collab editor and get an empty room (the editor would try to save back to a folder URL on every save — almost certainly errors, but ugly). Fix: check the Graph `/items/{itemId}` response's `folder` vs `file` discriminator, or `Resource-Type` PROPFIND, or `Content-Type` from a GET. Reject folders in `onAuthenticate`.

3. **Cross-peer `AppWrapper.currentETag` fix.** Already scoped into Phase 4.5 of the main plan — extending AppWrapper with an inject contract for peer-saved etags. Listed here as the cleanup that ties the local-mode + collab-mode etag stories together.

---

## Dev loop note (web vs web-extensions)

In the web repo the dev workflow uses `pnpm vite` (dev server with HMR) instead of building dist/ + docker volume-mounting like web-extensions does. Much simpler iteration loop: no `--mode development` builds, no docker compose restart dance, no manifest path caching to worry about. Prefer `pnpm vite` (or web's equivalent `pnpm dev`) for the Phase 1–4 work; only fall back to compose mounts if a specific compose-only scenario needs them (the Hocuspocus sidecar from Phase 3 still needs compose since it's a sibling service).

---

## Execution checklist

- [x] **Phase 0**: finish sessionKey watch refactor, add regression test for Y.Doc-rebuild bug, clean up debug logs, all unit + e2e + integration green, commit + push to `feat/realtime-collaboration-poc` — `ac85423` on web-extensions, 13/13 unit + 5/5 codemirror e2e + 4/4 tiptap e2e + 8/8 integration green
- [x] **Phase 1**: copy wrapper + adapter types into web-pkg, add only the truly shared deps (hocuspocus/provider, yjs, y-protocols, semver), exports — files at `packages/web-pkg/src/components/Collaborative/`, vue-tsc type-check green
- [x] **Phase 2**: moved both apps to `web/packages/web-app-{codemirror,tiptap}`, rewired imports to `@opencloud-eu/web-pkg`, slimmed package.json (peer deps for web-pkg/web-client/design-system, app-bound deps for codemirror/tiptap-specific bits, yjs + y-protocols for type-only adapter imports). Registered both in `dev/docker/opencloud.web.config.json` `apps[]`. Wrapper's `realtimeUrl` prop now three-state (`string` / `null` = force-local / `undefined` = derive from `configStore.serverUrl` + `/realtime` convention). vue-tsc green on both apps + web-pkg.
- [ ] **Phase 2.5**: extend `CollaborativeAdapter.serialize` to optionally accept an opaque `context` object (typed `unknown`, each adapter casts as needed — a typed `editor: TiptapEditor` argument makes no sense for the CodeMirror adapter). Editor components expose context via `defineExpose({ getAdapterContext() })`; wrapper grabs the value via template ref and passes it down to `serialize(ydoc, context)`. Tiptap exposes `{ editor: tiptapEditor }` so its adapter reuses the live editor instance — no more headless-editor spawn per debounced serialize. CodeMirror returns `undefined` (its `Y.Text.toString()` is already cheap). Backwards-compatible signature change. Drops the dominant per-keystroke cost for rich Tiptap setups before Phase 4 brings 4 strategies × many extensions online.
- [ ] **Phase 3**: copy hocuspocus sidecar into web compose; switch the sidecar's etag probe from WebDAV HEAD to Graph `/items/{id}` (consistent with the existing Graph permissions call; investigate the "personal-drive 400" mentioned in the original WebDAV-fallback comment)
- [ ] **Phase 4**: refactor web-app-text-editor onto wrapper; require Y.Doc in `useTextEditor`; flip `StarterKit` `undoRedo: false`; ship all 4 content-type adapters (markdown, html, plain-text, tiptap-json) with manual round-trip smoke tests for the three not in the PoC e2e; toolbar / slash commands stay
- [ ] **Phase 4.5**: extend AppWrapper with the etag-sync inject contract; wire CollaborativeWrapper to call it when `_oc_meta.etag` updates via CRDT; one new Cucumber scenario for the cross-peer flow
- [ ] **Phase 5**: migrate unit + integration tests, Cucumber-port the e2e suites with existing helpers where possible; add hocuspocus to web's woodpecker e2e CI job
- [ ] Smoke test full dev loop in web; commit per phase; PR against `opencloud-eu/web` main
