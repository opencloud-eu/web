<template>
  <div v-if="showActions" class="create-and-upload-actions inline-flex gap-2">
    <div v-if="showPasteHereButton" id="clipboard-btns" class="oc-button-group mr-2">
      <oc-button
        v-oc-tooltip="pasteHereButtonTooltip"
        :disabled="isPasteHereButtonDisabled"
        :aria-label="$gettext('Paste here')"
        class="paste-files-btn whitespace-nowrap"
        @click="pasteFileAction"
      >
        <oc-icon fill-type="line" name="clipboard" />
        <span v-if="!limitedScreenSpace" v-text="$gettext('Paste here')" />
      </oc-button>
      <oc-button
        v-oc-tooltip="$gettext('Clear clipboard')"
        :aria-label="$gettext('Clear clipboard')"
        class="clear-clipboard-btn"
        @click="clearClipboard"
      >
        <oc-icon fill-type="line" name="close" />
      </oc-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import {
  ClipboardActions,
  isLocationPublicActive,
  useClipboardStore,
  useMessages,
  useResourcesStore,
  useRoute,
  useSpacesStore,
  useUserStore,
  useActiveLocation,
  useFileActionsPaste,
  useClientService
} from '@opencloud-eu/web-pkg'

import { computed, onMounted, onBeforeUnmount, unref, watch } from 'vue'
import { SpaceResource, isPublicSpaceResource } from '@opencloud-eu/web-client'
import { useService, useUpload, UppyService, UploadResult } from '@opencloud-eu/web-pkg'
import { HandleUpload } from '../../HandleUpload'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'

const { space, limitedScreenSpace = false } = defineProps<{
  space: SpaceResource
  item?: string
  itemId?: string
  limitedScreenSpace?: boolean
}>()

const uppyService = useService<UppyService>('$uppyService')
const clientService = useClientService()
const userStore = useUserStore()
const spacesStore = useSpacesStore()
const messageStore = useMessages()
const route = useRoute()
const language = useGettext()
const { $gettext } = language

const clipboardStore = useClipboardStore()
const { clearClipboard } = clipboardStore
const { resources: clipboardResources, action: clipboardAction } = storeToRefs(clipboardStore)

const resourcesStore = useResourcesStore()
const { currentFolder } = storeToRefs(resourcesStore)

const isPublicLocation = useActiveLocation(isLocationPublicActive, 'files-public-link')

const computedSpace = computed(() => space)

useUpload({ uppyService })

if (!uppyService.getPlugin('HandleUpload')) {
  uppyService.addPlugin(HandleUpload, {
    clientService,
    language,
    route,
    space: computedSpace,
    userStore,
    spacesStore,
    messageStore,
    resourcesStore,
    uppyService
  })
}

let uploadCompletedSub: string

const { actions: pasteFileActions } = useFileActionsPaste()
const pasteFileAction = () => {
  return unref(pasteFileActions)[0].handler({ space: unref(computedSpace) })
}

const canUpload = computed(() => {
  return unref(currentFolder)?.canUpload({ user: userStore.user })
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

const onUploadComplete = async (result: UploadResult) => {
  const file = result.successful?.[0]
  if (!file) {
    return
  }

  const { spaceId, driveType } = file.meta
  if (!isPublicSpaceResource(unref(computedSpace))) {
    const isOwnSpace = spacesStore.spaces.find(({ id }) => id === spaceId)?.isOwner(userStore.user)

    if (driveType === 'project' || isOwnSpace) {
      const client = clientService.graphAuthenticated
      const updatedSpace = await client.drives.getDrive(spaceId)
      spacesStore.updateSpaceField({
        id: updatedSpace.id,
        field: 'spaceQuota',
        value: updatedSpace.spaceQuota
      })
    }
  }

  if (!unref(currentFolder) || spaceId !== unref(computedSpace).id) {
    return
  }

  const { children } = await clientService.webdav.listFiles(unref(computedSpace), {
    path: unref(currentFolder).path
  })

  const existingIds = new Set(resourcesStore.resources.map((r) => r.id))
  const newResources = children.filter((child) => !existingIds.has(child.id))
  resourcesStore.upsertResources(newResources)
}

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

onMounted(() => {
  uploadCompletedSub = uppyService.subscribe('uploadCompleted', onUploadComplete)
})

onBeforeUnmount(() => {
  uppyService.removePlugin(uppyService.getPlugin('HandleUpload'))
  uppyService.unsubscribe('uploadCompleted', uploadCompletedSub)
  uppyService.removeDropTarget()
})

watch(
  canUpload,
  () => {
    const targetSelector = '#files-view'
    const target = document.querySelector(targetSelector)

    if (target && unref(canUpload)) {
      uppyService.useDropTarget({ targetSelector })
    } else {
      uppyService.removeDropTarget()
    }
  },
  { immediate: true }
)

const showPasteHereButton = computed(() => {
  return unref(clipboardResources) && unref(clipboardResources).length !== 0
})

const showActions = computed(() => {
  return unref(canUpload) || !unref(isPublicLocation)
})
</script>
