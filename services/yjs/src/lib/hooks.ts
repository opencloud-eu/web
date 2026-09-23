import type {
  afterUnloadDocumentPayload,
  connectedPayload,
  Document,
  Extension,
  onDisconnectPayload,
  onStatelessPayload
} from '@hocuspocus/server'
import { deterministicColor } from './color.ts'
import { DeniedReason, isRefusal, refuse } from './errors.ts'
import { encodeIdentityMessage } from './identity.ts'
import {
  MAX_DOCUMENT_NAME_LENGTH,
  probeFileAccess,
  validateTokenAgainstOpenCloud
} from './graph.ts'
import { createGrantRegistry, GrantMessage, parseGrantRequest, SEED_GRANT } from './grants.ts'

export const HEALTH_ENDPOINT_PATH = '/healthz/ready'

export type YjsUser = {
  id: string
  displayName: string
  color: string
}

export type YjsContext = {
  readOnly: boolean
  user: YjsUser
}

/** Live view on the lifecycle flags owned by the server module. */
export type ServerLifecycle = {
  isReady: () => boolean
  isShuttingDown: () => boolean
}

export type HookOptions = {
  opencloudUrl: string
  lifecycle: ServerLifecycle
}

type RequestPayload = {
  request: { url?: string }
  response: {
    writeHead: (status: number, headers: Record<string, string>) => unknown
    end: (body: string) => unknown
  }
}

type UpgradePayload = {
  socket: { destroy: () => void }
}

export type AuthenticatePayload = {
  token: string
  documentName: string
  connectionConfig: { readOnly: boolean }
}

type AwarenessPayload = {
  states: Map<number, Record<string, any>>
  context?: Partial<YjsContext>
  connection?: { context?: Partial<YjsContext> }
}

/**
 * The handshake's authentication and authorization: who is connecting, and
 * what they may do to this file. Refusals carry a `DeniedReason`.
 */
export async function authenticate(
  opencloudUrl: string,
  { token, documentName, connectionConfig }: AuthenticatePayload
): Promise<YjsContext> {
  if (!token) {
    throw refuse(DeniedReason.TokenInvalid, 'no token in the handshake')
  }
  if (documentName.length > MAX_DOCUMENT_NAME_LENGTH) {
    throw refuse(DeniedReason.MalformedDocument, `documentName too long (${documentName.length})`)
  }

  const me = await validateTokenAgainstOpenCloud(opencloudUrl, token)
  const id = me.id ?? me.userPrincipalName ?? me.mail ?? 'unknown'

  // Authorization: does this user have the file at all, and may they write it.
  const access = await probeFileAccess(opencloudUrl, token, documentName)

  const readOnly = !access.canWrite

  // Writes are gated on `connectionConfig.readOnly`, which Hocuspocus reads
  // when it builds the Connection. The hook's return value only feeds
  // `context`, so setting it there would leave the connection writable.
  connectionConfig.readOnly = readOnly

  console.log(
    `[onAuthenticate] document=${JSON.stringify(documentName)} user="${me.displayName ?? id}" ` +
      `id="${id}" readOnly=${readOnly}`
  )
  return {
    readOnly,
    user: {
      id,
      displayName: me.displayName ?? me.userPrincipalName ?? id,
      color: deterministicColor(id)
    }
  }
}

export function createHooks({ opencloudUrl, lifecycle }: HookOptions) {
  const grants = createGrantRegistry()

  /**
   * Hand the seed grant to another writer in the room. Called when the holder
   * leaves, which may have happened before it seeded.
   */
  function passSeedGrantOn(document: Document, documentName: string): void {
    const writer = document.getConnections().find((connection) => !connection.readOnly)
    if (!writer) {
      return
    }
    grants.grantTo(documentName, SEED_GRANT, writer.socketId)
    writer.sendStateless(GrantMessage.Granted + SEED_GRANT)
  }

  return {
    async onRequest({ request, response }: RequestPayload): Promise<void> {
      const requestPath = request.url?.split('?')[0] ?? '/'
      if (requestPath !== HEALTH_ENDPOINT_PATH) {
        return
      }

      const isReady = lifecycle.isReady() && !lifecycle.isShuttingDown()
      response.writeHead(isReady ? 200 : 503, { 'Content-Type': 'text/plain' })
      response.end(isReady ? 'ok' : 'shutting down')
      // Hocuspocus convention: throwing (any value) signals that the request/upgrade
      // has been fully handled and should not be processed further by the framework.
      throw undefined
    },

    async onUpgrade({ socket }: UpgradePayload): Promise<void> {
      if (!lifecycle.isShuttingDown()) {
        return
      }
      socket.destroy()
      // Reject upgrade during shutdown by throwing
      throw undefined
    },

    async onAuthenticate(payload: AuthenticatePayload): Promise<YjsContext> {
      try {
        return await authenticate(opencloudUrl, payload)
      } catch (e) {
        const doc = JSON.stringify(payload.documentName)
        if (isRefusal(e)) {
          const log = e.reason === DeniedReason.ServerError ? console.error : console.warn
          log(`[onAuthenticate] refused document=${doc} reason=${e.reason}: ${e.message}`)
          throw e
        }
        console.error(`[onAuthenticate] unexpected error document=${doc}:`, e)
        throw refuse(DeniedReason.ServerError, e instanceof Error ? e.message : String(e))
      }
    },

    async onConnect({
      documentName,
      requestHeaders
    }: {
      documentName: string
      requestHeaders: Headers
    }): Promise<void> {
      const origin = requestHeaders.get('origin') ?? '-'
      console.log(`[onConnect] document=${JSON.stringify(documentName)} origin=${origin}`)
    },

    /**
     * Hand the connection its own identity, see `identity.ts`. Runs after
     * authentication, so the context is populated.
     */
    async connected({ connection, context }: connectedPayload<YjsContext>): Promise<void> {
      const user = context?.user ?? connection.context?.user
      if (!user) {
        return
      }
      connection.sendStateless(encodeIdentityMessage(user))
    },

    async onDisconnect({
      documentName,
      clientsCount,
      socketId,
      document
    }: onDisconnectPayload<YjsContext>): Promise<void> {
      console.log(
        `[onDisconnect] document=${JSON.stringify(documentName)} remaining=${clientsCount}`
      )
      // Only the seed grant moves on. A recovery needs the fresh body only its
      // requester holds, so the next client that asks gets it instead.
      if (grants.release(documentName, socketId).includes(SEED_GRANT)) {
        passSeedGrantOn(document, documentName)
      }
    },

    /**
     * Safety net only: the holder's `onDisconnect` has normally released the
     * grants by the time the room unloads.
     */
    async afterUnloadDocument({ documentName }: afterUnloadDocumentPayload): Promise<void> {
      grants.forget(documentName)
    },

    /**
     * Seeding and recovery arbitration, see `grants.ts`. The answer is
     * permission, not an instruction: the client still checks its own
     * document first, so a grant for a job that is already done costs nothing.
     */
    async onStateless({ connection, documentName, payload }: onStatelessPayload): Promise<void> {
      const key = parseGrantRequest(payload)
      if (key === null) {
        return
      }
      const granted = grants.request(documentName, key, connection.socketId, connection.readOnly)
      connection.sendStateless((granted ? GrantMessage.Granted : GrantMessage.Denied) + key)
    },

    /**
     * Anti-spoof identity stamp: before each inbound awareness update is
     * applied, overwrite the `user` field on every state in the update with
     * the authenticated identity from the connection's context.
     */
    async beforeHandleAwareness({ states, context, connection }: AwarenessPayload): Promise<void> {
      const user = context?.user ?? connection?.context?.user
      if (!user) {
        return
      }
      const canonical = {
        id: user.id,
        name: user.displayName,
        color: user.color
      }
      for (const state of states.values()) {
        state.user = canonical
      }
    }
  } satisfies Extension<YjsContext>
}
