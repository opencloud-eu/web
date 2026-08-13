import { SpaceResource } from '@opencloud-eu/web-client'
import { ExtensionMarker, findExtensionRoot, isContentTypeSpace } from '@opencloud-eu/web-pkg'

/**
 * Name extension a vault folder of this scheme carries (`Project archive.vault`).
 */
export const VAULT_EXTENSION = 'vault'

/**
 * Content type a vault space of this scheme carries in its
 * `@libre.graph.contentType` drive property.
 */
export const VAULT_CONTENT_TYPE = 'application/vnd.opencloud.vault'

export const VAULT_MARKER: ExtensionMarker = {
  extension: VAULT_EXTENSION,
  contentType: VAULT_CONTENT_TYPE
}

/** Whether a whole space is a vault of this scheme. */
export function isVaultDrive(space: SpaceResource | undefined): boolean {
  return isContentTypeSpace(space, VAULT_CONTENT_TYPE)
}

/** Vault root for a (space, path), or null when neither marks a vault. */
export function vaultRootForSpace(space: SpaceResource, path: string | undefined): string | null {
  return findExtensionRoot(space, path, VAULT_MARKER)
}
