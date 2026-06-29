<template>
  <div class="flex w-full">
    <whitespace-context-menu :space="space" />
    <files-view-wrapper>
      <app-bar
        :breadcrumbs="breadcrumbs"
        :breadcrumbs-context-actions-items="[currentFolder]"
        :has-bulk-actions="displayFullAppBar"
        :show-actions-on-selection="displayFullAppBar"
        :has-view-options="displayFullAppBar"
        :space="space"
        :view-modes="viewModes"
        @item-dropped="fileDropped"
      />
      <app-loading-spinner v-if="areResourcesLoading" />
      <template v-else>
        <not-found-message
          v-if="folderNotFound"
          :space="space"
          :class="{ 'h-[40vh]': isSpaceFrontpage }"
        />
        <template v-else>
          <space-header v-if="isSpaceFrontpage" :space="space" class="px-4" />
          <no-content-message
            v-if="isCurrentFolderEmpty"
            id="files-space-empty"
            :class="{ 'h-[40vh]': isSpaceFrontpage }"
            img-src="/images/empty-states/empty-folder.svg"
          >
            <template #message>
              <span v-text="$gettext('No files found')" />
            </template>
            <template #callToAction>
              <span v-if="canUpload" class="file-empty-upload-hint" v-text="uploadHint" />
            </template>
          </no-content-message>
          <template v-else>
            <list-header
              v-if="readmeFile && !isSpaceFrontpage"
              :space="space"
              :readme-file="readmeFile"
              class="mx-4 my-2"
            />
            <resource-details
              v-if="displayResourceAsSingleResource"
              :single-resource="paginatedResources[0]"
              :space="space"
            />
            <component
              :is="folderView.component"
              v-else
              v-model:selected-ids="selectedResourcesIds"
              :resources="paginatedResources"
              :view-mode="viewMode"
              :space="space"
              :drag-drop="true"
              :sort-by="sortBy"
              :sort-dir="sortDir"
              :header-position="fileListHeaderY /* table */"
              :sort-fields="sortFields /* tiles */"
              :view-size="viewSize /* tiles */"
              v-bind="folderView.componentAttrs?.()"
              @file-dropped="fileDropped"
              @file-click="triggerDefaultAction"
              @item-visible="loadPreview({ space, resource: $event })"
              @sort="handleSort"
            >
              <template #contextMenu="{ resource }">
                <context-actions
                  v-if="isResourceInSelection(resource)"
                  :action-options="{ space, resources: selectedResources }"
                />
              </template>

              <template #footer>
                <pagination :pages="paginationPages" :current-page="paginationPage" />
                <list-info v-if="paginatedResources.length > 0" class="w-full my-2" />
              </template>
              <template #quickActions="{ resource }">
                <quick-actions
                  :class="resource.preview"
                  class="hidden sm:block"
                  :space="space"
                  :item="resource"
                />
              </template>
            </component>
          </template>
        </template>
      </template>
    </files-view-wrapper>
    <file-side-bar :space="space" />
  </div>
</template>

<script setup lang="ts">
import { omit, last } from 'lodash-es'
import { basename } from 'path'
import { computed, onBeforeUnmount, onMounted, unref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import { Resource } from '@opencloud-eu/web-client'
import {
  isPersonalSpaceResource,
  isProjectSpaceResource,
  isPublicSpaceResource,
  isShareSpaceResource,
  SpaceResource
} from '@opencloud-eu/web-client'

import {
  ResourceTransfer,
  TransferType,
  getVaultClaim,
  useExtensionRegistry,
  useFileActions,
  useLoadPreview,
  useMessages,
  usePasteWorker,
  useResourcesStore,
  useRouter,
  useUserStore,
  AppBar,
  AppLoadingSpinner,
  ContextActions,
  FileSideBar,
  NoContentMessage,
  Pagination,
  createFileRouteOptions,
  createLocationPublic,
  createLocationSpaces,
  useBreadcrumbsFromPath,
  useClientService,
  useDocumentTitle,
  useOpenWithDefaultApp,
  useKeyboardActions,
  useRoute,
  useRouteQuery,
  FolderLoaderOptions,
  useClipboardStore,
  useService,
  UppyService
} from '@opencloud-eu/web-pkg'
import FilesViewWrapper from '../../components/FilesViewWrapper.vue'
import ListInfo from '../../components/FilesList/ListInfo.vue'
import NotFoundMessage from '../../components/FilesList/NotFoundMessage.vue'
import QuickActions from '../../components/FilesList/QuickActions.vue'
import ResourceDetails from '../../components/FilesList/ResourceDetails.vue'
import SpaceHeader from '../../components/Spaces/SpaceHeader.vue'
import WhitespaceContextMenu from '../../components/Spaces/WhitespaceContextMenu.vue'
import { eventBus } from '@opencloud-eu/web-pkg'
import { useFileUpload, useResourcesViewDefaults } from '../../composables'
import { BreadcrumbItem } from '@opencloud-eu/design-system/helpers'
import { v4 as uuidV4 } from 'uuid'
import {
  useKeyboardFileMouseActions,
  useKeyboardFileNavigation,
  useKeyboardFileSpaceActions
} from '../../composables/keyboardActions'
import { storeToRefs } from 'pinia'
import { folderViewsFolderExtensionPoint } from '../../extensionPoints'
import ListHeader from '../../components/FilesList/ListHeader.vue'
import { useEventListener } from '@vueuse/core'

const props = defineProps<{
  space?: SpaceResource
  item?: string
  itemId?: string
}>()

const router = useRouter()
const userStore = useUserStore()
const { $gettext, $ngettext } = useGettext()
const { showMessage } = useMessages()
const extensionRegistry = useExtensionRegistry()
const openWithDefaultAppQuery = useRouteQuery('openWithDefaultApp')
const clientService = useClientService()
const { startWorker } = usePasteWorker()
const { breadcrumbsFromPath, concatBreadcrumbs } = useBreadcrumbsFromPath()
const { openWithDefaultApp } = useOpenWithDefaultApp()
const { triggerDefaultAction } = useFileActions()
const clipboardStore = useClipboardStore()
const uppyService = useService<UppyService>('$uppyService')

const space = computed(() => props.space)

useFileUpload(space)

const resourcesStore = useResourcesStore()
const { removeResources, resetSelection } = resourcesStore
const { currentFolder, totalResourcesCount, ancestorMetaData } = storeToRefs(resourcesStore)

let loadResourcesEventToken: string

const canUpload = computed(() => {
  return unref(currentFolder)?.canUpload({ user: userStore.user })
})

const folderNotFound = computed(() => unref(currentFolder) === null)
const isCurrentFolderEmpty = computed(() => unref(paginatedResources).length < 1)

const titleSegments = computed(() => {
  const spaceResource = unref(space)
  let title = spaceResource.name
  if (isPublicSpaceResource(spaceResource)) {
    title =
      spaceResource.publicLinkType === 'ocm' ? $gettext('OCM share') : $gettext('Public files')
  }

  const segments = [title]
  if (props.item !== '/') {
    segments.unshift(basename(props.item))
  }

  return segments
})
useDocumentTitle({ titleSegments })

const route = useRoute()
const breadcrumbs = computed(() => {
  const rootBreadcrumbItems: BreadcrumbItem[] = []
  if (isProjectSpaceResource(unref(space))) {
    rootBreadcrumbItems.push({
      id: uuidV4(),
      text: $gettext('Spaces'),
      to: createLocationSpaces('files-spaces-projects'),
      isStaticNav: true
    })
  } else if (isShareSpaceResource(unref(space))) {
    rootBreadcrumbItems.push(
      {
        id: uuidV4(),
        text: $gettext('Shares'),
        to: { path: '/files/shares' },
        isStaticNav: true
      },
      {
        id: uuidV4(),
        text: $gettext('Shared with me'),
        to: { path: '/files/shares/with-me' },
        isStaticNav: true
      }
    )
  }

  let spaceBreadcrumbItem: BreadcrumbItem
  let { params, query } = createFileRouteOptions(unref(space), { fileId: unref(space).fileId })
  query = omit({ ...unref(route).query, ...query }, 'page')
  if (isPersonalSpaceResource(unref(space))) {
    spaceBreadcrumbItem = {
      id: uuidV4(),
      text: unref(space).name,
      ...(unref(space).isOwner(userStore.user) && {
        to: createLocationSpaces('files-spaces-generic', {
          params,
          query
        })
      })
    }
  } else if (isShareSpaceResource(unref(space))) {
    spaceBreadcrumbItem = {
      id: uuidV4(),
      allowContextActions: true,
      text: unref(space).name,
      to: createLocationSpaces('files-spaces-generic', {
        params,
        query: omit(query, 'fileId')
      })
    }
  } else if (isPublicSpaceResource(unref(space))) {
    spaceBreadcrumbItem = {
      id: uuidV4(),
      text: $gettext('Public link'),
      to: createLocationPublic('files-public-link', {
        params,
        query
      }),
      isStaticNav: true
    }
  } else {
    spaceBreadcrumbItem = {
      id: uuidV4(),
      allowContextActions: !unref(isSpaceFrontpage),
      text: unref(space).name,
      to: createLocationSpaces('files-spaces-generic', {
        params,
        query
      })
    }
  }

  return concatBreadcrumbs(
    ...rootBreadcrumbItems,
    spaceBreadcrumbItem,
    ...breadcrumbsFromPath({
      route: unref(route),
      resourcePath: props.item,
      ...ancestorMetaData
    })
  )
})

const focusAndAnnounceBreadcrumb = (sameRoute: boolean) => {
  const breadcrumbEl = document.getElementById('files-breadcrumb')
  if (!breadcrumbEl) {
    return
  }
  const activeBreadcrumb = last(breadcrumbEl.children[0].children)
  const activeBreadcrumbItem = activeBreadcrumb.getElementsByTagName('button')[0]
  if (!activeBreadcrumbItem) {
    return
  }

  const totalFilesCount = unref(totalResourcesCount)
  const itemCount = totalFilesCount.files + totalFilesCount.folders

  const announcement = $ngettext(
    'This folder contains %{ amount } item.',
    'This folder contains %{ amount } items.',
    itemCount,
    { amount: itemCount.toString() }
  )

  const translatedHint = itemCount > 0 ? announcement : $gettext('This folder has no content.')

  document.querySelectorAll('.oc-breadcrumb-sr').forEach((el) => el.remove())

  const invisibleHint = document.createElement('p')
  invisibleHint.className = 'sr-only oc-breadcrumb-sr'
  invisibleHint.innerHTML = translatedHint

  activeBreadcrumb.append(invisibleHint)
  if (sameRoute) {
    activeBreadcrumbItem.focus()
  }
}

const {
  paginationPage,
  paginationPages,
  areResourcesLoading,
  folderView,
  fileListHeaderY,
  selectedResourcesIds,
  sortBy,
  sortDir,
  sortFields,
  viewSize,
  handleSort,
  paginatedResources,
  viewMode,
  viewModes,
  loadResourcesTask,
  selectedResources,
  refreshFileListHeaderPosition,
  isResourceInSelection,
  scrollToResourceFromRoute
} = useResourcesViewDefaults<Resource, any, any[]>({
  folderViewExtensionPoint: folderViewsFolderExtensionPoint
})

const { loadPreview } = useLoadPreview(viewMode)

const keyActions = useKeyboardActions()
useKeyboardFileNavigation(keyActions, paginatedResources, viewMode)
useKeyboardFileMouseActions(keyActions, viewMode)
useKeyboardFileSpaceActions(keyActions, space)

const performLoaderTask = async (sameRoute: boolean, path?: string, fileId?: string) => {
  if (loadResourcesTask.isRunning) {
    loadResourcesTask.cancelAll()
  }

  const options: FolderLoaderOptions = { loadShares: !isPublicSpaceResource(unref(space)) }

  try {
    await loadResourcesTask.perform(
      unref(space),
      path || props.item,
      fileId || props.itemId,
      options
    )
  } catch (e) {
    console.error(e)
  }

  scrollToResourceFromRoute([unref(currentFolder), ...unref(paginatedResources)], 'files-app-bar')
  refreshFileListHeaderPosition()
  focusAndAnnounceBreadcrumb(sameRoute)

  if (unref(openWithDefaultAppQuery) === 'true') {
    openWithDefaultApp({
      space: unref(space),
      resource: unref(selectedResources)[0]
    })
  }
}

const readmeFile = computed(() => {
  return resourcesStore.resources.find((item) =>
    ['readme.md', '.readme.md'].includes(item.name.toLowerCase())
  )
})

onMounted(() => {
  performLoaderTask(false)
  loadResourcesEventToken = eventBus.subscribe(
    'app.files.list.load',
    (path?: string, fileId?: string) => {
      performLoaderTask(true, path, fileId)
    }
  )
})

onBeforeUnmount(() => {
  eventBus.unsubscribe('app.files.list.load', loadResourcesEventToken)
  resourcesStore.setCurrentFolder(null)
})

const fileDropped = async (fileTarget: string | { name: string; path: string }) => {
  const selected = [...unref(selectedResources)]
  let targetFolder: Resource = null
  if (typeof fileTarget === 'string') {
    targetFolder = unref(paginatedResources).find((e) => e.id === fileTarget)
    const isTargetSelected = selected.some((e) => e.id === fileTarget)
    if (isTargetSelected) {
      return
    }
  } else if (fileTarget instanceof Object) {
    const spaceRootRoutePath = router.resolve(
      createLocationSpaces('files-spaces-generic', {
        params: {
          driveAliasAndItem: unref(space).driveAlias
        }
      })
    ).path

    const splitIndex = fileTarget.path.indexOf(spaceRootRoutePath) + spaceRootRoutePath.length
    const path = decodeURIComponent(fileTarget.path.slice(splitIndex, fileTarget.path.length))

    try {
      targetFolder = await clientService.webdav.getFileInfo(unref(space), { path })
    } catch (e) {
      console.error(e)
      return
    }
  }

  if (!targetFolder || targetFolder.type !== 'folder') {
    return
  }

  // ResourceTransfer is vault-unaware (cleartext listing + path join), so a
  // drag-move into or out of a vault would read/write at the wrong, cleartext
  // paths. Block it whenever a vault is involved on either side. getVaultClaim
  // is a cheap, path-based check that also covers a target fetched via
  // getFileInfo (which doesn't carry the isInVault flag).
  if (
    selected.some((r) => r.isInVault) ||
    getVaultClaim(extensionRegistry, unref(space), targetFolder.path)
  ) {
    showMessage({
      title: $gettext('Moving items into or out of a vault by drag and drop is not supported')
    })
    return
  }

  const resourceTransfer = new ResourceTransfer(
    unref(space),
    selected,
    unref(space),
    targetFolder,
    currentFolder,
    clientService,
    $gettext,
    $ngettext
  )

  const transferData = await resourceTransfer.getTransferData(TransferType.MOVE)

  startWorker(transferData, ({ successful }) => {
    removeResources(successful)
    resetSelection()
  })
}

const uploadHint = computed(() =>
  $gettext('Drag files and folders here or use the "New" button to add files')
)

const displayResourceAsSingleResource = computed(() => {
  if (unref(paginatedResources).length !== 1) {
    return false
  }

  if (unref(paginatedResources)[0].isFolder) {
    return false
  }

  if (isPublicSpaceResource(unref(space)) && !unref(currentFolder)?.fileId) {
    return true
  }

  return false
})

const displayFullAppBar = computed(() => {
  return !unref(displayResourceAsSingleResource)
})

const isSpaceFrontpage = computed(() => {
  return isProjectSpaceResource(unref(space)) && props.item === '/'
})

watch(
  () => [props.item, props.space?.id],
  () => {
    performLoaderTask(true)
  }
)

useEventListener(document, 'paste', (event: ClipboardEvent) => {
  // Ignore file in clipboard if there are already files from OpenCloud in the clipboard
  if (clipboardStore.resources.length || !unref(canUpload)) {
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
