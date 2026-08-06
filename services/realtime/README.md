# web-realtime-server

Realtime collaboration sidecar for OpenCloud Web. It runs a
[Hocuspocus](https://tiptap.dev/docs/hocuspocus) server that relays Yjs updates between clients
editing the same file.

The service is stateless. Documents are not persisted here, they are file-backed via WebDAV and
hydrated from the client. Every connection is authenticated and authorized against OpenCloud:

- the bearer token is validated against `/graph/v1.0/me`
- write access is derived from the effective permission actions on the file
- awareness states are re-stamped with the authenticated identity, so users cannot spoof each other

## Configuration

| Variable         | Default | Description                                                                   |
| ---------------- | ------- | ----------------------------------------------------------------------------- |
| `OPENCLOUD_URL`  | -       | Required. Base URL of the OpenCloud server, e.g. `https://cloud.example.com`  |
| `PORT`           | `1234`  | Port to listen on                                                             |
| `DEV_FAKE_TOKEN` | unset   | Dev only. Bypasses auth for a fixed token. Refused when `NODE_ENV=production` |

## Routing

The service listens for plain HTTP on `PORT` and upgrades to WebSocket. Where it sits is up to the
deployment: behind a reverse proxy on the OpenCloud host, on its own hostname, or reachable
directly.

Clients connect to the URL configured as `options.yjsServerUrl` in the web config. Realtime
collaboration is off while that option is unset.

Whatever sits in front must:

- forward WebSocket upgrades
- pass the `Authorization` header through unchanged, since the service validates the bearer token
  itself against OpenCloud
- not add its own authentication, which would replace or strip that header

The dev stack is one example: OpenCloud's own proxy forwards `/realtime` to the service, with the
route marked `unprotected` for the reasons above (see `dev/docker/opencloud/proxy.yaml`).

## Running

The sources are TypeScript and are run directly by Node's type stripping, so there is no build
step. Node 22.18 or newer is required.

Locally:

```sh
OPENCLOUD_URL=https://host.docker.internal:9200 pnpm --filter web-realtime-server start
```

As a container, built from the repository root:

```sh
docker build -f services/realtime/Dockerfile -t web-realtime-server .
```

The dev stack in `docker-compose.yml` builds and runs it as the `realtime` service.
