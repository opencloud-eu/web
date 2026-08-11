<template>
  <div class="h-full" tabindex="0">
    <app-loading-spinner v-if="isLoading" />
    <iframe
      v-show="!isLoading"
      ref="iframeRef"
      class="size-full"
      :title="iframeTitle"
      :src="iframeUrl.href"
      tabindex="0"
      @load="onLoad"
    ></iframe>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, unref } from 'vue'
import {
  embedModeLocationPickMessageData,
  Modal,
  useClientService,
  useFileActions,
  useGetMatchingSpace,
  useMessages,
  useModals,
  useRouter,
  useThemeStore
} from '../../composables'
import { LocationQuery, RouteLocationRaw } from 'vue-router'
import AppLoadingSpinner from '../AppLoadingSpinner.vue'
import { isShareSpaceResource, Resource, SpaceResource, urlJoin } from '@opencloud-eu/web-client'
import { resolveFileNameDuplicate } from '../../helpers'
import { useGettext } from 'vue3-gettext'
import { DavProperty } from '@opencloud-eu/web-client/webdav'

const { modal, parentFolderLink, originalResource, content } = defineProps<{
  modal: Modal
  parentFolderLink: RouteLocationRaw
  originalResource: Resource
  content: string
}>()

const iframeRef = ref<HTMLIFrameElement>()
const isLoading = ref(true)
const themeStore = useThemeStore()
const { $gettext } = useGettext()
const router = useRouter()
const clientService = useClientService()
const { removeModal } = useModals()
const { showMessage, showErrorMessage } = useMessages()
const { getMatchingSpace } = useGetMatchingSpace()
const { getEditorRouteOpts } = useFileActions()

const parentFolderRoute = router.resolve(parentFolderLink)
const iframeTitle = themeStore.currentTheme.name
const iframeUrl = new URL(parentFolderRoute.href, window.location.origin)
iframeUrl.searchParams.append('hide-logo', 'true')
iframeUrl.searchParams.append('embed', 'true')
iframeUrl.searchParams.append('embed-target', 'location')
iframeUrl.searchParams.append('embed-choose-file-name', 'true')
iframeUrl.searchParams.append('embed-delegate-authentication', 'false')
iframeUrl.searchParams.append('embed-choose-file-name-suggestion', originalResource.name)

const onLoad = () => {
  isLoading.value = false
  unref(iframeRef).contentWindow.focus()
}

const onLocationPick = async ({ data }: MessageEvent) => {
  if (data.name !== 'opencloud-embed:select') {
    return
  }

  const { resources, fileName, locationQuery }: embedModeLocationPickMessageData = data.data

  const destinationFolder: Resource = resources[0]
  const space = getMatchingSpace(destinationFolder)

  try {
    const resource = await saveFile({ destinationFolder, fileName, space })
    showMessage({
      title: $gettext('»%{fileName}« was saved successfully', { fileName: resource.name })
    })
    openFile({ resource, space, locationQuery })
  } catch (e) {
    console.error(e)
    showErrorMessage({
      title: $gettext('Unable to save »%{fileName}«', { fileName }),
      errors: [e]
    })
    console.error(e)
  }

  removeModal(modal.id)
}

const saveFile = async ({
  destinationFolder,
  fileName,
  space
}: {
  destinationFolder: Resource
  fileName: string
  space: SpaceResource
}) => {
  const { children: existingResources } = await clientService.webdav.listFiles(
    space,
    { fileId: destinationFolder.fileId },
    { davProperties: [DavProperty.Name] }
  )
  const resourceAlreadyExists = existingResources.find(
    (existingResource) => existingResource.name === fileName
  )
  if (resourceAlreadyExists) {
    fileName = resolveFileNameDuplicate(fileName, originalResource.extension, existingResources)
  }

  return clientService.webdav.putFileContents(space, {
    fileName,
    parentFolderId: destinationFolder.id,
    content: content,
    path: urlJoin(destinationFolder.path, fileName)
  })
}

const openFile = ({
  locationQuery,
  resource,
  space
}: {
  locationQuery: LocationQuery
  resource: Resource
  space: SpaceResource
}) => {
  const remoteItemId = isShareSpaceResource(space) ? space.id : undefined
  const routeOpts = getEditorRouteOpts(
    unref(router.currentRoute).name,
    space,
    resource,
    remoteItemId
  )
  routeOpts.query = { ...routeOpts.query, ...locationQuery }

  // Build URL manually to avoid double encoding from router.resolve()
  const routeName = routeOpts.name as string
  const driveAliasAndItem = routeOpts.params?.driveAliasAndItem as string
  const queryParams = new URLSearchParams()
  Object.entries(routeOpts.query || {}).forEach(([key, value]) => {
    queryParams.append(key, value as string)
  })
  const queryString = queryParams.toString()
  const href = `${window.location.origin}/${routeName}/${driveAliasAndItem}${queryString ? `?${queryString}` : ''}`

  window.open(href, '_blank')
}

const onCancel = ({ data }: MessageEvent) => {
  if (data.name !== 'opencloud-embed:cancel') {
    return
  }

  removeModal(modal.id)
}

onMounted(() => {
  window.addEventListener('message', onLocationPick)
  window.addEventListener('message', onCancel)
})

onBeforeUnmount(() => {
  window.removeEventListener('message', onLocationPick)
  window.removeEventListener('message', onCancel)
})
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer utilities {
  .oc-modal.save-as-modal {
    @apply overflow-hidden;
    max-width: 90vw;
  }
  .oc-modal.save-as-modal .oc-modal-title {
    @apply hidden;
  }
  .oc-modal.save-as-modal .oc-modal-body {
    @apply p-0;
  }

  .oc-modal.save-as-modal .oc-modal-body-message {
    @apply m-0 h-[70vh];
  }
}
</style>
