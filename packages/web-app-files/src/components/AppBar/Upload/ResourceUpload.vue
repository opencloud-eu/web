<template>
  <div
    v-oc-tooltip="
      isRemoteUploadInProgress ? $gettext('Please wait until all imports have finished') : null
    "
  >
    <oc-button
      :class="btnClass"
      justify-content="left"
      appearance="raw"
      :disabled="isRemoteUploadInProgress"
      @click="triggerUpload"
    >
      <resource-icon :resource="resource" size="medium" class="[&_svg]:h-5.5! sm:[&_svg]:h-full" />
      <span :id="uploadLabelId">{{ buttonLabel }}</span>
    </oc-button>
    <input
      :id="inputId"
      ref="input"
      v-bind="inputAttrs"
      class="absolute left-[99999px]"
      type="file"
      :aria-labelledby="uploadLabelId"
      :name="isFolder ? 'file' : 'folder'"
      tabindex="-1"
    />
  </div>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  onMounted,
  onBeforeUnmount,
  ref,
  unref,
  useTemplateRef
} from 'vue'
import { Resource } from '@opencloud-eu/web-client'
import { useService, ResourceIcon, convertToMinimalUppyFile } from '@opencloud-eu/web-pkg'
import type { UppyService } from '@opencloud-eu/web-pkg'
import { getItemsViaDirectoryPicker } from '../../../helpers/directoryPicker'

export default defineComponent({
  components: { ResourceIcon },
  props: {
    btnLabel: {
      type: String,
      required: false,
      default: ''
    },
    btnClass: {
      type: String,
      required: false,
      default: ''
    },
    isFolder: {
      type: Boolean,
      required: false,
      default: false
    }
  },
  setup(props) {
    const uppyService = useService<UppyService>('$uppyService')
    const input = useTemplateRef<HTMLInputElement>('input')

    const isRemoteUploadInProgress = ref(uppyService.isRemoteUploadInProgress())

    let uploadStartedSub: string
    let uploadCompletedSub: string

    const resource = computed(() => {
      return { extension: '', isFolder: props.isFolder } as Resource
    })

    const onUploadStarted = () =>
      (isRemoteUploadInProgress.value = uppyService.isRemoteUploadInProgress())
    const onUploadCompleted = () => (isRemoteUploadInProgress.value = false)

    const triggerUpload = async () => {
      if (!props.isFolder || typeof (window as any).showDirectoryPicker !== 'function') {
        // use native file picker for file uploads or if browser does not support the Directory API
        unref(input).click()
        return
      }

      try {
        // use the Directory API so we can retrieve empty folders
        const items = await getItemsViaDirectoryPicker((error) => uppyService.log(error))
        const uppyFiles = convertToMinimalUppyFile('FolderUpload', items)
        uppyService.addFiles(uppyFiles)
      } catch (error) {
        if (error.name !== 'AbortError') {
          // AbortError means the user closed the picker. in any other case
          // we assume something went wrong and we fall back to the native picker.
          console.error('Error using DirectoryPicker, falling back to the native one:', error)
          unref(input).click()
        }
      }
    }

    onMounted(() => {
      uploadStartedSub = uppyService.subscribe('uploadStarted', onUploadStarted)
      uploadCompletedSub = uppyService.subscribe('uploadCompleted', onUploadCompleted)
      uppyService.registerUploadInput(unref(input))
    })

    onBeforeUnmount(() => {
      uppyService.unsubscribe('uploadStarted', uploadStartedSub)
      uppyService.unsubscribe('uploadCompleted', uploadCompletedSub)
      uppyService.removeUploadInput(unref(input))
    })
    return {
      isRemoteUploadInProgress,
      resource,
      input,
      triggerUpload
    }
  },
  computed: {
    inputId() {
      if (this.isFolder) {
        return 'files-folder-upload-input'
      }
      return 'files-file-upload-input'
    },
    uploadLabelId() {
      if (this.isFolder) {
        return 'files-folder-upload-button'
      }
      return 'files-file-upload-button'
    },
    buttonLabel() {
      if (this.btnLabel) {
        return this.btnLabel
      }
      if (this.isFolder) {
        return this.$gettext('Folder')
      }
      return this.$gettext('Files')
    },
    inputAttrs() {
      if (this.isFolder) {
        return {
          webkitdirectory: true,
          mozdirectory: true,
          allowdirs: true
        }
      }
      return { multiple: true }
    }
  }
})
</script>
