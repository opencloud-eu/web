# Hocuspocus dev server

Dev-only Y.js / Hocuspocus backend for collaborative editing in the OpenCloud Web
tiptap editor. Brokers Y.Doc state between connected clients and persists each
document to OpenCloud via WebDAV.

This service is part of the docker-compose dev stack only. It is **not** meant
to run in production.

## What it does

- Verifies the client's OpenCloud access token (OIDC JWT) against the IdP JWKS.
- On the first connect to a room, fetches the file from OpenCloud via WebDAV and
  seeds a Y.Doc from the content.
- On change, debounces (`SAVE_DEBOUNCE_MS`, default 2 s) and writes the file back
  via WebDAV with `If-Match` for optimistic concurrency.
- On the last disconnect, flushes immediately.

## Scope

Markdown (`.md`) and plain-text files only for the first cut. Other content
types fall back to the editor's existing single-user flow.

## Schema parity warning

The tiptap extension versions in `package.json` must match the versions used
by `packages/web-pkg`. A mismatch can silently corrupt the Y.Doc state because
the ProseMirror node specs diverge.

## Env

| Var                            | Default                             | Notes                              |
| ------------------------------ | ----------------------------------- | ---------------------------------- |
| `PORT`                         | `9400`                              | Hocuspocus WebSocket port          |
| `OC_URL`                       | `https://host.docker.internal:9200` | OpenCloud base URL (WebDAV target) |
| `IDP_ISSUER`                   | same as `OC_URL`                    | OIDC issuer for JWT verification   |
| `SAVE_DEBOUNCE_MS`             | `2000`                              | WebDAV write-back debounce         |
| `NODE_TLS_REJECT_UNAUTHORIZED` | `0` (set by compose)                | **Dev only** — accept self-signed  |
