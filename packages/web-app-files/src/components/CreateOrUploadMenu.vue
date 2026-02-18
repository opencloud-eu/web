<template>
  <oc-drop
    :title="$gettext('New')"
    :toggle="toggle"
    class="create-or-upload-drop w-auto min-w-3xs"
    mode="click"
    close-on-click
    padding-size="small"
    :offset="[-10, 0]"
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
</template>

<script setup lang="ts">
import {
  FileAction,
  useFileActionsCreateNewShortcut,
  useResourcesStore,
  useUserStore,
  useFileActionsCreateNewFile,
  useFileActionsCreateNewFolder,
  useSpacesStore
} from '@opencloud-eu/web-pkg'

import { computed, unref, ref } from 'vue'
import { Resource } from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'
import { useExtensionRegistry } from '@opencloud-eu/web-pkg'
import { Action, ResourceIcon } from '@opencloud-eu/web-pkg'
import { v4 as uuidV4 } from 'uuid'
import { storeToRefs } from 'pinia'
import { uploadMenuExtensionPoint } from '../extensionPoints'
import ResourceUpload from './AppBar/Upload/ResourceUpload.vue'

const { toggle } = defineProps<{
  toggle: string
}>()

const userStore = useUserStore()
const language = useGettext()
const { $gettext } = language

const resourcesStore = useResourcesStore()
const { currentFolder } = storeToRefs(resourcesStore)

const spacesStore = useSpacesStore()
const { currentSpace } = storeToRefs(spacesStore)

const areFileExtensionsShown = computed(() => unref(resourcesStore.areFileExtensionsShown))

const { actions: createNewFolder } = useFileActionsCreateNewFolder({ space: currentSpace })
const createNewFolderAction = () => {
  return unref(createNewFolder)[0].handler()
}

const { actions: createNewShortcut } = useFileActionsCreateNewShortcut({ space: currentSpace })
const createNewShortcutAction = () => {
  return unref(createNewShortcut)[0].handler()
}

const { actions: createNewFileActions } = useFileActionsCreateNewFile({ space: currentSpace })

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
    ? action.icon({ space: unref(currentSpace) })
    : action.icon
}

const getIconResource = (fileHandler: FileAction) => {
  return { type: 'file', extension: fileHandler.ext } as Resource
}

const folderIconResource = computed(() => {
  return { isFolder: true, extension: '' } as Resource
})
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer utilities {
  .create-or-upload-drop .oc-icon svg {
    /* reset the resource icon height because the ResourceIcon component messes with it */
    @apply h-5.5;
  }
}
</style>
