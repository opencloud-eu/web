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
    :term="term"
    v-bind="additionalAttrs"
  />
</template>

<script setup lang="ts">
import { ImageDimension } from '../../constants'
import { debounce } from 'lodash-es'
import { computed, onBeforeUnmount, onMounted, ref, unref, useTemplateRef } from 'vue'
import { useIsVisible } from '@opencloud-eu/design-system/composables'
import {
  useGetMatchingSpace,
  useFileActions,
  useFolderLink,
  useResourcesStore,
  useLoadPreview,
  useResourceLink
} from '../../composables'
import { isSpaceResource, Resource } from '@opencloud-eu/web-client'
import ResourceListItem from '../FilesList/ResourceListItem.vue'
import { SearchResultValue } from './types'
import { RouteLocationPathRaw } from 'vue-router'

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
const { loadPreview } = useLoadPreview()

const resourceListItem = useTemplateRef<typeof ResourceListItem>('resourceListItem')

const {
  getPathPrefix,
  getParentFolderName,
  getParentFolderLink,
  getParentFolderLinkIconAdditionalAttributes
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
const { getResourceLink } = useResourceLink({ space })

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
  const route = getResourceLink(unref(resource)) as RouteLocationPathRaw
  if (!route) {
    return null
  }

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

const observerTarget = computed<HTMLElement>(() => unref(resourceListItem)?.$el)

const debouncedLoadPreview = debounce(async () => {
  unobserve()

  const preview = await loadPreview({
    space: unref(space),
    resource: unref(resource),
    dimensions: ImageDimension.Thumbnail,
    cancelRunning: true,
    updateStore: false
  })

  if (preview) {
    previewData.value = preview
  }
}, 250)

const { unobserve } = useIsVisible({
  target: observerTarget,
  root: ref<Element>(null),
  mode: 'showHide',
  onVisibleCallback: () => debouncedLoadPreview(),
  onHiddenCallback: () => debouncedLoadPreview.cancel()
})

onBeforeUnmount(() => debouncedLoadPreview.cancel())

onMounted(() => {
  if (unref(resourceDisabled)) {
    unref(resourceListItem).parentElement.classList.add('disabled')
  }
})
</script>
