import { RouteLocationNormalized, Router } from 'vue-router'
import {
  ClientService,
  getSpaceForDriveAliasAndItem,
  getVaultClaim,
  queryItemAsString,
  resolveVaultEngine,
  useExtensionRegistry,
  useSpacesLoading,
  useSpacesStore,
  VaultClaim
} from '@opencloud-eu/web-pkg'
import { SpaceResource } from '@opencloud-eu/web-client'

/** Space-relative, absolute path a `driveAliasAndItem` points at within `space`. */
function spaceRelativePath(driveAliasAndItem: string, space: SpaceResource): string {
  return '/' + driveAliasAndItem.slice(space.driveAlias.length).replace(/^\/+/, '')
}

/** Whether a space-relative path is the vault root or below it. */
function isInsideVaultRoot(path: string, vaultRoot: string): boolean {
  if (vaultRoot === '/') {
    return true
  }
  return path === vaultRoot || path.startsWith(`${vaultRoot}/`)
}

/**
 * Where cancelling the unlock should return the user to. `from` only qualifies
 * if it's somewhere they can actually stay: not the unlock route itself, and
 * not inside the very vault we're locking them out of.
 */
function getCancelUrl(
  from: RouteLocationNormalized,
  space: SpaceResource,
  claim: VaultClaim
): string | undefined {
  if (!from.name || from.name === claim.unlockRoute?.name) {
    return undefined
  }
  const fromDriveAliasAndItem = from.params?.driveAliasAndItem as string | undefined
  if (
    fromDriveAliasAndItem &&
    (fromDriveAliasAndItem === space.driveAlias ||
      fromDriveAliasAndItem.startsWith(`${space.driveAlias}/`)) &&
    isInsideVaultRoot(spaceRelativePath(fromDriveAliasAndItem, space), claim.vaultRoot)
  ) {
    return undefined
  }
  return from.fullPath
}

/**
 * Global navigation guard that intercepts any navigation aimed at a path
 * inside a vault that's been claimed by a plugin but is not unlocked
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
  router.beforeEach(async (to, from) => {
    const driveAliasAndItem = to.params?.driveAliasAndItem as string | undefined
    if (!driveAliasAndItem) return true
    if (to.name === 'rclone-crypt-unlock') return true

    const spacesStore = useSpacesStore()
    const extensionRegistry = useExtensionRegistry()
    const { waitForSpaces } = useSpacesLoading()

    // Spaces need to be loaded for vaults to be claimed.
    await waitForSpaces()

    let space = getSpaceForDriveAliasAndItem(
      spacesStore.spaces,
      driveAliasAndItem,
      queryItemAsString(to.query?.fileId)
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
    const path = spaceRelativePath(driveAliasAndItem, space)

    // Cheap, sync gate first: is this path even inside a claimed vault that
    // has an unlock route? Every non-vault navigation (the vast majority)
    // returns here, without the async engine resolution or a second registry
    // walk.
    const claim = getVaultClaim(extensionRegistry, space, path)
    if (!claim?.unlockRoute) return true

    // It's a claimed vault with an unlock route - let it through only if it's
    // already unlocked (an engine resolves), otherwise redirect to unlock.
    const engine = await resolveVaultEngine(extensionRegistry, space, path)
    if (engine) return true

    // Where the user set off from, so cancelling the unlock returns them there
    // instead of somewhere merely adjacent to the vault.
    const cancelUrl = getCancelUrl(from, space, claim)

    return {
      ...claim.unlockRoute,
      query: {
        ...(claim.unlockRoute.query || {}),
        redirectUrl: to.fullPath,
        ...(cancelUrl && { cancelUrl })
      }
    }
  })
}
