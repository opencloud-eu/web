# Realtime collaboration - manual test cases

Manual test pass for the `feat/realtime-collaboration` branch. Every case below
was executed by a local agent using the [Playwright CLI](https://github.com/microsoft/playwright-cli)
against a local stack.

## Environment

|          |                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------- |
| Stack    | `docker-compose.yml` at the repo root, `pnpm build` before each run                                                       |
| Frontend | `https://host.docker.internal:9200/`                                                                                      |
| Sidecar  | `realtime` container, logs via `docker compose logs realtime`                                                             |
| Users    | `alan` (owner), `mary` (editor), `margaret` (viewer), all password `demo`                                                 |
| Files    | `m5.md` (personal), `shared-folder/one.md` (folder share), `race-test.md` (direct share), `collab-test.md` (viewer share) |

Two things are worth knowing before running this by hand:

- **The sidecar log is the source of truth for authorization.** Each connect
  prints `[onAuthenticate] document="…" user="…" readOnly=…`. Check it rather
  than trusting the UI.
- **A room only lives while at least one client is connected.** `onDisconnect …
remaining=0` means the room was dropped and the next open rehydrates from
  disk. Several cases below depend on starting from an empty room.

---

## A. Editor basics

| #   | Case                        | Steps                                | Expected                                                                                    | Observed                                     |
| --- | --------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------- | -------------------------------------------- |
| A1  | Open, edit, save, persist   | Open `m5.md`, type, `Ctrl+S`, reload | Save button disabled on open, enabled when dirty, disabled after save; edit survives reload | pass - `A1-EDIT` present after reload        |
| A2  | File list intact after save | Close editor, inspect list           | All rows render, share badges preserved                                                     | pass - 4 items, badges intact                |
| A3  | In-app file switching       | Open 3 files in turn via the list    | Each shows its own body, no bleed                                                           | pass - `collab-test=327 m5=44 race-test=138` |
| A4  | Unsaved-changes guard       | Close editor while dirty             | Modal offers Cancel / Don't Save / Save                                                     | pass                                         |

> A4 note: peer edits arm your own guard too, so closing after a peer typed
> prompts even though you changed nothing. Known and documented in
> `collaboration.md`.

## B. Collaboration

| #        | Case                               | Steps                                                         | Expected                                                | Observed                                              |
| -------- | ---------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| B1       | Bidirectional sync                 | alan + mary in `shared-folder/one.md`, each types             | Both see both edits                                     | pass - both directions                                |
| B2       | Caret colour format                | Inspect caret style, check console                            | Hex colour, no "unsupported color format" warning       | pass - `border-color: #94d926`, 0 warnings both sides |
| B3       | Peer-save fan-out                  | alan saves                                                    | mary's dirty flag clears with no WebDAV call of her own | pass - both clean, 0 disconnects                      |
| B4 **R** | Save on a **directly shared** file | mary opens `race-test.md` from "Shared with me", edits, saves | Session survives the save                               | pass - no `onDisconnect`, room `21231925` stays       |
| B5       | Late joiner                        | alan opens a file mary already has open                       | Sees current room content, then live edits              | pass                                                  |

## C. Permissions

| #   | Case                     | Steps                                        | Expected                                                         | Observed                       |
| --- | ------------------------ | -------------------------------------------- | ---------------------------------------------------------------- | ------------------------------ |
| C1  | Viewer share             | margaret opens `collab-test.md`              | `contenteditable=false`, no save button, sidecar `readOnly=true` | pass                           |
| C2  | Editor share             | mary opens `race-test.md`                    | Editable, sidecar `readOnly=false`                               | pass                           |
| C3  | Project space, view only | alan opens a file in a space he cannot write | Read-only in UI, sidecar `readOnly=true`                         | pass - client and server agree |

> C1/C2 also exercise the tightened `WRITE_ACTION`: the sidecar now matches
> `libre.graph/driveItem/upload/create` exactly instead of a trailing-verb
> regex. If that check were wrong, C2 would flip to `readOnly=true`.

## D. Hydration

| #        | Case                              | Steps                                                               | Expected                         | Observed                    |
| -------- | --------------------------------- | ------------------------------------------------------------------- | -------------------------------- | --------------------------- |
| D1 **R** | Viewer enters an empty room first | Everyone leaves (`remaining=0`), margaret opens the file, then alan | alan hydrates and shows the file | pass - 5/5 cycles `OK(327)` |

> D1 is a coin flip by nature, so run it several times. The hydration election
> picks the lowest awareness `clientID`, and `clientID` is random per session. A
> read-only peer appears in awareness but never seeds - the server rejects its
> writes - so before the fix, whenever the viewer drew the lower id, the editor
> deferred to it and nobody hydrated: **a blank editor over a file that is not
> blank**, one keystroke from being saved over the real content. It reproduced
> 2 of 5 times. The fix is an `_oc_canSeed` awareness field the election filters
> on, stamped authoritatively by the sidecar.
>
> Failure signature to watch for: editor empty, save button _disabled_. The
> clean state is what makes it dangerous - it looks calm until you type.

## E. Save conflicts

| #        | Case                        | Steps                                                                                         | Expected                                                | Observed                                                                              |
| -------- | --------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| E1 **R** | External write, no peers    | Open `m5.md` alone, `curl -X PUT` the file from outside, edit, save                           | Conflict dialog, **one** PUT, external content survives | pass - `[PUT] => [412]`, not retried; disk still `EXTERNAL WRITE E1 - DESKTOP CLIENT` |
| E2       | Peer conflict               | alan + mary in `race-test.md`, mary saves, force alan's next PUT to 412, alan edits and saves | Silent refetch and retry, no dialog, both edits on disk | pass - `[412]` then `[204]`, disk ends `E2-PEER-SAVE E2-ALAN-AFTER`                   |
| E3       | Conflict, identical content | -                                                                                             | Silent reconcile, no retry                              | not staged by hand, see note                                                          |

Reproducing E1's external write:

```bash
curl -sk -u alan:demo -X PUT \
  "https://host.docker.internal:9200/dav/spaces/<driveId>/m5.md" \
  --data-binary "EXTERNAL WRITE E1 - DESKTOP CLIENT"
```

Forcing E2's conflict deterministically (the natural race is a ~200ms window):

```js
await page.route(
  (u) => u.pathname.includes('race-test.md'),
  async (route) => {
    if (route.request().method() === 'PUT' && !page.__f412) {
      page.__f412 = true
      return route.fulfill({ status: 412, body: 'forced' })
    }
    return route.continue()
  }
)
```

> **How to read PUT counts.** The request log is cumulative for the page
> session, so check the status codes, not the total. E1 is correct when the
> conflicting save shows exactly one `[PUT] => [412]` with no `[204]` after it.
>
> **E3** needs the disk content to equal what the client is about to write while
> the client is still dirty. That state is not reachable on demand from the UI,
> so it is covered by unit tests instead
> (`AppWrapper.spec.ts`, the `fresh.body === newContent` branch). It is safe
> regardless of who wrote the file: if the bytes already match, republishing
> them loses nothing.

## F. Resilience

| #   | Case                | Steps                                         | Expected                                                                            | Observed                                                     |
| --- | ------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| F1  | Sidecar unreachable | `docker compose stop realtime`, reload editor | Fallback message after ~10s, editing and saving still work, reconnect attempts stop | pass - message shown, save clean, ws attempts 4 → 4 over 25s |
| F2  | Sidecar returns     | `docker compose start realtime`, reload       | Reconnects, no error, offline save persisted                                        | pass - both users `readOnly=false`, no error message         |
| F3  | Public link         | Open a password-protected link anonymously    | Content renders read-only, **no** realtime connection                               | pass - 0 `onConnect`, `contenteditable=false`                |

> F1 checks two separate things. The message proves the connect timeout fired;
> the flat WebSocket attempt count proves `stopProvider` detached the provider
> rather than leaving it retrying. A growing count means updates are piling up
> in the websocket `messageQueue` that nothing drains.

## Not covered here

- **Non-collaborative apps** (pdf-viewer, preview) - the dev server has only
  `.md` files, so there was nothing to open. Covered by types and unit tests.
- **E3** - see the note above.
- **Concurrent autosave collision in the wild** - every peer autosaves on its
  own 120s timer, so a natural conflict needs two saves inside a ~200ms window.
  E2 forces the same code path deterministically instead of waiting for it.
