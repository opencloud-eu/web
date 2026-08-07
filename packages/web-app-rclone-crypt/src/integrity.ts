import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { WebDAV } from '@opencloud-eu/web-client/webdav'
import { FolderVaultEngine } from '@opencloud-eu/web-pkg'

/**
 * Name of the WebDAV property holding a vault's integrity token.
 *
 * Deliberately owned by this app rather than web-pkg. The generic layer only
 * knows that a vault *has* an opaque token, and never what it looks like or
 * where it is stored. This app's token is an rclone-crypt content blob that
 * gets stored as arbitrary metadata.
 *
 * The `ocrclone` prefix names this app and doubles as the namespace, so the
 * property is stored under `ocrclone/integrity-id`. It cannot live in the
 * `oc` namespace because the server answers unknown `oc` local names with
 * `404 Not Found`.
 */
export const INTEGRITY_ID_PROP = 'ocrclone:integrity-id'

/** Where a vault lives, i.e. everything needed to talk to it. */
export type VaultTarget = {
  webdav: WebDAV
  space: SpaceResource
  vaultRoot: string
}

export function integrityTokenOf(root: Resource | undefined): string | null {
  return (root?.extraProps?.[INTEGRITY_ID_PROP] as string) || null
}

/** Commit the vault to this engine's passphrase by storing its integrity token. */
export async function writeIntegrityToken(
  { webdav, space, vaultRoot }: VaultTarget,
  engine: FolderVaultEngine
): Promise<void> {
  const token = await engine.createIntegrityToken()
  await webdav.setProperties(
    space,
    { path: vaultRoot },
    { [INTEGRITY_ID_PROP]: token },
    { extraProps: [INTEGRITY_ID_PROP] }
  )
}

/** Encode raw ciphertext so it can live in an XML text node. */
export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

/** Counterpart to `toBase64`. Throws on input that isn't valid base64. */
export function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
