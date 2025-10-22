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
import { defineComponent, onBeforeUnmount, onMounted, PropType, ref } from 'vue'
import {
  Modal,
  useModals,
  useRouter,
  useThemeStore,
  embedModeFilePickMessageData
} from '../../composables'
import { RouteLocationRaw } from 'vue-router'
import AppLoadingSpinner from '../AppLoadingSpinner.vue'

export default defineComponent({
  name: 'FilePickerModal',
  components: { AppLoadingSpinner },
  props: {
    modal: { type: Object as PropType<Modal>, required: true },
    allowedFileTypes: { type: Array as PropType<string[]>, required: true },
    parentFolderLink: { type: Object as PropType<RouteLocationRaw>, required: true },
    callbackFn: {
      type: Function as PropType<(resource: any, locationQuery?: Record<string, string>) => void>,
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
    iframeUrl.searchParams.append('embed-target', 'file')
    iframeUrl.searchParams.append('embed-delegate-authentication', 'false')
    iframeUrl.searchParams.append('embed-file-types', props.allowedFileTypes.join(','))

    const onLoad = () => {
      isLoading.value = false
      unref(iframeRef).contentWindow.focus()
    }

    const onFilePick = ({ data }: MessageEvent) => {
      if (data.name !== 'opencloud-embed:file-pick') {
        return
      }

      const { resource, locationQuery }: embedModeFilePickMessageData = data.data
      props.callbackFn({ resource, locationQuery })

      removeModal(props.modal.id)
    }

    const onCancel = ({ data }: MessageEvent) => {
      if (data.name !== 'opencloud-embed:cancel') {
        return
      }

      removeModal(props.modal.id)
    }

    onMounted(() => {
      window.addEventListener('message', onFilePick)
      window.addEventListener('message', onCancel)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('message', onFilePick)
      window.removeEventListener('message', onCancel)
    })

    return {
      isLoading,
      onLoad,
      iframeTitle,
      iframeSrc: iframeUrl.href,
      iframeRef,
      onFilePick
    }
  }
})
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer utilities {
  .file-picker-modal {
    @apply overflow-hidden;
    max-width: 80vw;
  }
  .file-picker-modal .oc-modal-title {
    @apply hidden;
  }
  .file-picker-modal .oc-modal-body {
    @apply p-0;
  }
  .file-picker-modal .oc-modal-body-message {
    @apply m-0 h-[60vh];
  }
}
</style>
