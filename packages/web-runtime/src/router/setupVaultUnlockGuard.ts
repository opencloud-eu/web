import { Router } from 'vue-router'
import { watch } from 'vue'
import {
  getVaultClaim,
  resolveFolderVault,
  useExtensionRegistry,
  useSpacesStore
} from '@opencloud-eu/web-pkg'

/**
 * Global navigation guard that intercepts any navigation aimed at a path
 * inside a folder-vault that's been claimed by a plugin but is not unlocked
 * yet. The plugin-defined unlock route gets the user's intended URL via
 * `redirectUrl` and pushes back there once unlocking succeeds.
 *
 * Runs after `setupAuthGuard`, so by the time we get here the auth context
 * is ready and the spaces store is populated (or we're navigating to a
 * route that doesn't need user-context anyway — public links etc. resolve
 * their own context first, and the vault guard kicks in afterwards if the
 * target lives inside a vault).
 */
export const setupVaultUnlockGuard = (router: Router) => {
  router.beforeEach(async (to) => {
    const driveAliasAndItem = to.params?.driveAliasAndItem as string | undefined
    if (!driveAliasAndItem) return true
    if (to.name === 'rclone-crypt-unlock') return true

    const spacesStore = useSpacesStore()
    const extensionRegistry = useExtensionRegistry()

    // On a hard reload this guard fires while the spaces store is still
    // initialising; without waiting we'd see an empty spaces list, fail to
    // match the target drive, and let the user into a vault path without an
    // unlock prompt. Wait until `spacesInitialized` flips before deciding.
    if (!spacesStore.spacesInitialized) {
      await new Promise<void>((resolve) => {
        const stop = watch(
          () => spacesStore.spacesInitialized,
          (initialised) => {
            if (initialised) {
              stop()
              resolve()
            }
          },
          { immediate: true }
        )
      })
    }

    const space = spacesStore.spaces.find(
      (s) => driveAliasAndItem === s.driveAlias || driveAliasAndItem.startsWith(`${s.driveAlias}/`)
    )
    if (!space) return true
    const path = '/' + driveAliasAndItem.slice(space.driveAlias.length).replace(/^\/+/, '')

    const engine = resolveFolderVault(extensionRegistry, space, path)
    if (engine) return true
    const claim = getVaultClaim(extensionRegistry, space, path)
    if (!claim?.unlockRoute) return true

    return {
      ...claim.unlockRoute,
      query: { ...(claim.unlockRoute.query || {}), redirectUrl: to.fullPath }
    }
  })
}
