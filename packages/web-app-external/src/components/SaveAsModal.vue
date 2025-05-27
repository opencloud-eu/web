<template>
  <form autocomplete="off" @submit.prevent="onConfirm">
    <oc-text-input
      id="save-as-input-file-name"
      v-model="newFileName"
      class="oc-mb-s"
      :label="$gettext('File name')"
      required-mark
      :error-message="errorMessage"
      :fix-message-line="true"
      @keydown.enter.prevent="emit('confirm')"
    />
    <input type="submit" class="oc-hidden" />
  </form>
</template>

<script setup lang="ts">
import { extractNameWithoutExtension, Resource, SpaceResource } from '@opencloud-eu/web-client'
import {
  Modal,
  resolveFileNameDuplicate,
  useClientService,
  useIsResourceNameValid
} from '@opencloud-eu/web-pkg'
import { computed, onMounted, ref, unref } from 'vue'
import { DavProperty } from '@opencloud-eu/web-client/webdav'

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
  modal: Modal
  callbackFn: (newFileName: string) => Promise<void>
}>()
const emit = defineEmits(['confirm'])

const newFileName = ref('')
const parentResources = ref<Resource[]>([])
onMounted(async () => {
  const { children: existingFiles } = await webdav.listFiles(
    space,
    { fileId: resource.parentFolderId },
    { davProperties: [DavProperty.Name] }
  )
  parentResources.value = existingFiles
  const fileName = fileExtension
    ? `${extractNameWithoutExtension(resource)}.${fileExtension}`
    : resource.name
  const hasConflict = existingFiles.some((f) => f.name === fileName)
  newFileName.value = hasConflict
    ? resolveFileNameDuplicate(fileName, fileExtension || resource.extension, existingFiles)
    : fileName
})

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
