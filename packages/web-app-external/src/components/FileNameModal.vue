<template>
  <form autocomplete="off" @submit.prevent="onConfirm">
    <oc-text-input
      id="file-name-input"
      v-model="newFileName"
      class="mb-2"
      :label="$gettext('File name')"
      required-mark
      :error-message="errorMessage"
      :fix-message-line="true"
      :selection-range="inputSelectionRange"
      @keydown.enter.prevent="emit('confirm')"
    />
    <input type="submit" class="hidden" />
  </form>
</template>

<script setup lang="ts">
import {
  call,
  extractNameWithoutExtension,
  Resource,
  SpaceResource
} from '@opencloud-eu/web-client'
import {
  Modal,
  resolveFileNameDuplicate,
  useClientService,
  useIsResourceNameValid
} from '@opencloud-eu/web-pkg'
import { computed, ref, unref } from 'vue'
import { DavProperty } from '@opencloud-eu/web-client/webdav'
import { useTask } from 'vue-concurrency'

const { webdav } = useClientService()
const { isFileNameValid } = useIsResourceNameValid()

const {
  space,
  resource,
  fileExtension = undefined,
  callbackFn
} = defineProps<{
  space: SpaceResource
  resource: Resource
  fileExtension?: string
  fileExtensionsShown?: boolean
  modal: Modal
  callbackFn: (newFileName: string) => Promise<void>
}>()
const emit = defineEmits(['confirm'])

const newFileName = ref('')
const parentResources = ref<Resource[]>([])
const inputSelectionRange = ref<[number, number]>([0, resource?.name?.length || 0])

const buildFileNameTask = useTask(function* () {
  const { children: existingFiles } = yield* call(
    webdav.listFiles(
      space,
      { fileId: resource.parentFolderId },
      { davProperties: [DavProperty.Name] }
    )
  )
  parentResources.value = existingFiles

  const fileName = fileExtension
    ? `${extractNameWithoutExtension(resource)}.${fileExtension}`
    : resource.name
  const hasConflict = existingFiles.some((f) => f.name === fileName)
  newFileName.value = hasConflict
    ? resolveFileNameDuplicate(fileName, fileExtension || resource.extension, existingFiles)
    : fileName

  inputSelectionRange.value = [
    0,
    extractNameWithoutExtension({
      name: unref(newFileName),
      extension: fileExtension || resource.extension
    } as Resource).length
  ]
})
buildFileNameTask.perform()

const errorMessage = computed(() => {
  const { isValid, error } = isFileNameValid(resource, unref(newFileName), unref(parentResources))
  if (!isValid) {
    return error
  }
  return undefined
})

const onConfirm = async () => {
  await callbackFn(unref(newFileName))
}
defineExpose({
  onConfirm
})
</script>
