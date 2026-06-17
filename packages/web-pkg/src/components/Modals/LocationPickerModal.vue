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
    ></iframe>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, unref } from 'vue'
import {
  embedModeLocationPickMessageData,
  Modal,
  useModals,
  useRouter,
  useThemeStore
} from '../../composables'
import { RouteLocationRaw } from 'vue-router'
import AppLoadingSpinner from '../AppLoadingSpinner.vue'

const { modal, parentFolderLink, submitButtonTitle, callbackFn } = defineProps<{
  modal: Modal
  parentFolderLink: RouteLocationRaw
  submitButtonTitle?: string
  callbackFn: (resources: embedModeLocationPickMessageData['resources']) => void
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
iframeUrl.searchParams.append('embed-target', 'location')
iframeUrl.searchParams.append('embed-delegate-authentication', 'false')
if (submitButtonTitle) {
  iframeUrl.searchParams.append('embed-submit-button-title', submitButtonTitle)
}

const onLoad = () => {
  isLoading.value = false
  unref(iframeRef).contentWindow.focus()
}

const onLocationPick = ({ data }: MessageEvent) => {
  if (data.name !== 'opencloud-embed:select') {
    return
  }

  let resources = (data.data as embedModeLocationPickMessageData)?.resources
  if (Array.isArray(data.data)) {
    resources = data.data
  }

  if (!resources?.length) {
    return
  }

  callbackFn(resources)
  removeModal(modal.id)
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

const iframeSrc = iframeUrl.href
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer utilities {
  .location-picker-modal {
    @apply overflow-hidden;
    max-width: 90vw;
  }

  .location-picker-modal .oc-modal-body {
    @apply p-0;
  }
  .location-picker-modal .oc-modal-body-message {
    @apply m-0 h-[70vh];
  }
}
</style>
