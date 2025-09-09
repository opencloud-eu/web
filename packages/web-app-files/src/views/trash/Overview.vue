<template>
  <div v-if="ready" class="flex">
    <files-view-wrapper>
      <app-bar
        :breadcrumbs="breadcrumbs"
        :has-view-options="true"
        :has-hidden-files="false"
        :has-file-extensions="false"
        :has-pagination="false"
      />
      <app-loading-spinner v-if="areResourcesLoading" />
      <template v-else>
        <no-content-message v-if="!spaces.length" icon="delete-bin-5">
          <template #message>
            <span v-text="$gettext('You don\'t have access to any trashbins')"></span>
          </template>
        </no-content-message>
        <template v-else>
          <div class="flex justify-end flex-wrap items-end mx-4 mb-4">
            <oc-text-input
              id="trash-filter"
              v-model="filterTerm"
              class="w-3xs"
              :label="$gettext('Search')"
              autocomplete="off"
            />
          </div>
          <resource-table
            class="trash-table"
            :resources="displaySpaces"
            :fields-displayed="['name']"
            :sort-by="sortBy"
            :sort-dir="sortDir"
            :is-side-bar-open="isSideBarOpen"
            :header-position="fileListHeaderY"
            :are-thumbnails-displayed="false"
            :are-paths-displayed="false"
            :is-selectable="false"
            :show-rename-quick-action="false"
            :target-route-callback="resourceTargetRouteCallback"
            @sort="handleSort"
          >
            <template #contextMenu="{ resource, isOpen }">
              <trash-context-actions
                v-if="isOpen"
                :loading="resource.graphPermissions === undefined"
                :action-options="{ resources: [resource] as SpaceResource[] }"
              />
            </template>
            <template #quickActions="{ resource }">
              <trash-quick-actions :space="resource" :item="resource" />
            </template>
            <template #footer>
              <div class="text-center w-full my-2">
                <p class="text-role-on-surface-variant">{{ footerTextTotal }}</p>
                <p v-if="filterTerm" class="text-role-on-surface-variant">{{ footerTextFilter }}</p>
              </div>
            </template>
          </resource-table>
        </template>
      </template>
    </files-view-wrapper>
    <file-side-bar :is-open="isSideBarOpen" :active-panel="sideBarActivePanel" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, unref, watch } from 'vue'
import Mark from 'mark.js'
import Fuse from 'fuse.js'
import { useGettext } from 'vue3-gettext'
import { useTask } from 'vue-concurrency'
import {
  AppBar,
  AppLoadingSpinner,
  createFileRouteOptions,
  createLocationTrash,
  CreateTargetRouteOptions,
  defaultFuseOptions,
  FileSideBar,
  NoContentMessage,
  SortDir,
  useClientService,
  useFileListHeaderPosition,
  useResourcesStore,
  useRouter,
  useSideBar,
  useSpacesStore,
  useUserStore
} from '@opencloud-eu/web-pkg'
import FilesViewWrapper from '../../components/FilesViewWrapper.vue'
import {
  call,
  isPersonalSpaceResource,
  isProjectSpaceResource,
  SpaceResource
} from '@opencloud-eu/web-client'
import { ResourceTable } from '@opencloud-eu/web-pkg/src'
import { RouteLocationNamedRaw } from 'vue-router'
import TrashContextActions from '../../components/Trash/TrashContextActions.vue'
import TrashQuickActions from '../../components/Trash/TrashQuickActions.vue'
import { storeToRefs } from 'pinia'

const userStore = useUserStore()
const spacesStore = useSpacesStore()
const router = useRouter()
const { $gettext, $ngettext } = useGettext()
const clientService = useClientService()
const { y: fileListHeaderY } = useFileListHeaderPosition()
const { isSideBarOpen, sideBarActivePanel } = useSideBar()
const resourcesStore = useResourcesStore()

const { areEmptyTrashesShown } = storeToRefs(resourcesStore)

const ready = ref(false)
const sortBy = ref<keyof SpaceResource>('name')
const sortDir = ref<SortDir>(SortDir.Asc)
const filterTerm = ref('')
const markInstance = ref<Mark>()

const spaces = computed(() =>
  spacesStore.spaces.filter(
    (s: SpaceResource) =>
      (isPersonalSpaceResource(s) && s.isOwner(userStore.user)) ||
      (isProjectSpaceResource(s) && !s.disabled)
  )
)

const loadResourcesTask = useTask(function* (signal) {
  resourcesStore.clearResourceList()

  const fetchedSpaces = yield* call(
    clientService.graphAuthenticated.drives.listMyDrives(
      {
        select: ['@libre.graph.hasTrashedItems']
      },
      { signal }
    )
  )

  const reloadedSpaces = fetchedSpaces
    .filter(
      (fetchedSpace) =>
        isPersonalSpaceResource(fetchedSpace) || isProjectSpaceResource(fetchedSpace)
    )
    .map((fetchedSpace) => {
      if (isPersonalSpaceResource(fetchedSpace)) {
        fetchedSpace.name = $gettext('Personal')
      }
      return fetchedSpace
    })

  reloadedSpaces.forEach((reloadedSpace) => {
    spacesStore.upsertSpace(reloadedSpace)
  })

  yield spacesStore.loadGraphPermissions({
    ids: unref(spaces).map((space) => space.id),
    graphClient: clientService.graphAuthenticated
  })
  resourcesStore.initResourceList({ currentFolder: null, resources: unref(spaces) })
})

const areResourcesLoading = computed(() => loadResourcesTask.isRunning || !loadResourcesTask.last)

const footerTextTotal = computed(() => {
  const emptyTrashSpaces = unref(spaces).filter((s) => s.hasTrashedItems === false)

  if (!emptyTrashSpaces.length) {
    return $ngettext(
      '%{spaceCount} trash bin in total',
      '%{spaceCount} trash bins in total',
      unref(spaces).length,
      {
        spaceCount: unref(spaces).length.toString()
      }
    )
  }

  return $ngettext(
    '%{spaceCount} trash bin in total (including %{emptyTrashCount} empty)',
    '%{spaceCount} trash bins in total (including %{emptyTrashCount} empty)',
    unref(spaces).length,
    {
      spaceCount: unref(spaces).length.toString(),
      emptyTrashCount: emptyTrashSpaces.length.toString()
    }
  )
})

const footerTextFilter = computed(() =>
  $ngettext(
    '%{spaceCount} matching trash bin',
    '%{spaceCount} matching trash bins',
    unref(displaySpaces).length,
    {
      spaceCount: unref(displaySpaces).length.toString()
    }
  )
)

const breadcrumbs = computed(() => [
  { text: $gettext('Deleted files'), onClick: () => loadResourcesTask.perform() }
])

const sort = (list: SpaceResource[], propName: keyof SpaceResource, desc: boolean) => {
  return [...list].sort((s1, s2) => {
    if (isPersonalSpaceResource(s1)) return -1
    if (isPersonalSpaceResource(s2)) return 1
    const a = s1[propName].toString()
    const b = s2[propName].toString()
    return desc ? b.localeCompare(a) : a.localeCompare(b)
  })
}

const filter = (spaces: SpaceResource[], filterTerm: string) => {
  if (!unref(areEmptyTrashesShown)) {
    spaces = spaces.filter((space) => space.hasTrashedItems !== false)
  }
  if (!(filterTerm || '').trim()) return spaces
  const searchEngine = new Fuse(spaces, { ...defaultFuseOptions, keys: ['name'] })
  return searchEngine.search(filterTerm).map((r) => r.item)
}

const displaySpaces = computed(() =>
  sort(filter(unref(spaces), unref(filterTerm)), unref(sortBy), unref(sortDir) === 'desc')
)

const handleSort = (event: { sortBy: keyof SpaceResource; sortDir: SortDir }) => {
  sortBy.value = event.sortBy
  sortDir.value = event.sortDir
}

const getTrashLink = (space: SpaceResource) =>
  createLocationTrash('files-trash-generic', {
    ...createFileRouteOptions(space)
  })

const resourceTargetRouteCallback = ({
  resource
}: CreateTargetRouteOptions): RouteLocationNamedRaw => getTrashLink(resource as SpaceResource)

onMounted(async () => {
  if (unref(spaces).length === 1 && !isProjectSpaceResource(unref(spaces)[0])) {
    return router.push(getTrashLink(unref(spaces)[0]))
  }
  ready.value = true
  await loadResourcesTask.perform()
  await nextTick()
  markInstance.value = new Mark('.trash-table')
})

watch(filterTerm, () => {
  const instance = unref(markInstance)
  if (!instance) return
  instance.unmark()
  instance.mark(unref(filterTerm), {
    element: 'span',
    className: 'mark-highlight',
    exclude: ['th *', 'tfoot *']
  })
})
</script>
