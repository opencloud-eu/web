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
    />
    <input type="submit" class="oc-hidden" />
  </form>
</template>

<script setup lang="ts">
import { extractNameWithoutExtension, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { Modal, resolveFileNameDuplicate, useClientService } from '@opencloud-eu/web-pkg'
import { computed, onMounted, ref, unref } from 'vue'
import { DavProperty } from '@opencloud-eu/web-client/webdav'

const { webdav } = useClientService()

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

const newFileName = ref('')
onMounted(async () => {
  const { children: existingFiles } = await webdav.listFiles(
    space,
    { fileId: resource.parentFolderId },
    { davProperties: [DavProperty.Name] }
  )
  const fileName = fileExtension
    ? `${extractNameWithoutExtension(resource)}.${fileExtension}`
    : resource.name
  const hasConflict = existingFiles.some((f) => f.name === fileName)
  newFileName.value = hasConflict
    ? resolveFileNameDuplicate(fileName, fileExtension || resource.extension, existingFiles)
    : fileName
})

const errorMessage = computed(() => {
  // TODO: add validation for file name (extract from rename action)
  return undefined
})

const onConfirm = async () => {
  await callbackFn(unref(newFileName))
}
defineExpose({
  onConfirm
})
</script>
