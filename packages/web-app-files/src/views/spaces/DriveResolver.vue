<template>
  <app-loading-spinner v-if="loading" />
  <drive-redirect v-else-if="!space" :drive-alias-and-item="driveAliasAndItem" />
  <generic-trash v-else-if="isTrashRoute" :space="space" :item-id="itemId" />
  <generic-space v-else :space="space" :item="item" :item-id="itemId" />
</template>

<script setup lang="ts">
import DriveRedirect from './DriveRedirect.vue'
import GenericSpace from './GenericSpace.vue'
import GenericTrash from './GenericTrash.vue'
import { computed, onMounted, ref, unref } from 'vue'
import {
  queryItemAsString,
  useAuthStore,
  useClientService,
  useDriveResolver,
  useGetMatchingSpace,
  useRouteParam,
  useRouteQuery,
  useRouter,
  useActiveLocation,
  isLocationTrashActive,
  createFileRouteOptions,
  createLocationSpaces,
  locationPublicUpload,
  AppLoadingSpinner
} from '@opencloud-eu/web-pkg'
import {
  isPublicSpaceResource,
  PublicSpaceResource,
  SharePermissionBit,
  SpaceResource
} from '@opencloud-eu/web-client'
import { dirname } from 'path'

const authStore = useAuthStore()
const clientService = useClientService()
const router = useRouter()
const driveAliasAndItem = useRouteParam('driveAliasAndItem')
const isTrashRoute = useActiveLocation(isLocationTrashActive, 'files-trash-generic')
const { item, itemId, space } = useDriveResolver({ driveAliasAndItem })
const { getInternalSpace } = useGetMatchingSpace()

const loading = ref(true)

const fileIdQueryItem = useRouteQuery('fileId')
const fileId = computed(() => {
  return queryItemAsString(unref(fileIdQueryItem))
})

const getSpaceResource = async (): Promise<SpaceResource> => {
  try {
    return (await clientService.webdav.getFileInfo(unref(space))) as SpaceResource
  } catch (e) {
    console.error(e)
    return unref(space)
  }
}

const resolveToInternalLocation = async (path: string) => {
  const internalSpace = getInternalSpace(unref(fileId).split('!')[0])
  if (internalSpace) {
    const resource = await clientService.webdav.getFileInfo(
      internalSpace,
      { path },
      { headers: { Authorization: `Bearer ${authStore.accessToken}` } }
    )

    const resourceId = resource.type !== 'folder' ? resource.parentFolderId : resource.fileId
    const resourcePath = resource.type !== 'folder' ? dirname(path) : path
    space.value = internalSpace
    item.value = resourcePath

    const { params, query } = createFileRouteOptions(internalSpace, {
      fileId: resourceId,
      path: resourcePath
    })
    return router.push(
      createLocationSpaces('files-spaces-generic', {
        params,
        query: {
          ...query,
          scrollTo: unref(resource).fileId,
          openWithDefaultApp: 'true'
        }
      })
    )
  }

  // no internal space found -> share -> resolve via private link as it holds all the necessary logic
  return router.push({
    name: 'resolvePrivateLink',
    params: { fileId: unref(fileId) },
    query: {
      openWithDefaultApp: 'true'
    }
  })
}

onMounted(async () => {
  if (!unref(driveAliasAndItem) && unref(fileId)) {
    return router.push({
      name: 'resolvePrivateLink',
      params: { fileId: unref(fileId) },
      query: {
        openWithDefaultApp: 'true'
      }
    })
  }

  if (unref(space) && isPublicSpaceResource(unref(space))) {
    if (authStore.userContextReady && unref(fileId)) {
      try {
        const path = await clientService.webdav.getPathForFileId(unref(fileId), {
          headers: { Authorization: `Bearer ${authStore.accessToken}` }
        })
        await resolveToInternalLocation(path)
        loading.value = false
        return
      } catch {
        // getPathForFileId failed means the user doesn't have internal access to the resource
      }
    }

    /**
     * This is to make sure that an already resolved public link still resolves correctly
     * upon reload if the link type has been changed to "Uploader" meanwhile.
     * If the space ids differ, it means we're coming from the resolvePublicLink page
     * that already feetched the space. Hence the fileId and the id differ.
     * It also means the resolvePublicLink page already handled a link of type "Uploader".
     *
     * Ideally we would redirect the user via the resolvePublicLink page, but we didn't
     * find an easy way to do that.
     **/
    if (unref(space).fileId === unref(space).id) {
      const publicSpace = (await getSpaceResource()) as PublicSpaceResource

      // FIXME: check for type when server sends public-link-permission dav property
      if (publicSpace.publicLinkPermission === SharePermissionBit.Create) {
        router.push({
          name: locationPublicUpload.name,
          params: { token: unref(space).id.toString() }
        })
      }
    }
  }

  loading.value = false
})
</script>
