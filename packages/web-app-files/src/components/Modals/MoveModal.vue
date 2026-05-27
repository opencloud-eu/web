<template>
  <div class="h-full" tabindex="0">
    <app-loading-spinner v-if="isLoading" />
    <iframe
      v-show="!isLoading"
      ref="iframeRef"
      class="size-full"
      :title="iframeTitle"
      :src="iframeSrc"
      tabindex="0"
      @load="onLoad"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, onMounted, PropType, ref, unref } from 'vue'
import {
  AppLoadingSpinner,
  embedModeLocationPickMessageData,
  Modal,
  ResourceTransfer,
  TransferType,
  useClientService,
  useGetMatchingSpace,
  useMessages,
  useModals,
  usePasteWorker,
  useResourcesStore,
  useRouter,
  useThemeStore
} from '@opencloud-eu/web-pkg'
import { RouteLocationRaw } from 'vue-router'
import { Resource, SpaceResource, isShareSpaceResource } from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'

export default defineComponent({
  name: 'MoveModal',
  components: { AppLoadingSpinner },
  props: {
    modal: { type: Object as PropType<Modal>, required: true },
    parentFolderLink: { type: Object as PropType<RouteLocationRaw>, required: true },
    resourcesToMove: { type: Array as PropType<Resource[]>, required: true },
    sourceSpace: { type: Object as PropType<SpaceResource>, required: true }
  },
  setup(props) {
    const iframeRef = ref<HTMLIFrameElement>()
    const isLoading = ref(true)
    const themeStore = useThemeStore()
    const { $gettext, $ngettext } = useGettext()
    const router = useRouter()
    const clientService = useClientService()
    const { removeModal } = useModals()
    const { showErrorMessage } = useMessages()
    const { getMatchingSpace } = useGetMatchingSpace()
    const { startWorker } = usePasteWorker()
    const resourcesStore = useResourcesStore()
    const { currentFolder } = storeToRefs(resourcesStore)

    const parentFolderRoute = router.resolve(props.parentFolderLink)
    const iframeTitle = themeStore.currentTheme.name
    const iframeUrl = new URL(parentFolderRoute.href, window.location.origin)
    iframeUrl.searchParams.append('hide-logo', 'true')
    iframeUrl.searchParams.append('embed', 'true')
    iframeUrl.searchParams.append('embed-target', 'location')
    iframeUrl.searchParams.append('embed-delegate-authentication', 'false')

    const onLoad = () => {
      isLoading.value = false
      unref(iframeRef).contentWindow.focus()
    }

    const onLocationPick = async ({ data }: MessageEvent) => {
      if (data.name !== 'opencloud-embed:select') {
        return
      }

      const { resources }: embedModeLocationPickMessageData = data.data
      const destinationFolder: Resource = resources[0]
      const targetSpace = getMatchingSpace(destinationFolder)

      try {
        const resourceTransfer = new ResourceTransfer(
          props.sourceSpace,
          props.resourcesToMove,
          targetSpace,
          destinationFolder,
          currentFolder,
          clientService,
          $gettext,
          $ngettext
        )

        const transferData = await resourceTransfer.getTransferData(TransferType.MOVE)
        if (!transferData.length) {
          removeModal(props.modal.id)
          return
        }

        const originalCurrentFolderId = unref(currentFolder)?.id

        startWorker(transferData, async ({ successful, failed }) => {
          resourceTransfer.showResultMessage(failed, successful, TransferType.MOVE)

          if (!successful.length) {
            return
          }

          if (unref(currentFolder) && originalCurrentFolderId !== unref(currentFolder).id) {
            return
          }

          const loadingResources: Promise<void>[] = []
          const fetchedResources: Resource[] = []

          for (const resource of successful) {
            loadingResources.push(
              (async () => {
                const movedResource = await clientService.webdav.getFileInfo(targetSpace, resource)
                fetchedResources.push(movedResource)
              })()
            )
          }

          await Promise.allSettled(loadingResources)

          if (isShareSpaceResource(targetSpace)) {
            fetchedResources.forEach((r) => {
              r.remoteItemId = targetSpace.id
            })
          }

          // Remove moved resources from current view
          for (const resource of props.resourcesToMove) {
            resourcesStore.removeResources([resource])
          }
        })
      } catch (e) {
        console.error(e)
        showErrorMessage({
          title: $gettext('Failed to move resources'),
          errors: [e]
        })
      }

      removeModal(props.modal.id)
    }

    const onCancel = ({ data }: MessageEvent) => {
      if (data.name !== 'opencloud-embed:cancel') {
        return
      }

      removeModal(props.modal.id)
    }

    onMounted(() => {
      window.addEventListener('message', onLocationPick)
      window.addEventListener('message', onCancel)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('message', onLocationPick)
      window.removeEventListener('message', onCancel)
    })

    return {
      isLoading,
      onLoad,
      iframeTitle,
      iframeSrc: iframeUrl.href,
      iframeRef,
      onLocationPick
    }
  }
})
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer utilities {
  .oc-modal.move-modal {
    @apply overflow-hidden;
    max-width: 80vw;
  }
  .oc-modal.move-modal .oc-modal-title {
    @apply hidden;
  }
  .oc-modal.move-modal .oc-modal-body {
    @apply p-0;
  }

  .oc-modal.move-modal .oc-modal-body-message {
    @apply m-0 h-[60vh];
  }
}
</style>
