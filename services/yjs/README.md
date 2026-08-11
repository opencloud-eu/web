# opencloud-yjs-server

The Yjs server for OpenCloud. It runs a
[Hocuspocus](https://tiptap.dev/docs/hocuspocus) server that relays Yjs updates between clients
editing the same file.

The service persists nothing. Documents are file-backed via WebDAV and hydrated from the client.
Rooms still live in process memory, so all peers of a document must reach the same instance: run a
single instance, or shard by document with sticky routing. Peers split across instances silently
stop seeing each other, and their saves collide instead of merging.

Every connection is authenticated and authorized against OpenCloud:

- the bearer token is validated against `/graph/v1.0/me`
- write access is derived from the effective permission actions on the file
- awareness states are re-stamped with the authenticated identity, so users cannot spoof each other

## Configuration

| Variable         | Default      | Description                                                                  |
| ---------------- | ------------ | ---------------------------------------------------------------------------- |
| `OPENCLOUD_URL`  | -            | Required. Base URL of the OpenCloud server, e.g. `https://cloud.example.com` |
| `PORT`           | `1234`       | Port to listen on                                                            |
| `NODE_ENV`       | `production` | Set by the image. Must be `development` to allow `DEV_FAKE_TOKEN`            |
| `DEV_FAKE_TOKEN` | unset        | Dev only. Bypasses auth for a fixed token. Requires `NODE_ENV=development`   |

## Routing

The service listens for plain HTTP on `PORT` and upgrades to WebSocket. Where it sits is up to the
deployment: behind a reverse proxy on the OpenCloud host, on its own hostname, or reachable
directly.

Clients connect to the URL configured as `options.yjsServerUrl` in the web config. Collaborative
editing is off while that option is unset.

Whatever sits in front must:

- forward WebSocket upgrades
- not require authentication of its own

The second point is easy to get wrong. The bearer token does not travel in an `Authorization`
header: browsers cannot set headers on a WebSocket handshake, so it arrives in Hocuspocus' own
first message once the socket is already open. A proxy that demands an `Authorization` header
therefore rejects every connection before the service ever sees it - and the service validates the
token itself regardless.

The dev stack is one example: OpenCloud's own proxy forwards `/yjs` to the service, with the
route marked `unprotected` for exactly that reason (see `dev/docker/opencloud/proxy.yaml`).

## Running

The sources are TypeScript and are run directly by Node's type stripping, so there is no build
step. Node 22.18 or newer is required.

The dev stack in `docker-compose.yml` builds and runs it as the `yjs` service, and mounts
`src/` read-only - so editing the server needs a `docker restart web-yjs-1`, not a rebuild.
Running it on the host instead needs an `OPENCLOUD_URL` whose TLS certificate the host trusts; the
dev setup's self-signed Traefik certificate does not qualify, which is why the container gets
`NODE_TLS_REJECT_UNAUTHORIZED=0`.

As a container, built from the repository root:

```sh
docker build -f services/yjs/Dockerfile -t opencloud-yjs-server .
```
