<template>
  <div v-if="showActions" class="create-and-upload-actions inline-flex mr-2 gap-2">
    <div v-oc-tooltip="newButtonTooltip">
      <oc-button
        id="create-or-upload-menu-btn"
        key="create-or-upload-menu-btn-enabled"
        v-oc-tooltip="limitedScreenSpace ? $gettext('Create or Upload') : ''"
        :aria-label="newButtonAriaLabel"
        appearance="filled"
        :disabled="!canUpload"
      >
        <oc-icon name="add" />
        <span v-if="!limitedScreenSpace" v-text="$gettext('Create or Upload')" />
      </oc-button>
    </div>
    <oc-drop
      :title="$gettext('Create or Upload')"
      drop-id="create-or-upload-drop"
      toggle="#create-or-upload-menu-btn"
      class="w-auto min-w-3xs"
      mode="click"
      close-on-click
      padding-size="small"
      @show-drop="showDrop"
    >
      <oc-list
        id="create-list"
        :class="areFileExtensionsShown ? 'sm:min-w-xs' : null"
        class="py-2 sm:first:pt-0 sm:last:pb-0"
      >
        <li>
          <oc-button
            id="new-folder-btn"
            class="w-full"
            justify-content="left"
            appearance="raw"
            @click="createNewFolderAction"
          >
            <resource-icon
              :resource="folderIconResource"
              size="medium"
              class="[&_svg]:h-5.5! sm:[&_svg]:h-full"
            />
            <span v-text="$gettext('Folder')" />
          </oc-button>
        </li>
      </oc-list>
      <oc-list v-if="canUpload" id="upload-list" class="py-2 sm:first:pt-0 sm:last:pb-0 border-t">
        <li>
          <resource-upload btn-class="w-full" :btn-label="$gettext('Files Upload')" />
        </li>
        <li>
          <resource-upload
            btn-class="w-full"
            :btn-label="$gettext('Folder Upload')"
            :is-folder="true"
          />
        </li>
      </oc-list>
      <oc-list
        v-if="extensionActions.length"
        id="extension-list"
        class="py-2 sm:first:pt-0 sm:last:pb-0 border-t"
      >
        <li
          v-for="(action, key) in extensionActions"
          :key="`${key}-${actionKeySuffix}`"
          v-oc-tooltip="
            isActionDisabled(action) && action.disabledTooltip ? action.disabledTooltip() : null
          "
        >
          <oc-button
            class="w-full"
            :class="action.class"
            appearance="raw"
            justify-content="left"
            :disabled="isActionDisabled(action)"
            @click="() => action.handler()"
          >
            <oc-icon :name="getActionIcon(action)" fill-type="line" />
            <span v-text="action.label()"
          /></oc-button>
        </li>
      </oc-list>
      <oc-list
        v-for="(group, groupIndex) in createFileActionsGroups"
        :key="`file-creation-group-${groupIndex}`"
        class="py-2 sm:first:pt-0 sm:last:pb-0 border-t"
      >
        <li
          v-for="(fileAction, fileActionIndex) in group"
          :key="`file-creation-item-${groupIndex}-${fileActionIndex}`"
        >
          <oc-button
            appearance="raw"
            class="w-full"
            justify-content="left"
            :class="['new-file-btn-' + fileAction.ext]"
            @click="() => fileAction.handler()"
          >
            <resource-icon
              :resource="getIconResource(fileAction)"
              size="medium"
              class="[&_svg]:h-5.5! sm:[&_svg]:h-full"
            />
            <span>{{ fileAction.label() }}</span>
            <span v-if="areFileExtensionsShown && fileAction.ext" class="ml-auto text-sm">
              {{ fileAction.ext }}
            </span>
          </oc-button>
        </li>
      </oc-list>
      <oc-list class="py-2 sm:first:pt-0 sm:last:pb-0 border-t">
        <li>
          <oc-button
            id="new-shortcut-btn"
            class="w-full"
            justify-content="left"
            appearance="raw"
            @click="createNewShortcutAction"
          >
            <oc-icon name="external-link" size="medium" />
            <span v-text="$gettext('Shortcut')" />
            <span v-if="areFileExtensionsShown" class="ml-auto text-sm" v-text="'url'" />
          </oc-button>
        </li>
      </oc-list>
    </oc-drop>
    <div v-if="showPasteHereButton" id="clipboard-btns" class="oc-button-group">
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
  FileAction,
  isLocationPublicActive,
  useClipboardStore,
  useFileActionsCreateNewShortcut,
  useMessages,
  useResourcesStore,
  useRoute,
  useSpacesStore,
  useUserStore,
  useActiveLocation,
  useFileActionsCreateNewFile,
  useFileActionsCreateNewFolder,
  useFileActionsPaste,
  useClientService
} from '@opencloud-eu/web-pkg'

import { computed, onMounted, onBeforeUnmount, unref, watch, ref } from 'vue'
import { Resource, SpaceResource, isPublicSpaceResource } from '@opencloud-eu/web-client'
import { useService, useUpload, UppyService, UploadResult } from '@opencloud-eu/web-pkg'
import { HandleUpload } from '../../HandleUpload'
import { useGettext } from 'vue3-gettext'
import { useExtensionRegistry } from '@opencloud-eu/web-pkg'
import { Action, ResourceIcon } from '@opencloud-eu/web-pkg'
import { v4 as uuidV4 } from 'uuid'
import { storeToRefs } from 'pinia'
import { uploadMenuExtensionPoint } from '../../extensionPoints'
import ResourceUpload from './Upload/ResourceUpload.vue'

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

const areFileExtensionsShown = computed(() => unref(resourcesStore.areFileExtensionsShown))

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

const { actions: createNewFolder } = useFileActionsCreateNewFolder({ space: computedSpace })
const createNewFolderAction = () => {
  return unref(createNewFolder)[0].handler()
}

const { actions: createNewShortcut } = useFileActionsCreateNewShortcut({ space: computedSpace })
const createNewShortcutAction = () => {
  return unref(createNewShortcut)[0].handler()
}

const { actions: createNewFileActions } = useFileActionsCreateNewFile({ space: computedSpace })

const createFileActionsGroups = computed(() => {
  const result: FileAction[][] = []
  const externalFileActions = unref(createNewFileActions).filter(({ isExternal }) => isExternal)
  if (externalFileActions.length) {
    result.push(externalFileActions)
  }
  const appFileActions = unref(createNewFileActions).filter(({ isExternal }) => !isExternal)
  if (appFileActions.length) {
    result.push(appFileActions)
  }
  return result
})

const extensionRegistry = useExtensionRegistry()
const extensionActions = computed(() => {
  return [
    ...extensionRegistry.requestExtensions(uploadMenuExtensionPoint).map((e) => e.action)
  ].filter((e) => e.isVisible())
})

const canUpload = computed(() => {
  return unref(currentFolder)?.canUpload({ user: userStore.user })
})

const actionKeySuffix = ref(uuidV4())
const showDrop = () => {
  // force actions to be re-rendered when the drop is being opened
  actionKeySuffix.value = uuidV4()
}

const isActionDisabled = (action: Action) => {
  return action.isDisabled ? action.isDisabled() : false
}

const getActionIcon = (action: Action) => {
  return typeof action.icon === 'function'
    ? action.icon({ space: unref(computedSpace) })
    : action.icon
}

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

const getIconResource = (fileHandler: FileAction) => {
  return { type: 'file', extension: fileHandler.ext } as Resource
}

const showPasteHereButton = computed(() => {
  return unref(clipboardResources) && unref(clipboardResources).length !== 0
})

const showActions = computed(() => {
  return unref(canUpload) || !unref(isPublicLocation)
})

const newButtonTooltip = computed(() => {
  if (!unref(canUpload)) {
    return $gettext('You have no permission to create or upload files')
  }
  return null
})
const newButtonAriaLabel = computed(() => {
  if (unref(newButtonTooltip)) {
    return unref(newButtonTooltip)
  }

  return $gettext('Create or upload')
})

const folderIconResource = computed(() => {
  return { isFolder: true, extension: '' } as Resource
})
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer utilities {
  .create-and-upload-actions .oc-drop .oc-icon svg {
    /* reset the resource icon height because the ResourceIcon component messes with it */
    @apply h-5.5;
  }
}x
</style>
