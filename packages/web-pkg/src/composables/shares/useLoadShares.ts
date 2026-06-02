import {
  call,
  isCollaboratorShare,
  isIncomingShareResource,
  isLinkShare,
  isPersonalSpaceResource,
  isProjectSpaceResource,
  isShareSpaceResource,
  Resource,
  ShareRole,
  SpaceResource
} from '@opencloud-eu/web-client'
import { computed, ref, unref } from 'vue'
import { useTask } from 'vue-concurrency'
import { useClientService } from '../clientService'
import {
  useAppsStore,
  useConfigStore,
  useResourcesStore,
  useSharesStore,
  useSpacesStore
} from '../piniaStores'
import { useActiveLocation, useRouter } from '../router'
import {
  isLocationSharesActive,
  isLocationSpacesActive,
  isLocationCommonActive
} from '../../router'
import { ListPermissionsSpaceRootSelectEnum } from '@opencloud-eu/web-client/graph/generated'
import PQueue from 'p-queue'
import { useIsAppActive } from '../actions'

export const useLoadShares = () => {
  const clientService = useClientService()
  const configStore = useConfigStore()
  const sharesStore = useSharesStore()
  const spacesStore = useSpacesStore()
  const resourcesStore = useResourcesStore()
  const appsStore = useAppsStore()
  const router = useRouter()
  const isAppActive = useIsAppActive()

  const availableInternalShareRoles = ref<ShareRole[]>([])
  const availableExternalShareRoles = ref<ShareRole[]>([])

  const isSharedWithMeLocation = useActiveLocation(isLocationSharesActive, 'files-shares-with-me')
  const isSharedWithOthersLocation = useActiveLocation(
    isLocationSharesActive,
    'files-shares-with-others'
  )
  const isSharedViaLinkLocation = useActiveLocation(isLocationSharesActive, 'files-shares-via-link')
  const isProjectsLocation = isLocationSpacesActive(router, 'files-spaces-projects')
  const isFavoritesLocation = useActiveLocation(isLocationCommonActive, 'files-common-favorites')
  const isSearchLocation = useActiveLocation(isLocationCommonActive, 'files-common-search')

  const isShareLocation = computed(() => {
    return (
      unref(isSharedWithMeLocation) ||
      unref(isSharedWithOthersLocation) ||
      unref(isSharedViaLinkLocation)
    )
  })
  const isFlatFileList = computed(() => {
    return (
      unref(isShareLocation) ||
      unref(isSearchLocation) ||
      unref(isFavoritesLocation) ||
      unref(isAppActive)
    )
  })

  const loadSharesTask = useTask(function* (
    signal,
    {
      space,
      resource,
      updateStore = true
    }: { space: SpaceResource; resource: Resource; updateStore?: boolean }
  ) {
    sharesStore.setLoading(true)
    sharesStore.removeOrphanedShares()

    const { collaboratorShares: collaboratorCache, linkShares: linkCache } = sharesStore
    const client = clientService.graphAuthenticated.permissions

    let driveId = space?.id
    if (isShareSpaceResource(space)) {
      const matchingMountPoint = yield* call(
        spacesStore.getMountPointForSpace({
          graphClient: clientService.graphAuthenticated,
          space,
          signal
        })
      )
      if (matchingMountPoint) {
        driveId = matchingMountPoint.root.remoteItem.rootId
      }
    }

    // load direct shares
    const { shares, allowedRoles } = yield* call(
      client.listPermissions(driveId, resource.fileId, sharesStore.graphRoles, {}, { signal })
    )

    const loadedCollaboratorShares = shares.filter(isCollaboratorShare)
    const loadedLinkShares = shares.filter(isLinkShare)

    const rolesArray = Object.values(sharesStore.graphRoles)
    availableInternalShareRoles.value =
      allowedRoles?.map((r) => {
        return {
          ...r,
          icon: rolesArray.find((role) => role.id === r.id)?.icon
        }
      }) || []

    // load external share roles
    if (appsStore.isAppEnabled('open-cloud-mesh')) {
      const { allowedRoles } = yield* call(
        client.listPermissions(
          driveId,
          resource.fileId,
          sharesStore.graphRoles,
          {
            filter: `@libre.graph.permissions.roles.allowedValues/rolePermissions/any(p:contains(p/condition, '@Subject.UserType=="Federated"'))`,
            select: [ListPermissionsSpaceRootSelectEnum.LibreGraphPermissionsRolesAllowedValues]
          },
          { signal }
        )
      )

      availableExternalShareRoles.value =
        allowedRoles?.map((r) => {
          return {
            ...r,
            icon: rolesArray.find((role) => role.id === r.id)?.icon
          }
        }) || []
    }

    // use cache for indirect shares
    const useCache = !unref(isFlatFileList) && !unref(isProjectsLocation)
    if (useCache) {
      collaboratorCache.forEach((share) => {
        if (loadedCollaboratorShares.some((s) => s.id === share.id)) {
          return
        }

        loadedCollaboratorShares.push({ ...share, indirect: true })
      })

      linkCache.forEach((share) => {
        if (loadedLinkShares.some((s) => s.id === share.id)) {
          return
        }

        loadedLinkShares.push({ ...share, indirect: true })
      })
    }

    if (isLocationCommonActive(router, 'files-common-search')) {
      yield resourcesStore.loadAncestorMetaData({
        folder: unref(resource),
        space,
        client: clientService.webdav,
        signal
      })
    }

    // gather all ancestors we need to load shares for (indirect shares, space members)
    const cachedIds = [...collaboratorCache, ...linkCache].map(({ resourceId }) => resourceId)
    const ancestorIds = Object.values(resourcesStore.ancestorMetaData)
      .filter(({ id, path }) => {
        if (id === resource.id || cachedIds.includes(id)) {
          // share already cached
          return false
        }
        if (isIncomingShareResource(resource)) {
          // incoming shares don't have ancestors because they are root elements themselves
          return false
        }
        if (isPersonalSpaceResource(space)) {
          // filter out personal space roots since they don't have shares
          return path !== '/'
        }
        return true
      })
      .map(({ id }) => id)

    if (
      unref(isFlatFileList) &&
      isProjectSpaceResource(space) &&
      !isProjectSpaceResource(resource)
    ) {
      // add project space to ancestors in flat file list where we don't have ancestors
      // to display space members in the sidebar
      ancestorIds.push(space.id)
    }

    const queue = new PQueue({
      concurrency: configStore.options.concurrentRequests.shares.list
    })

    const promises = [...new Set(ancestorIds)].map((id) => {
      return queue.add(() =>
        clientService.graphAuthenticated.permissions
          .listPermissions(driveId, id, sharesStore.graphRoles, {}, { signal })
          .then((result) => {
            const indirectShares = result.shares.map((s) => ({ ...s, indirect: true }))
            loadedCollaboratorShares.push(...indirectShares.filter(isCollaboratorShare))
            loadedLinkShares.push(...indirectShares.filter(isLinkShare))
          })
      )
    })

    yield Promise.allSettled(promises)
    if (updateStore) {
      sharesStore.setCollaboratorShares(loadedCollaboratorShares)
      sharesStore.setLinkShares(loadedLinkShares)
    }
    sharesStore.setLoading(false)
    return { collaboratorShares: loadedCollaboratorShares, linkShares: loadedLinkShares }
  }).restartable()

  return { loadSharesTask, availableInternalShareRoles, availableExternalShareRoles }
}
