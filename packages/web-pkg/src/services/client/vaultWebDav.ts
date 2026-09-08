import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { WebDAV } from '@opencloud-eu/web-client/webdav'
// Import from the specific store / helper modules rather than the big
// `composables` and `piniaStores` barrels: this file is pulled in from the
// services layer, and re-entering those barrels (which the root index exports
// before `services`) creates an evaluation cycle that leaves unrelated
// composable exports temporarily undefined.
import { useExtensionRegistry } from '../../composables/piniaStores/extensionRegistry'
import { getVaultClaim, resolveVaultEngine } from '../../helpers/vault'
import {
  applyVaultFromServer,
  toVaultServerPath,
  toVaultServerPathForWrite
} from '../../helpers/vaultTranslate'
import { encryptVaultPath } from '../../helpers/vaultEngine'
import { streamToArrayBuffer } from '../../helpers/streams'

/**
 * Wrap a WebDAV client so vault translation happens transparently on
 * every call: clear-text paths are encrypted on the way to the server, and the
 * encrypted names that come back are decrypted (and flagged) before any caller
 * sees them. Callers keep using `clientService.webdav` with clear-text paths and
 * never have to resolve a vault engine themselves.
 *
 * The wrapper is a strict pass-through whenever a path isn't inside a vault: the
 * sync `getVaultClaim` pre-check short-circuits before any async work, so the
 * 99% non-vault calls are byte-identical to the undecorated client. Only when a
 * path actually belongs to a vault do we resolve the engine and translate.
 *
 * Scope: every webdav method that carries a path or content - listFiles,
 * getFileInfo, createFolder, deleteFile, moveFiles, copyFiles,
 * restoreFileVersion, setProperties, and the content methods getFileContents /
 * putFileContents (which add a body transform, decryptContent / encryptContent,
 * on top of the path one).
 *
 * What the decorator genuinely cannot reach is anything that doesn't ride the
 * webdav client at all: signed-URL downloads (getFileUrl returns a URL, not
 * bytes), the uppy/tus upload queue, and the delete/paste/restore web workers
 * (their own client instance). Those keep their own vault handling.
 *
 * Also out of scope: getPathForFileId / listFileVersions take only a fileId
 * (no space), so the wrapper can't resolve the vault engine to decrypt the
 * returned server path. A fileId deep-link into a vault therefore resolves to
 * the encrypted path (correctness only, no leak). The proper fix is the
 * per-user vault registry that will replace `.vault`-suffix detection; until
 * then this is a known limitation.
 */
export function createVaultWebDav(inner: WebDAV): WebDAV {
  function registry() {
    return useExtensionRegistry()
  }

  const toServerPath = (space: SpaceResource, path: string | undefined) =>
    toVaultServerPath(registry(), space, path)

  const toServerPathForWrite = (space: SpaceResource, path: string | undefined) =>
    toVaultServerPathForWrite(registry(), space, path)

  const fromServer = (space: SpaceResource, resources: Array<Resource | undefined | null>) =>
    applyVaultFromServer(registry(), space, resources)

  return {
    ...inner,

    async listFiles(space, fileInfo = {}, options) {
      const path = await toServerPath(space, fileInfo?.path)
      const result = await inner.listFiles(space, { ...fileInfo, path }, options)
      await fromServer(space, [result?.resource, ...(result?.children ?? [])])
      return result
    },

    async getFileInfo(space, resource = {}, options) {
      const path = await toServerPath(space, resource?.path)
      const result = await inner.getFileInfo(space, { ...resource, path }, options)
      await fromServer(space, [result])
      return result
    },

    async createFolder(space, options) {
      // Only the path-based form carries a clear-text path to translate; the
      // (unused) name-based form passes through. fetchFolder may resolve no
      // resource, which fromServer simply skips.
      const path = await toServerPathForWrite(space, options?.path)
      const result = await inner.createFolder(space, { ...options, path })
      await fromServer(space, [result])
      return result
    },

    async deleteFile(space, { path, ...opts }) {
      return inner.deleteFile(space, { path: await toServerPathForWrite(space, path), ...opts })
    },

    async moveFiles(sourceSpace, source, targetSpace, target, options) {
      return inner.moveFiles(
        sourceSpace,
        { ...source, path: await toServerPathForWrite(sourceSpace, source?.path) },
        targetSpace,
        { ...target, path: await toServerPathForWrite(targetSpace, target?.path) },
        options
      )
    },

    async copyFiles(sourceSpace, source, targetSpace, target, options) {
      return inner.copyFiles(
        sourceSpace,
        { ...source, path: await toServerPathForWrite(sourceSpace, source?.path) },
        targetSpace,
        { ...target, path: await toServerPathForWrite(targetSpace, target?.path) },
        options
      )
    },

    async restoreFileVersion(space, resource, versionId, opts) {
      return inner.restoreFileVersion(
        space,
        { ...resource, path: await toServerPathForWrite(space, resource?.path) },
        versionId,
        opts
      )
    },

    async setProperties(space, resource, properties, opts) {
      return inner.setProperties(
        space,
        { ...resource, path: await toServerPathForWrite(space, resource?.path) },
        properties,
        opts
      )
    },

    async getFileContents(space, resource, options = {}) {
      const path = resource?.path
      if (!path || !getVaultClaim(useExtensionRegistry(), space, path)) {
        return inner.getFileContents(space, resource, options)
      }
      const engine = await resolveVaultEngine(useExtensionRegistry(), space, path)
      if (!engine) {
        return inner.getFileContents(space, resource, options)
      }
      // Fetch the ciphertext blob as raw bytes, run it through the engine, then
      // hand the caller back the response type it actually asked for (text by
      // default) - exactly as if it had read a plain file.
      const result = await inner.getFileContents(
        space,
        { ...resource, path: await encryptVaultPath(engine, path) },
        { ...options, responseType: 'arraybuffer' }
      )
      const plaintext = new Uint8Array(
        await streamToArrayBuffer(engine.decryptContent(new Blob([result.body]).stream()))
      )
      const responseType = options.responseType
      let body: unknown
      if (!responseType || responseType === 'text') {
        body = new TextDecoder().decode(plaintext)
      } else if (responseType === 'json') {
        body = JSON.parse(new TextDecoder().decode(plaintext))
      } else if (responseType === 'blob') {
        body = new Blob([plaintext])
      } else {
        body = plaintext.buffer
      }
      return { ...result, body }
    },

    async putFileContents(space, options) {
      const path = options?.path
      const claim = path && getVaultClaim(useExtensionRegistry(), space, path)
      if (!claim) {
        return inner.putFileContents(space, options)
      }
      const engine = await resolveVaultEngine(useExtensionRegistry(), space, path)
      if (!engine) {
        // Fail closed: writing clear-text content/name into a locked vault would
        // corrupt it. Unreachable through the UI (the unlock gate runs first).
        throw new Error(`Refusing to write into the locked vault "${claim.vaultRoot}"`)
      }
      // Encrypt the content (always - even empty content has to become a valid
      // rclone-crypt blob with header bytes, or it won't decrypt later) and the
      // path before the PUT, then decrypt the resource that comes back.
      const content = await streamToArrayBuffer(
        engine.encryptContent(new Blob([options.content ?? '']).stream())
      )
      const result = await inner.putFileContents(space, {
        ...options,
        path: await encryptVaultPath(engine, path),
        content
      })
      await fromServer(space, [result])
      return result
    }
  }
}
