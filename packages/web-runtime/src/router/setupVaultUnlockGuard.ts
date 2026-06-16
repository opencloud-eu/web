import { Router } from 'vue-router'
import { watch } from 'vue'
import {
  ClientService,
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
 * route that doesn't need user-context anyway - public links etc. resolve
 * their own context first, and the vault guard kicks in afterwards if the
 * target lives inside a vault).
 *
 * Receives the `clientService` because the guard runs outside of a component
 * setup context (so `useClientService()`'s `inject` wouldn't resolve). It's
 * needed to lazy-load mount-point (share) spaces, see below.
 */
export const setupVaultUnlockGuard = (router: Router, clientService: ClientService) => {
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

    let space = spacesStore.spaces.find(
      (s) => driveAliasAndItem === s.driveAlias || driveAliasAndItem.startsWith(`${s.driveAlias}/`)
    )

    const isShareSpace =
      driveAliasAndItem.startsWith('share/') || driveAliasAndItem.startsWith('ocm-share/')

    if (!space && isShareSpace && to.query?.shareId) {
      // Share spaces are loaded as mount-point spaces, which we only fetch on
      // demand (it's expensive). `spacesInitialized` doesn't cover them, so we
      // trigger the lazy load explicitly here. `loadMountPoints` is idempotent
      // and early-returns once `mountPointsInitialized` is set.
      if (!spacesStore.mountPointsInitialized) {
        await spacesStore.loadMountPoints({ graphClient: clientService.graphAuthenticated })
      }

      // Find a matching mount point for the given share id and create a share space.
      const mountPoint = spacesStore.spaces.find((s) => s.root?.remoteItem?.id === to.query.shareId)
      if (!mountPoint) {
        return true
      }

      const driveAliasPrefix = driveAliasAndItem.startsWith('ocm-share/') ? 'ocm-share' : 'share'
      space = spacesStore.createShareSpace({
        driveAliasPrefix,
        id: mountPoint.root?.remoteItem?.id,
        shareName: mountPoint.name
      })
    }

    if (!space) return true
    const path = '/' + driveAliasAndItem.slice(space.driveAlias.length).replace(/^\/+/, '')

    // Cheap, sync gate first: is this path even inside a claimed vault that
    // has an unlock route? Every non-vault navigation (the vast majority)
    // returns here, without the async engine resolution or a second registry
    // walk.
    const claim = getVaultClaim(extensionRegistry, space, path)
    if (!claim?.unlockRoute) return true

    // It's a claimed vault with an unlock route - let it through only if it's
    // already unlocked (an engine resolves), otherwise redirect to unlock.
    const engine = await resolveFolderVault(extensionRegistry, space, path)
    if (engine) return true

    return {
      ...claim.unlockRoute,
      query: { ...(claim.unlockRoute.query || {}), redirectUrl: to.fullPath }
    }
  })
}
