<template>
  <div
    v-oc-tooltip="
      isRemoteUploadInProgress ? $gettext('Please wait until all imports have finished') : null
    "
    class="relative overflow-hidden"
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

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, unref, useTemplateRef } from 'vue'
import { Resource } from '@opencloud-eu/web-client'
import { useService, ResourceIcon, convertToMinimalUppyFile } from '@opencloud-eu/web-pkg'
import type { UppyService } from '@opencloud-eu/web-pkg'
import { getItemsViaDirectoryPicker } from '../../../helpers/directoryPicker'
import { useGettext } from 'vue3-gettext'

const {
  btnLabel = '',
  btnClass = '',
  isFolder = false
} = defineProps<{
  btnLabel?: string
  btnClass?: string
  isFolder?: boolean
}>()

const { $gettext } = useGettext()
const uppyService = useService<UppyService>('$uppyService')
const input = useTemplateRef<HTMLInputElement>('input')

const isRemoteUploadInProgress = ref(uppyService.isRemoteUploadInProgress())

let uploadStartedSub: string
let uploadCompletedSub: string

const resource = computed(() => {
  return { extension: '', isFolder } as Resource
})

const onUploadStarted = () =>
  (isRemoteUploadInProgress.value = uppyService.isRemoteUploadInProgress())
const onUploadCompleted = () => (isRemoteUploadInProgress.value = false)

const triggerUpload = async () => {
  if (!isFolder || typeof (window as any).showDirectoryPicker !== 'function') {
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

const inputId = computed(() => {
  if (isFolder) {
    return 'files-folder-upload-input'
  }
  return 'files-file-upload-input'
})
const uploadLabelId = computed(() => {
  if (isFolder) {
    return 'files-folder-upload-button'
  }
  return 'files-file-upload-button'
})
const buttonLabel = computed(() => {
  if (btnLabel) {
    return btnLabel
  }
  if (isFolder) {
    return $gettext('Folder')
  }
  return $gettext('Files')
})
const inputAttrs = computed(() => {
  if (isFolder) {
    return {
      webkitdirectory: true,
      mozdirectory: true,
      allowdirs: true
    }
  }
  return { multiple: true }
})
</script>
