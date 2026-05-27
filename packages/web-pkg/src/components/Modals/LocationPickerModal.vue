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

<script lang="ts">
import { defineComponent, onBeforeUnmount, onMounted, PropType, ref, unref } from 'vue'
import {
  embedModeLocationPickMessageData,
  Modal,
  useModals,
  useRouter,
  useThemeStore
} from '../../composables'
import { RouteLocationRaw } from 'vue-router'
import AppLoadingSpinner from '../AppLoadingSpinner.vue'

export default defineComponent({
  name: 'LocationPickerModal',
  components: { AppLoadingSpinner },
  props: {
    modal: { type: Object as PropType<Modal>, required: true },
    parentFolderLink: { type: Object as PropType<RouteLocationRaw>, required: true },
    submitButtonTitle: { type: String, required: false, default: undefined },
    callbackFn: {
      type: Function as PropType<
        (resources: embedModeLocationPickMessageData['resources']) => void
      >,
      required: true
    }
  },
  setup(props) {
    const iframeRef = ref<HTMLIFrameElement>()
    const isLoading = ref(true)
    const router = useRouter()
    const { removeModal } = useModals()
    const themeStore = useThemeStore()
    const parentFolderRoute = router.resolve(props.parentFolderLink)

    const iframeTitle = themeStore.currentTheme.name
    const iframeUrl = new URL(parentFolderRoute.href, window.location.origin)
    iframeUrl.searchParams.append('hide-logo', 'true')
    iframeUrl.searchParams.append('embed', 'true')
    iframeUrl.searchParams.append('embed-target', 'location')
    iframeUrl.searchParams.append('embed-delegate-authentication', 'false')
    if (props.submitButtonTitle) {
      iframeUrl.searchParams.append('embed-submit-button-title', props.submitButtonTitle)
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

      props.callbackFn(resources)

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
  .location-picker-modal {
    @apply overflow-hidden;
    max-width: 90vw;
  }

  .location-picker-modal .oc-modal-body {
    @apply p-0;
  }
  .location-picker-modal .oc-modal-body-message {
    @apply m-0 h-[85vh];
  }
}
</style>
