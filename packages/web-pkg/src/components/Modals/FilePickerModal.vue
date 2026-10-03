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
  Modal,
  useModals,
  useRouter,
  useThemeStore,
  embedModeFilePickMessageData
} from '../../composables'
import { LocationQuery, RouteLocationRaw } from 'vue-router'
import AppLoadingSpinner from '../AppLoadingSpinner.vue'

const { modal, allowedFileTypes, parentFolderLink, callbackFn } = defineProps<{
  modal: Modal
  allowedFileTypes: string[]
  parentFolderLink: RouteLocationRaw
  callbackFn: (data: { resource: any; locationQuery?: LocationQuery }) => void
}>()

const iframeRef = ref<HTMLIFrameElement>()
const isLoading = ref(true)
const router = useRouter()
const { removeModal } = useModals()
const themeStore = useThemeStore()
const parentFolderRoute = router.resolve(parentFolderLink)

const iframeTitle = themeStore.currentTheme.name
const iframeUrl = new URL(parentFolderRoute.href, window.location.origin)
iframeUrl.searchParams.append('hide-logo', 'true')
iframeUrl.searchParams.append('embed', 'true')
iframeUrl.searchParams.append('embed-target', 'file')
iframeUrl.searchParams.append('embed-delegate-authentication', 'false')
iframeUrl.searchParams.append('embed-file-types', allowedFileTypes.join(','))

const onLoad = () => {
  isLoading.value = false
  unref(iframeRef).contentWindow.focus()
}

const onFilePick = ({ data }: MessageEvent) => {
  if (data.name !== 'opencloud-embed:file-pick') {
    return
  }

  const { resource, locationQuery }: embedModeFilePickMessageData = data.data
  callbackFn({ resource, locationQuery })

  removeModal(modal.id)
}

const onCancel = ({ data }: MessageEvent) => {
  if (data.name !== 'opencloud-embed:cancel') {
    return
  }

  removeModal(modal.id)
}

onMounted(() => {
  window.addEventListener('message', onFilePick)
  window.addEventListener('message', onCancel)
})

onBeforeUnmount(() => {
  window.removeEventListener('message', onFilePick)
  window.removeEventListener('message', onCancel)
})
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer utilities {
  /* full screen on phones, the embedded files UI needs all the space it can get */
  .file-picker-modal {
    @apply overflow-hidden max-w-[90vw] max-sm:h-dvh max-sm:max-h-none max-sm:max-w-none max-sm:rounded-none max-sm:border-0;
  }
  .file-picker-modal .oc-modal-body {
    @apply p-0;
  }
  .file-picker-modal .oc-modal-body-message {
    @apply m-0 h-[70vh] max-sm:h-full;
  }
}
</style>
