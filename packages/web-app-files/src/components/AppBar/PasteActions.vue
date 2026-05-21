<template>
  <div v-if="showActions && showPasteHereButton" class="create-and-upload-actions inline-flex">
    <oc-button
      v-oc-tooltip="pasteHereButtonTooltip"
      :disabled="isPasteHereButtonDisabled"
      :aria-label="$gettext('Paste here')"
      class="paste-files-btn whitespace-nowrap px-2 py-1"
      appearance="raw"
      gap-size="small"
      @click="pasteFileAction"
    >
      <oc-icon fill-type="line" name="clipboard" :size="limitedScreenSpace ? 'medium' : 'small'" />
      <span v-if="!limitedScreenSpace" class="font-bold" v-text="$gettext('Paste here')" />
    </oc-button>
    <oc-button
      v-oc-tooltip="$gettext('Clear clipboard')"
      :aria-label="$gettext('Clear clipboard')"
      class="clear-clipboard-btn"
      appearance="raw"
      @click="clearClipboard"
    >
      <oc-icon fill-type="line" name="eraser" :size="limitedScreenSpace ? 'medium' : 'small'" />
      <span v-if="!limitedScreenSpace" v-text="$gettext('Clear')" />
    </oc-button>
  </div>
</template>

<script setup lang="ts">
import {
  ClipboardActions,
  isLocationPublicActive,
  useClipboardStore,
  useResourcesStore,
  useUserStore,
  useActiveLocation,
  UppyService,
  useService
} from '@opencloud-eu/web-pkg'
import { computed, unref } from 'vue'
import { SpaceResource } from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'
import { useFileActionsPaste } from '../../composables'
import { useEventListener } from '@vueuse/core'

const { space, limitedScreenSpace = false } = defineProps<{
  space: SpaceResource
  limitedScreenSpace?: boolean
}>()

const userStore = useUserStore()
const uppyService = useService<UppyService>('$uppyService')
const language = useGettext()
const { $gettext } = language

const clipboardStore = useClipboardStore()
const { clearClipboard } = clipboardStore
const { resources: clipboardResources, action: clipboardAction } = storeToRefs(clipboardStore)

const resourcesStore = useResourcesStore()
const { currentFolder } = storeToRefs(resourcesStore)

const isPublicLocation = useActiveLocation(isLocationPublicActive, 'files-public-link')

const computedSpace = computed(() => space)

const { actions: pasteFileActions } = useFileActionsPaste()
const pasteFileAction = () => {
  return unref(pasteFileActions)[0].handler({ space: unref(computedSpace) })
}

const canUpload = computed(() => {
  return unref(currentFolder)?.canUpload({ user: userStore.user })
})

const showPasteHereButton = computed(() => {
  return unref(clipboardResources) && unref(clipboardResources).length !== 0
})

const showActions = computed(() => {
  return unref(canUpload) || !unref(isPublicLocation)
})

const isMovingIntoSameFolder = computed(() => {
  if (unref(clipboardAction) === ClipboardActions.Copy) {
    return false
  }

  if (!unref(clipboardResources) || unref(clipboardResources).length < 1) {
    return false
  }

  return !unref(clipboardResources).some(
    (resource) => resource.parentFolderId !== unref(currentFolder).id
  )
})

const isPasteHereButtonDisabled = computed(() => {
  return !unref(canUpload) || unref(isMovingIntoSameFolder)
})

const pasteHereButtonTooltip = computed(() => {
  if (!unref(canUpload)) {
    return $gettext('You have no permission to paste files here.')
  }

  if (unref(isMovingIntoSameFolder)) {
    return $gettext('You cannot cut and paste resources into the same folder.')
  }

  if (limitedScreenSpace) {
    return $gettext('Paste here')
  }

  return ''
})

useEventListener(document, 'paste', (event: ClipboardEvent) => {
  // Ignore file in clipboard if there are already files from OpenCloud in the clipboard
  if (unref(clipboardResources).length || !unref(canUpload)) {
    return
  }
  // Browsers only allow single files to be pasted for security reasons
  const items = event.clipboardData.items
  const fileItem = [...items].find((i) => i.kind === 'file')
  if (!fileItem) {
    return
  }
  const file = fileItem.getAsFile()
  uppyService.addFiles([file])
  event.preventDefault()
})
</script>
