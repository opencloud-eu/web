<template>
  <resource-list-item
    ref="resourceListItem"
    :resource="resource"
    :path-prefix="pathPrefix"
    :is-path-displayed="true"
    :link="resourceLink"
    :is-extension-displayed="areFileExtensionsShown"
    :parent-folder-link-icon-additional-attributes="parentFolderLinkIconAdditionalAttributes"
    :parent-folder-name="parentFolderName"
    :is-thumbnail-displayed="!!previewData"
    v-bind="additionalAttrs"
  />
</template>

<script setup lang="ts">
import { ImageDimension } from '../../constants'
import { VisibilityObserver } from '../../observer'
import { debounce } from 'lodash-es'
import { computed, onBeforeUnmount, onMounted, ref, unref, useTemplateRef } from 'vue'
import {
  useGetMatchingSpace,
  useFileActions,
  useFolderLink,
  useResourcesStore,
  useLoadPreview
} from '../../composables'
import { isSpaceResource, Resource } from '@opencloud-eu/web-client'
import ResourceListItem from '../FilesList/ResourceListItem.vue'
import { SearchResultValue } from './types'
import { RouteLocationPathRaw } from 'vue-router'

const visibilityObserver = new VisibilityObserver()

const {
  searchResult = { data: {} },
  isClickable = true,
  term = ''
} = defineProps<{
  searchResult?: SearchResultValue
  isClickable?: boolean
  term?: string
}>()

const { triggerDefaultAction } = useFileActions()
const { getMatchingSpace } = useGetMatchingSpace()
const { getDefaultAction } = useFileActions()
const { loadPreview } = useLoadPreview()

const resourceListItem = useTemplateRef<typeof ResourceListItem>('resourceListItem')

const {
  getPathPrefix,
  getParentFolderName,
  getParentFolderLink,
  getParentFolderLinkIconAdditionalAttributes,
  getFolderLink
} = useFolderLink()
const resourcesStore = useResourcesStore()

const previewData = ref<string>()

const areFileExtensionsShown = computed(() => resourcesStore.areFileExtensionsShown)

const resource = computed((): Resource => {
  return {
    ...(searchResult.data as Resource),
    ...(unref(previewData) &&
      ({
        thumbnail: unref(previewData)
      } as Resource))
  }
})

const space = computed(() => getMatchingSpace(unref(resource)))

const resourceDisabled = computed(() => {
  const res = unref(resource)
  return isSpaceResource(res) && res.disabled === true
})

const resourceClicked = () => {
  triggerDefaultAction({
    space: unref(space),
    resources: [unref(resource)]
  })
}

const additionalAttrs = computed(() => {
  if (!isClickable) {
    return {
      isResourceClickable: false
    }
  }

  return {
    parentFolderLink: getParentFolderLink(unref(resource)),
    onClick: resourceClicked
  }
})

const resourceLink = computed(() => {
  if (unref(resource).isFolder) {
    return getFolderLink(unref(resource))
  }

  const action = getDefaultAction({ resources: [unref(resource)], space: unref(space) })

  if (!action?.route) {
    return null
  }

  const route = action.route({
    space: unref(space),
    resources: [unref(resource)]
  }) as RouteLocationPathRaw

  // add search term to query param
  route.query = {
    ...route.query,
    contextRouteQuery: {
      ...((route.query?.contextRouteQuery as any) || {}),
      term: term
    }
  }

  return route
})

const pathPrefix = getPathPrefix(unref(resource))
const parentFolderName = getParentFolderName(unref(resource))
const parentFolderLinkIconAdditionalAttributes = getParentFolderLinkIconAdditionalAttributes(
  unref(resource)
)

onMounted(() => {
  if (unref(resourceDisabled)) {
    unref(resourceListItem).parentElement.classList.add('disabled')
  }

  const loadPreviewCallback = async () => {
    const preview = await loadPreview({
      space: unref(space),
      resource: unref(resource),
      dimensions: ImageDimension.Thumbnail,
      cancelRunning: true,
      updateStore: false
    })

    preview && (previewData.value = preview)
  }

  const debounced = debounce(({ unobserve }) => {
    unobserve()
    loadPreviewCallback()
  }, 250)

  visibilityObserver.observe(unref(resourceListItem).$el, {
    onEnter: debounced,
    onExit: debounced.cancel
  })
})

onBeforeUnmount(() => {
  visibilityObserver.disconnect()
})
</script>
