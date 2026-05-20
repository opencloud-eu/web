<template>
  <main
    :id="extension.appId"
    class="app-wrapper h-full rounded-xl"
    :class="{ 'border-0': extension.appId.startsWith('external-') }"
    @keydown.esc="closeApp"
  >
    <h1 class="sr-only" v-text="pageTitle" />
    <loading-screen v-if="loading" />
    <error-screen v-else-if="loadingError" :message="loadingError.message" />
    <div v-else class="flex size-full">
      <component
        :is="extension.component"
        class="app-wrapper-content size-full"
        :class="{ 'w-[calc(100%-360px)]': isSideBarOpen && !isMobile }"
        v-bind="editorBindings"
      />
      <file-side-bar :space="space" />
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { onBeforeRouteLeave } from 'vue-router'
import { storeToRefs } from 'pinia'

import AppTopBar from '../AppTopBar.vue'
import ErrorScreen from './PartialViews/ErrorScreen.vue'
import LoadingScreen from './PartialViews/LoadingScreen.vue'
import FileSideBar from '../SideBar/FileSideBar.vue'
import { UnsavedChangesModal } from '../Modals'
import {
  Action,
  ActionExtension,
  CustomComponentExtension,
  FileAction,
  FileActionOptions,
  Key,
  Modifier,
  useAppMeta,
  useAppsStore,
  useExtensionRegistry,
  useFileActionsDelete,
  useFileActionsDownloadFile,
  useFileActionsOpenWithApp,
  useFileActionsSaveAs,
  useKeyboardActions,
  useMessages,
  useModals,
  useResourceEditor,
  useSideBar,
  type ResourceEditorExtension
} from '../../composables'
import { useIsMobile } from '@opencloud-eu/design-system/composables'

const { extension } = defineProps<{
  extension: ResourceEditorExtension
}>()

const { $gettext } = useGettext()
const { isMobile } = useIsMobile()
const sidebarStore = useSideBar()
const { isSideBarOpen } = storeToRefs(sidebarStore)
const appsStore = useAppsStore()
const { dispatchModal } = useModals()
const { showMessage } = useMessages()

const {
  resource,
  space,
  url,
  currentContent,
  isDirty,
  isEditor,
  isReadOnly,
  loading,
  loadingError,
  applicationConfig,
  currentFileContext,
  activeFiles,
  isFolderLoading,
  save,
  closeApp,
  loadFolderForFileContext,
  getUrlForResource,
  revokeUrl,
  setCurrentContent,
  setResource,
  registerOnDeleteResourceCallback
} = useResourceEditor({ extension: () => extension })

const { actions: openWithAppActions } = useFileActionsOpenWithApp({ appId: extension.appId })
const { actions: downloadFileActions } = useFileActionsDownloadFile()
const { actions: deleteFileActions } = useFileActionsDelete()
const { actions: saveAsActions } = useFileActionsSaveAs({ content: currentContent })

const { applicationMeta } = useAppMeta({ applicationId: extension.appId, appsStore })

const pageTitle = computed(() => {
  const { name: appName } = unref(applicationMeta)
  return $gettext(`%{appName} for %{fileName}`, {
    appName: $gettext(appName),
    fileName: unref(unref(currentFileContext).fileName)
  })
})

const actionOptions = computed<FileActionOptions>(() => ({
  space: unref(space),
  resources: [unref(resource)]
}))

const autosavePopup = () => {
  showMessage({ title: $gettext('File autosaved') })
}

const downloadFileActionInterceptor = async (
  args: FileActionOptions,
  originalAction: Action<FileActionOptions>['handler']
) => {
  if (unref(isDirty)) {
    await save()
    autosavePopup()
  }
  originalAction(args)
}

const fileActionsSave = computed<FileAction[]>(() => [
  {
    name: 'save-file',
    disabledTooltip: () => '',
    isVisible: () => unref(isEditor) && !unref(isReadOnly),
    isDisabled: () => !unref(isDirty),
    icon: 'save',
    id: 'app-save-action',
    label: () => $gettext('Save'),
    handler: save
  }
])

const fileActions = computed((): Action[] => [...unref(fileActionsSave)])

const { registerExtensions, unregisterExtensions, requestExtensions } = useExtensionRegistry()
const topBarExtensionId = 'app.app-wrapper.app-top-bar'

const extensionContextActions = computed(() => {
  return (
    requestExtensions<ActionExtension>({
      id: 'global.files.context-actions',
      extensionType: 'action'
    }) || []
  ).map((e) => e.action)
})

const menuItemsPrimary = computed(() => {
  return [
    ...unref(openWithAppActions),
    ...unref(fileActionsSave),
    ...unref(saveAsActions).map((action) => ({
      ...action,
      isVisible: (args: FileActionOptions) => unref(isEditor) && action.isVisible(args)
    }))
  ].filter((item) => item.isVisible(unref(actionOptions)))
})

const menuItemsSecondary = computed(() => {
  return unref(extensionContextActions)
    .filter((action) => action.category === 'secondary')
    .filter((item) => item.isVisible(unref(actionOptions)))
})

const menuItemsTertiary = computed(() => {
  return [
    ...unref(downloadFileActions).map((originalAction) => ({
      ...originalAction,
      handler: (args: FileActionOptions) =>
        downloadFileActionInterceptor(args, originalAction.handler)
    })),
    ...unref(deleteFileActions)
  ].filter((item) => item.isVisible(unref(actionOptions)))
})

const menuItemsQuaternary = computed(() => {
  return unref(extensionContextActions)
    .filter((action) => action.category === 'quaternary')
    .filter((item) => item.isVisible(unref(actionOptions)))
})

const dropDownMenuSections = computed(() => {
  const sections: Array<{ name: string; items: unknown[] }> = []
  if (unref(menuItemsPrimary).length) {
    sections.push({ name: 'primary', items: unref(menuItemsPrimary) })
  }
  if (unref(menuItemsSecondary).length) {
    sections.push({ name: 'secondary', items: unref(menuItemsSecondary) })
  }
  if (unref(menuItemsTertiary).length) {
    sections.push({ name: 'tertiary', items: unref(menuItemsTertiary) })
  }
  if (unref(menuItemsQuaternary).length) {
    sections.push({ name: 'quaternary', items: unref(menuItemsQuaternary) })
  }
  return sections
})

const appBarExtension = computed<CustomComponentExtension[]>(() => {
  if (unref(loading) || unref(loadingError) || !unref(resource)) {
    return []
  }
  return [
    {
      id: topBarExtensionId,
      type: 'customComponent',
      extensionPointIds: ['app.runtime.header.left'],
      content: AppTopBar,
      componentProps: () => ({
        resource: unref(resource),
        isReadOnly: unref(isReadOnly),
        isEditor: unref(isEditor),
        hasAutoSave: !extension.disableAutoSave,
        mainActions: unref(fileActions),
        dropDownMenuSections: unref(dropDownMenuSections),
        dropDownActionOptions: unref(actionOptions),
        onClose: () => closeApp()
      })
    }
  ]
})

registerExtensions(appBarExtension)

// Safety net for unmounts that don't go through vue-router (HMR, parent
// KeepAlive flush, programmatic route swap that replaces the component
// without firing onBeforeRouteLeave on this leaf). onBeforeRouteLeave still
// runs ahead of unmount in normal navigation; this is purely belt-and-braces.
onBeforeUnmount(() => {
  unregisterExtensions([topBarExtensionId])
})

const { bindKeyAction } = useKeyboardActions({ skipDisabledKeyBindingsCheck: true })
bindKeyAction({ modifier: Modifier.Ctrl, primary: Key.S }, () => {
  if (!unref(isDirty)) {
    return
  }
  save()
})

onBeforeRouteLeave((_to, _from, next) => {
  if (unref(isDirty)) {
    dispatchModal({
      title: $gettext('Unsaved changes'),
      customComponent: UnsavedChangesModal,
      focusTrapInitial: '.oc-modal-body-actions-confirm',
      hideActions: true,
      hideCancelButton: true,
      customComponentAttrs: () => ({
        closeCallback: () => {
          unregisterExtensions([topBarExtensionId])
          next()
        }
      }),
      async onConfirm() {
        unregisterExtensions([topBarExtensionId])
        await save()
        next()
      }
    })
  } else {
    unregisterExtensions([topBarExtensionId])
    next()
  }
})

// Props handed to the embedded editor/viewer component. We forward the
// superset; Vue only binds the keys the component declared in `props`/`emits`.
const editorBindings = computed(() => ({
  url: unref(url),
  space: unref(space),
  resource: unref(resource),
  activeFiles: unref(activeFiles),
  isDirty: unref(isDirty),
  isReadOnly: unref(isReadOnly),
  applicationConfig: unref(applicationConfig),
  currentFileContext: unref(currentFileContext),
  currentContent: unref(currentContent),
  isFolderLoading: unref(isFolderLoading),

  'onUpdate:resource': setResource,
  'onUpdate:currentContent': setCurrentContent,
  'onRegister:onDeleteResourceCallback': registerOnDeleteResourceCallback,
  'onDelete:resource': () => {
    const [deleteAction] = unref(deleteFileActions)
    if (!deleteAction.isVisible({ space: unref(space), resources: [unref(resource)] })) {
      return
    }
    deleteAction.handler({ space: unref(space), resources: [unref(resource)] })
  },

  onSave: save,
  onClose: closeApp,
  loadFolderForFileContext,
  revokeUrl,
  getUrlForResource
}))
</script>
