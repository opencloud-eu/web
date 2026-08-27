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

| Variable                   | Default          | Description                                                                  |
| -------------------------- | ---------------- | ---------------------------------------------------------------------------- |
| `OPENCLOUD_URL`            | -                | Required. Base URL of the OpenCloud server, e.g. `https://cloud.example.com` |
| `PORT`                     | `1234`           | Port to listen on                                                            |
| `SHUTDOWN_GRACE_PERIOD_MS` | `15000`          | Grace period for graceful shutdown before the process exits with code `1`    |
| `HEALTHCHECK_TIMEOUT_MS`   | `5000`           | Timeout used by the container healthcheck probe                              |
| `HEALTHCHECK_READY_PATH`   | `/healthz/ready` | Internal readiness endpoint path                                             |
| `HEALTHCHECK_HOST`         | `127.0.0.1`      | Host used by the container healthcheck probe                                 |

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

## Healthchecks and readiness

The image defines a Docker `HEALTHCHECK` that verifies:

1. the readiness endpoint (`GET /healthz/ready`) returns HTTP `200`
2. a WebSocket handshake to `ws://127.0.0.1:$PORT` succeeds

During normal operation `/healthz/ready` returns `200 ok`. Once shutdown starts, it flips to `503`
immediately.

## Graceful shutdown

The service installs a SIGTERM/SIGINT/SIGQUIT handler and performs graceful shutdown:

1. mark the instance as shutting down (readiness becomes `503`)
2. stop accepting new upgrade/authentication attempts
3. close existing WebSocket connections and let Hocuspocus unload/flush open documents
4. exit successfully when done

If shutdown does not complete within `SHUTDOWN_GRACE_PERIOD_MS`, the process exits with code `1`.

## Docker Compose defaults

In the repository `docker-compose.yml`:

- `yjs` uses `restart: unless-stopped`
- `yjs` uses `stop_grace_period: 20s` (5s buffer beyond the default 15s shutdown grace period)
- OpenCloud services declare `depends_on: yjs` with `condition: service_healthy`

Keep `stop_grace_period` higher than `SHUTDOWN_GRACE_PERIOD_MS` to allow the service time to
flush and close cleanly before Docker sends SIGKILL.

## Logging

The service writes operational logs to standard output/error (`stdout`/`stderr`) via Node's
`console` methods. No file logger is used.
