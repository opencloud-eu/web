<template>
  <div
    class="space-header p-4"
    :class="{ flex: !imageExpanded && !isMobileWidth, 'space-header-squashed': isSideBarOpen }"
  >
    <div
      class="space-header-image mr-6 min-w-xs aspect-[16/9]"
      :class="{
        'space-header-image-expanded w-full max-w-full max-h-full': imageExpanded || isMobileWidth,
        'w-xs max-h-[158px]': !imageExpanded,
        'hidden lg:block': isSideBarOpen
      }"
    >
      <div v-if="imagesLoading.includes(space.id)" class="h-full flex items-center justify-center">
        <oc-spinner :aria-label="$gettext('Space image is loading')" />
      </div>
      <img
        v-else-if="imageContent"
        class="cursor-pointer rounded-lg size-full max-h-full object-cover"
        alt=""
        :src="imageContent"
        @click="toggleImageExpanded"
      />
    </div>
    <div class="flex-1">
      <div class="flex mb-2 items-center justify-between">
        <div class="flex items-center max-w-full">
          <h2 class="break-all">{{ space.name }}</h2>
          <oc-button
            :id="`space-context-btn`"
            v-oc-tooltip="$gettext('Show context menu')"
            :aria-label="$gettext('Show context menu')"
            appearance="raw"
            class="ml-2 p-1"
          >
            <oc-icon name="more-2" />
          </oc-button>
          <oc-drop
            :title="space.name"
            :drop-id="`space-context-drop`"
            :toggle="`#space-context-btn`"
            mode="click"
            close-on-click
            :options="{ delayHide: 0 }"
            padding-size="small"
            position="right-start"
            @show-drop="isDropOpen = true"
            @hide-drop="isDropOpen = false"
          >
            <space-context-actions v-if="isDropOpen" :action-options="{ resources: [space] }" />
          </oc-drop>
        </div>
        <oc-button
          v-if="memberCount"
          :aria-label="$gettext('Open context menu and show members')"
          appearance="raw"
          no-hover
          @click="openSideBarSharePanel"
        >
          <oc-icon name="group" fill-type="line" size="small" />
          <span
            v-if="memberCount"
            class="space-header-people-count text-sm whitespace-nowrap"
            v-text="memberCountString"
          />
          <oc-spinner v-else size="small" :aria-label="$gettext('Loading members')" />
        </oc-button>
      </div>
      <p v-if="space.description" class="mt-0 font-semibold">{{ space.description }}</p>
      <div
        v-if="readmesLoading.includes(space.id)"
        class="space-header-readme-loading flex items-center justify-center"
      >
        <oc-spinner :aria-label="$gettext('Space description is loading')" />
      </div>
      <div
        v-else-if="markdownResource && markdownContent"
        ref="markdownContainerRef"
        class="markdown-container flex min-h-0"
        :class="{
          collapsed: markdownCollapsed,
          'mask-linear-[180deg,black,80%,transparent]': showMarkdownCollapse
        }"
      >
        <text-editor
          class="markdown-container-content w-full [&_#text-editor-preview-component]:!bg-transparent"
          is-read-only
          :current-content="markdownContent"
        />
        <div v-if="isEditReadmeVisible" class="markdown-container-edit ml-2">
          <oc-button
            type="router-link"
            size="small"
            :aria-label="$gettext('Edit description')"
            appearance="raw"
            class="p-1"
            :to="editReadMeContentLink"
          >
            <oc-icon name="pencil" size="small" fill-type="line" />
          </oc-button>
        </div>
      </div>
      <div
        v-if="showMarkdownCollapse && markdownContent"
        class="markdown-collapse text-center mt-2"
      >
        <oc-button appearance="raw" no-hover @click="toggleMarkdownCollapsed">
          <span>{{ toggleMarkdownCollapsedText }}</span>
        </oc-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, Ref, ref, unref, watch } from 'vue'
import { buildSpaceImageResource, Resource, SpaceResource } from '@opencloud-eu/web-client'
import {
  eventBus,
  ImageDimension,
  ProcessorType,
  SideBarEventTopics,
  TextEditor,
  useClientService,
  useFileActions,
  useLoadPreview,
  useResourcesStore,
  useSharesStore,
  useSpaceActionsEditReadmeContent,
  useSpacesStore
} from '@opencloud-eu/web-pkg'
import SpaceContextActions from './SpaceContextActions.vue'
import { useGettext } from 'vue3-gettext'
import { DriveItem } from '@opencloud-eu/web-client/graph/generated'
import { storeToRefs } from 'pinia'

const markdownContainerCollapsedClass = 'collapsed'

const { space, isSideBarOpen = false } = defineProps<{
  space: SpaceResource
  isSideBarOpen?: boolean
}>()

const language = useGettext()
const { $gettext, $ngettext } = language
const clientService = useClientService()
const { getFileContents, getFileInfo } = clientService.webdav
const resourcesStore = useResourcesStore()
const { getDefaultAction } = useFileActions()
const { loadPreview } = useLoadPreview()
const spacesStore = useSpacesStore()
const sharesStore = useSharesStore()
const { imagesLoading, readmesLoading } = storeToRefs(spacesStore)
const { actions: editReadmeContentActions } = useSpaceActionsEditReadmeContent()

const isEditReadmeVisible = computed(() =>
  unref(editReadmeContentActions)[0].isVisible({ resources: [space] })
)

const isMobileWidth = inject<Ref<boolean>>('isMobileWidth')

const isDropOpen = ref(false)

const markdownContainerRef = ref(null)
const markdownContent = ref('')
const markdownResource = ref<Resource>(null)
const markdownCollapsed = ref(true)
const showMarkdownCollapse = ref(false)
const toggleMarkdownCollapsedText = computed(() => {
  return unref(markdownCollapsed) ? $gettext('Show more') : $gettext('Show less')
})
const toggleMarkdownCollapsed = () => {
  markdownCollapsed.value = !unref(markdownCollapsed)
}

const onMarkdownResize = () => {
  if (!unref(markdownContainerRef)) {
    return
  }

  unref(markdownContainerRef).classList.remove(markdownContainerCollapsedClass)
  const markdownContainerHeight = unref(markdownContainerRef).offsetHeight
  if (markdownContainerHeight < 150) {
    showMarkdownCollapse.value = false
    return
  }
  showMarkdownCollapse.value = true

  if (unref(markdownCollapsed)) {
    unref(markdownContainerRef).classList.add(markdownContainerCollapsedClass)
  }
}
const markdownResizeObserver = new ResizeObserver(onMarkdownResize)
const observeMarkdownContainerResize = () => {
  if (!markdownResizeObserver || !unref(markdownContainerRef)) {
    return
  }
  markdownResizeObserver.unobserve(unref(markdownContainerRef))
  markdownResizeObserver.observe(unref(markdownContainerRef))
}
const unobserveMarkdownContainerResize = () => {
  if (!markdownResizeObserver || !unref(markdownContainerRef)) {
    return
  }
  markdownResizeObserver.unobserve(unref(markdownContainerRef))
}

const memberCount = ref<number>()
watch(
  () => sharesStore.collaboratorShares.length,
  async () => {
    // set space member count
    try {
      const { count } = await clientService.graphAuthenticated.permissions.listPermissions(
        space.id,
        space.id,
        sharesStore.graphRoles,
        { count: true, filter: "grantedToV2 ne ''" }
      )
      memberCount.value = count || 1
    } catch (e) {
      console.error(e)
    }
  },
  { immediate: true }
)

onMounted(observeMarkdownContainerResize)
onBeforeUnmount(() => {
  unobserveMarkdownContainerResize()
  spacesStore.purgeReadmesLoading()
})

const loadReadmeContent = async () => {
  spacesStore.addToReadmesLoading(space.id)

  try {
    const fileContentsResponse = await getFileContents(space, {
      path: `.space/${space.spaceReadmeData.name}`
    })

    const fileInfoResponse = await getFileInfo(space, {
      path: `.space/${space.spaceReadmeData.name}`
    })

    unobserveMarkdownContainerResize()
    markdownContent.value = fileContentsResponse.body
    markdownResource.value = fileInfoResponse
    spacesStore.removeFromReadmesLoading(space.id)

    await nextTick()
    if (unref(markdownContent)) {
      observeMarkdownContainerResize()
    }
  } catch (e) {
    if ([425, 429].includes(e.statusCode)) {
      const retryAfter = e.response?.headers?.['retry-after'] || 5
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000))
      return loadReadmeContent()
    }

    spacesStore.removeFromReadmesLoading(space.id)
    console.error(e)
  }
}

watch(
  computed(() => space.spaceReadmeData),
  async (data: DriveItem) => {
    if (!data) {
      return
    }

    await loadReadmeContent()
  },
  { deep: true, immediate: true }
)

const imageContent = ref<string>(null)
const imageExpanded = ref(false)

const editReadMeContentLink = computed(() => {
  const action = getDefaultAction({ resources: [unref(markdownResource)], space })

  if (!action.route) {
    return null
  }

  return action.route({ space, resources: [unref(markdownResource)] })
})
const toggleImageExpanded = () => {
  imageExpanded.value = !unref(imageExpanded)
}

watch(
  computed(() => space.spaceImageData),
  async () => {
    imageContent.value = await loadPreview({
      space,
      resource: space.spaceImageData ? buildSpaceImageResource(space) : space,
      dimensions: ImageDimension.Tile,
      processor: ProcessorType.enum.fit,
      cancelRunning: true,
      updateStore: false
    })
  },
  { immediate: true }
)

const memberCountString = computed(() => {
  return $ngettext('%{count} member', '%{count} members', unref(memberCount), {
    count: unref(memberCount).toString()
  })
})

const openSideBarSharePanel = () => {
  resourcesStore.setSelection([])
  eventBus.publish(SideBarEventTopics.openWithPanel, 'space-share')
}
</script>
