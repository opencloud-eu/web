import { defineStore } from 'pinia'
import { computed, ref, unref } from 'vue'
import {
  buildShareSpaceResource,
  isMountPointSpaceResource,
  SpaceResource
} from '@opencloud-eu/web-client'
import { Graph } from '@opencloud-eu/web-client/graph'
import {
  buildSpace,
  extractStorageId,
  isPersonalSpaceResource,
  isProjectSpaceResource
} from '@opencloud-eu/web-client'
import type { CollaboratorShare, MountPointSpaceResource } from '@opencloud-eu/web-client'
import { useUserStore } from './user'
import { ConfigStore, useConfigStore } from './config'
import { useSharesStore } from './shares'
import { ListPermissionsSpaceRootSelectEnum } from '@opencloud-eu/web-client/graph/generated'

// sort space members with higher permissions (managers) at the top
export const sortSpaceMembers = (shares: CollaboratorShare[]) => {
  return shares.sort((a, b) => b.permissions.length - a.permissions.length)
}

export const getSpacesByType = async ({
  graphClient,
  driveType,
  configStore,
  signal
}: {
  graphClient: Graph
  driveType: string
  configStore: ConfigStore
  signal?: AbortSignal
}) => {
  const mountpoints = await graphClient.drives.listMyDrives(
    {
      orderBy: 'name asc',
      filter: `driveType eq ${driveType}`
    },
    { signal }
  )
  if (!mountpoints.length) {
    return []
  }

  if (driveType !== 'mountpoint' || !configStore.options.routing?.fullShareOwnerPaths) {
    return mountpoints
  }

  const rootSpaceDriveAliasMapping: Record<string, string> = {}
  mountpoints.forEach((space) => {
    const { rootId, driveAlias } = space.root.remoteItem
    rootSpaceDriveAliasMapping[rootId] = driveAlias
  })

  const rootSpaces = Object.entries(rootSpaceDriveAliasMapping).map(([id, driveAlias]) =>
    // FIXME: create proper buildRootSpace (or whatever function)
    buildSpace({
      id: extractStorageId(id),
      name: driveAlias, // FIXME: set a proper name
      driveType: driveAlias.split('/')[0], // FIXME: can we retrieve this from api?
      driveAlias,
      path: '/',
      serverUrl: configStore.serverUrl
    })
  )

  return [...mountpoints, ...rootSpaces]
}

export const useSpacesStore = defineStore('spaces', () => {
  const userStore = useUserStore()
  const configStore = useConfigStore()
  const sharesStore = useSharesStore()

  const spaces = ref<SpaceResource[]>([])
  const currentSpace = ref<SpaceResource>()
  const spacesInitialized = ref(false)
  const mountPointsInitialized = ref(false)
  const spacesLoading = ref(false)
  const defaultSpaceImageBlobURL = ref<string>(null)
  const imagesLoading = ref<string[]>([])
  const readmesLoading = ref<string[]>([])

  const personalSpace = computed(() => {
    return unref(spaces).find((s) => isPersonalSpaceResource(s) && s.isOwner(userStore.user))
  })

  const setSpacesInitialized = (value: boolean) => {
    spacesInitialized.value = value
  }

  const setMountPointsInitialized = (value: boolean) => {
    mountPointsInitialized.value = value
  }

  const setSpacesLoading = (value: boolean) => {
    spacesLoading.value = value
  }

  const setCurrentSpace = (space: SpaceResource) => {
    currentSpace.value = space
  }

  const setDefaultSpaceImageBlobURL = (blobURL: string) => {
    defaultSpaceImageBlobURL.value = blobURL
  }

  const getSpaceMembers = (space: SpaceResource) => {
    // only project spaces have members
    if (!isProjectSpaceResource(space)) {
      return []
    }
    const members = sharesStore.collaboratorShares.filter((c) => c.resourceId === space.id)
    return sortSpaceMembers(members)
  }

  const addSpaces = (s: SpaceResource[]) => {
    unref(spaces).push(...s)
  }

  const removeSpace = (space: SpaceResource) => {
    spaces.value = unref(spaces).filter(({ id }) => id !== space.id)
  }

  const getSpace = (id: string) => {
    return unref(spaces).find((s) => id == s.id)
  }

  const getMountPointForSpace = async ({
    graphClient,
    space,
    signal
  }: {
    graphClient: Graph
    space: SpaceResource
    signal?: AbortSignal
  }): Promise<MountPointSpaceResource> => {
    await loadMountPoints({ graphClient, signal })

    // even if the resource has been shared via multiple permissions (e.g. directly via user and a group)
    // we only care about one matching mount point since the remote item contains all permissions
    return unref(spaces).find(
      (s) => isMountPointSpaceResource(s) && s.root?.remoteItem?.id === space.id
    )
  }

  const createShareSpace = ({
    driveAliasPrefix,
    id,
    shareName
  }: {
    driveAliasPrefix: 'share' | 'ocm-share'
    id: string
    shareName: string
  }) => {
    const space = buildShareSpaceResource({
      driveAliasPrefix,
      id,
      shareName,
      serverUrl: configStore.serverUrl
    })
    addSpaces([space])
    return space
  }

  const upsertSpace = (space: SpaceResource) => {
    const existingSpace = unref(spaces).find(({ id }) => id === space.id)
    if (existingSpace) {
      Object.assign(existingSpace, space)
      return
    }
    addSpaces([space])
  }

  const updateSpaceField = <T extends SpaceResource>({
    id,
    field,
    value
  }: {
    id: T['id']
    field: keyof T
    value: T[keyof T]
  }) => {
    const space = unref(spaces).find((space) => id === space.id) as T
    if (space) {
      space[field] = value
    }
  }

  const loadSpaces = async ({ graphClient }: { graphClient: Graph }) => {
    spacesLoading.value = true
    try {
      /**
       * FIXME: this is bad for two reasons:
       * 1. fetching by specific drive type is bad because if more drive types are being added it needs additional code.
       *    as soon as the backend allows to filter by `driveType neq virtual` we want to use that here.
       * 2. fetching the mountpoint drives only on first access is kind of error prone, because mount points are
       *    trying to be accessed in multiple code locations. all of them need to check now if mountpoints need to be
       *    fetched first. but at the moment fetching mountpoints is kind of expensive, so we need to accept that for now.
       */
      const [personalSpaces, projectSpaces] = await Promise.all([
        getSpacesByType({
          graphClient,
          driveType: 'personal',
          configStore
        }),
        getSpacesByType({
          graphClient,
          driveType: 'project',
          configStore
        })
      ])

      addSpaces([...personalSpaces, ...projectSpaces])
    } finally {
      spacesLoading.value = false
    }
  }

  const loadMountPoints = async ({
    graphClient,
    signal
  }: {
    graphClient: Graph
    signal?: AbortSignal
  }) => {
    // fetching mount points is particularly expensive, so we do that only on first access.
    if (unref(mountPointsInitialized)) {
      return
    }
    try {
      const mountPointSpaces = await getSpacesByType({
        graphClient,
        driveType: 'mountpoint',
        configStore,
        signal
      })
      addSpaces(mountPointSpaces)
    } finally {
      mountPointsInitialized.value = true
    }
  }

  const reloadProjectSpaces = async ({
    graphClient,
    signal
  }: {
    graphClient: Graph
    signal?: AbortSignal
  }) => {
    const projectSpaces = await getSpacesByType({
      graphClient,
      driveType: 'project',
      configStore,
      signal
    })
    spaces.value = unref(spaces).filter((s) => !isProjectSpaceResource(s))
    addSpaces(projectSpaces)
  }

  const addToImagesLoading = (id: string) => {
    if (!unref(imagesLoading).includes(id)) {
      unref(imagesLoading).push(id)
    }
  }

  const removeFromImagesLoading = (id: string) => {
    imagesLoading.value = unref(imagesLoading).filter((i) => i !== id)
  }

  const purgeImagesLoading = () => {
    imagesLoading.value = []
  }

  const addToReadmesLoading = (id: string) => {
    if (!unref(readmesLoading).includes(id)) {
      unref(readmesLoading).push(id)
    }
  }

  const removeFromReadmesLoading = (id: string) => {
    readmesLoading.value = unref(readmesLoading).filter((i) => i !== id)
  }

  const purgeReadmesLoading = () => {
    readmesLoading.value = []
  }

  const spacePermissionsLoading = ref<Record<string, Promise<void>>>({})

  /**
   * Loads permissions for the current user for given space ids and updates
   * the `graphPermissions` field of the space in the store.
   */
  const loadGraphPermissions = async ({
    ids,
    graphClient,
    useCache = true
  }: {
    ids: string[]
    graphClient: Graph
    useCache?: boolean
  }) => {
    const spacesToLoad = unref(spaces).filter(
      (s) => ids.includes(s.id) && (s.graphPermissions === undefined || !useCache)
    )

    if (!spacesToLoad.length) {
      return
    }

    for (const { id, disabled } of spacesToLoad) {
      if (disabled) {
        // can't load permissions for disabled spaces
        updateSpaceField({ id, field: 'graphPermissions', value: [] })
        continue
      }

      if (unref(spacePermissionsLoading)[id]) {
        // permissions are already being loaded for this space, we just need to await it
        continue
      }

      spacePermissionsLoading.value[id] = graphClient.permissions
        .listPermissions(id, id, sharesStore.graphRoles, {
          select: [ListPermissionsSpaceRootSelectEnum.LibreGraphPermissionsActionsAllowedValues]
        })
        .then(({ allowedActions }) => {
          updateSpaceField({ id, field: 'graphPermissions', value: allowedActions })
          delete spacePermissionsLoading.value[id]
        })
    }

    await Promise.all(Object.values(unref(spacePermissionsLoading)))
  }

  return {
    spaces,
    spacesInitialized,
    mountPointsInitialized,
    spacesLoading,
    currentSpace,
    personalSpace,
    defaultSpaceImageBlobURL,
    imagesLoading,
    readmesLoading,

    getSpace,
    createShareSpace,
    setSpacesInitialized,
    setMountPointsInitialized,
    setSpacesLoading,
    setCurrentSpace,
    setDefaultSpaceImageBlobURL,
    getSpaceMembers,
    getMountPointForSpace,

    addSpaces,
    removeSpace,
    upsertSpace,
    updateSpaceField,
    loadSpaces,
    loadMountPoints,
    reloadProjectSpaces,

    addToImagesLoading,
    removeFromImagesLoading,
    purgeImagesLoading,
    addToReadmesLoading,
    removeFromReadmesLoading,
    purgeReadmesLoading,

    loadGraphPermissions
  }
})

export type SpacesStore = ReturnType<typeof useSpacesStore>
