<template>
  <div id="oc-file-details-sidebar" class="rounded-sm p-4 bg-role-surface-container">
    <div v-if="hasContent">
      <div
        v-if="isPreviewLoading || preview"
        key="file-thumbnail"
        :style="{
          'background-image': isPreviewLoading ? 'none' : `url(${preview})`
        }"
        class="details-preview flex items-center justify-center mb-4 p-2 h-[230px] bg-contain bg-no-repeat bg-center"
        data-testid="preview"
      >
        <oc-spinner v-if="isPreviewLoading" />
      </div>
      <div
        v-else
        class="details-icon-wrapper w-full flex items-center justify-center mb-4 p-2 bg-contain bg-no-repeat bg-center"
      >
        <resource-icon class="details-icon" :resource="resource" size="xxxlarge" />
      </div>
      <div
        v-if="!publicLinkContextReady && shareIndicators.length"
        key="file-shares"
        data-testid="sharingInfo"
        class="flex items-center my-4"
      >
        <oc-status-indicators :resource="resource" :indicators="shareIndicators" />
        <p class="my-0 mx-2" v-text="detailSharingInformation" />
      </div>
      <div v-if="detailsLoading" class="flex justify-center">
        <oc-spinner :aria-label="$gettext('Loading details')" />
      </div>
      <dl
        v-else
        class="details-list grid grid-cols-[auto_minmax(0,1fr)] m-0"
        :aria-label="$gettext('Overview of the information about the selected file')"
      >
        <template v-if="hasDeletionDate">
          <dt>{{ $gettext('Deleted at') }}</dt>
          <dd data-testid="delete-timestamp">{{ capitalizedTimestamp }}</dd>
        </template>
        <template v-if="hasTimestamp">
          <dt>{{ $gettext('Last modified') }}</dt>
          <dd data-testid="timestamp">
            <oc-button
              v-if="showVersions"
              v-oc-tooltip="seeVersionsLabel"
              appearance="raw"
              :aria-label="seeVersionsLabel"
              no-hover
              @click="openSideBarPanel('versions')"
            >
              {{ capitalizedTimestamp }}
            </oc-button>
            <span v-else v-text="capitalizedTimestamp" />
          </dd>
        </template>
        <template v-if="resource.locked">
          <dt>{{ $gettext('Locked via') }}</dt>
          <dd data-testid="locked-by">
            <span>{{ resource.lockOwner }}</span>
            <span v-if="resource.lockTime">({{ formatDateRelative(resource.lockTime) }})</span>
          </dd>
        </template>
        <template v-if="showSharedVia">
          <dt>{{ $gettext('Shared via') }}</dt>
          <dd data-testid="shared-via">
            <router-link :to="sharedAncestorRoute">
              <span v-oc-tooltip="sharedViaTooltip" v-text="sharedAncestor.path" />
            </router-link>
          </dd>
        </template>
        <template v-if="showSharedBy">
          <dt>{{ $gettext('Shared by') }}</dt>
          <dd data-testid="shared-by">{{ sharedByDisplayNames }}</dd>
        </template>
        <template v-if="ownerDisplayName && ownerDisplayName !== sharedByDisplayNames">
          <dt>{{ $gettext('Owner') }}</dt>
          <dd data-testid="ownerDisplayName">
            <p class="m-0">
              {{ ownerDisplayName }}
              <span v-if="ownedByCurrentUser" v-translate>(me)</span>
            </p>
          </dd>
        </template>
        <template v-if="showSize">
          <dt>{{ $gettext('Size') }}</dt>
          <dd data-testid="sizeInfo">{{ resourceSize }}</dd>
        </template>
        <web-dav-details v-if="showWebDavDetails" :space="space" />
        <template v-if="showVersions">
          <dt>{{ $gettext('Version') }}</dt>
          <dd data-testid="versionsInfo">
            <oc-button
              v-oc-tooltip="seeVersionsLabel"
              appearance="raw"
              :aria-label="seeVersionsLabel"
              no-hover
              @click="openSideBarPanel('versions')"
            >
              {{ versions.length }}
            </oc-button>
          </dd>
        </template>
        <portal-target
          name="app.files.sidebar.file.details.table"
          :slot-props="{ space, resource }"
          :multiple="true"
        />
        <template v-if="hasTags">
          <dt>
            {{ $gettext('Tags') }}
            <oc-contextual-helper
              v-if="contextualHelper?.isEnabled"
              v-bind="contextualHelper?.data"
              class="pl-1"
            ></oc-contextual-helper>
          </dt>
          <dd data-testid="tags">
            <tags-select :resource="resource" class="w-full" />
          </dd>
        </template>
      </dl>
    </div>
    <p v-else data-testid="noContentText" v-text="$gettext('No information to display')" />
  </div>
</template>
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, inject, Ref, ref, unref, watch } from 'vue'
import {
  ImageDimension,
  useAuthStore,
  useUserStore,
  useCapabilityStore,
  useConfigStore,
  useResourcesStore,
  formatDateFromJSDate,
  useResourceContents,
  useLoadPreview,
  useSideBar,
  useResourceIndicators
} from '@opencloud-eu/web-pkg'
import upperFirst from 'lodash-es/upperFirst'
import {
  isShareResource,
  isShareSpaceResource,
  isTrashResource,
  ShareTypes
} from '@opencloud-eu/web-client'
import { useGetMatchingSpace } from '@opencloud-eu/web-pkg'
import { formatFileSize, formatRelativeDateFromJSDate } from '@opencloud-eu/web-pkg'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'
import { getSharedAncestorRoute } from '@opencloud-eu/web-pkg'
import { ResourceIcon } from '@opencloud-eu/web-pkg'
import { tagsHelper } from '../../../helpers/contextualHelpers'
import { ContextualHelper } from '@opencloud-eu/design-system/helpers'
import TagsSelect from './TagsSelect.vue'
import { WebDavDetails } from '@opencloud-eu/web-pkg'

const { previewEnabled = true, tagsEnabled = true } = defineProps<{
  previewEnabled?: boolean
  tagsEnabled?: boolean
}>()

const configStore = useConfigStore()
const userStore = useUserStore()
const capabilityStore = useCapabilityStore()
const { getMatchingSpace } = useGetMatchingSpace()
const { resourceContentsText } = useResourceContents({ showSizeInformation: false })
const { loadPreview, previewsLoading } = useLoadPreview()
const { openSideBarPanel } = useSideBar()
const { getIndicators } = useResourceIndicators()

const language = useGettext()
const { $gettext, current: currentLanguage } = language

const resourcesStore = useResourcesStore()
const { ancestorMetaData, currentFolder } = storeToRefs(resourcesStore)
const { user } = storeToRefs(userStore)

const resource = inject<Ref<Resource>>('resource')
const versions = inject<Ref<Resource[]>>('versions')
const versionsLoading = inject<Ref<boolean>>('versionsLoading')
const space = inject<Ref<SpaceResource>>('space')

const preview = ref<string>(undefined)

const authStore = useAuthStore()
const { publicLinkContextReady } = storeToRefs(authStore)

const isPreviewLoading = computed(() => previewEnabled && unref(previewsLoading))
const detailsLoading = computed(() => unref(versionsLoading))

const sharedAncestor = computed(() => {
  return Object.values(unref(ancestorMetaData)).find(
    (a) =>
      a.path !== unref(resource).path &&
      ShareTypes.containsAnyValue(ShareTypes.authenticated, a.shareTypes)
  )
})
const sharedAncestorRoute = computed(() => {
  return getSharedAncestorRoute({
    sharedAncestor: unref(sharedAncestor),
    matchingSpace: unref(space) || getMatchingSpace(unref(resource))
  })
})
const showWebDavDetails = computed(() => {
  /**
   * webDavPath might not be set when user is navigating on public link,
   * even if the user is authenticated and the file owner.
   */
  return resourcesStore.areWebDavDetailsShown && unref(resource).webDavPath
})
const formatDateRelative = (date: string) => {
  return formatRelativeDateFromJSDate(new Date(date), language.current)
}

const contextualHelper = {
  isEnabled: configStore.options.contextHelpers,
  data: tagsHelper({ configStore })
} as ContextualHelper

const hasTags = computed(() => {
  return tagsEnabled && capabilityStore.filesTags
})

const hasDeletionDate = computed(() => {
  return isTrashResource(unref(resource))
})

const shareIndicators = computed(() => {
  return getIndicators({
    space: unref(space),
    resource: unref(resource)
  }).filter(({ category }) => category === 'sharing')
})

const hasAnyShares = computed(() => {
  return unref(resource).shareTypes?.length > 0 || unref(sharedAncestor)
})
const sharedViaTooltip = computed(() => {
  return $gettext("Navigate to '%{folder}'", { folder: unref(sharedAncestor).path || '' }, true)
})
const showSharedBy = computed(() => {
  return unref(showShares) && !unref(ownedByCurrentUser) && unref(sharedByDisplayNames)
})
const showSharedVia = computed(() => {
  return unref(showShares) && unref(sharedAncestor) && !isShareSpaceResource(unref(space))
})
const showShares = computed(() => {
  if (unref(publicLinkContextReady)) {
    return false
  }
  return unref(hasAnyShares)
})
const ownedByCurrentUser = computed(() => {
  return unref(resource).owner?.id === unref(user)?.id
})
const sharedByDisplayNames = computed(() => {
  const res = unref(resource)
  if (!isShareResource(res)) {
    return ''
  }
  return res.sharedBy?.map(({ displayName }) => displayName).join(', ')
})
const hasContent = computed(() => {
  return (
    unref(hasTimestamp) ||
    unref(ownerDisplayName) ||
    unref(showSize) ||
    unref(showShares) ||
    unref(showVersions) ||
    unref(hasDeletionDate)
  )
})
const detailSharingInformation = computed(() => {
  if (unref(resource).type === 'folder') {
    return $gettext('This folder has been shared.')
  }
  return $gettext('This file has been shared.')
})
const hasTimestamp = computed(() => {
  return unref(resource).mdate?.length > 0
})
const ownerDisplayName = computed(() => {
  return unref(resource).owner?.displayName
})
const resourceSize = computed(() => {
  if (unref(resource).id === unref(currentFolder)?.id) {
    return `${formatFileSize(unref(resource).size, currentLanguage)}, ${unref(
      resourceContentsText
    )}`
  }

  return formatFileSize(unref(resource).size, currentLanguage)
})
const showSize = computed(() => {
  return formatFileSize(unref(resource).size, currentLanguage) !== '?'
})
const showVersions = computed(() => {
  if (unref(resource).type === 'folder' || unref(publicLinkContextReady) || !unref(versions)) {
    return
  }
  return unref(versions).length > 0
})
const seeVersionsLabel = computed(() => {
  return $gettext('See all versions')
})
const capitalizedTimestamp = computed(() => {
  const item = unref(resource)
  const date = isTrashResource(item) ? item.ddate : item.mdate
  const displayDate = formatDateFromJSDate(new Date(date), currentLanguage)
  return upperFirst(displayDate)
})

watch(
  () => unref(resource).mdate,
  async () => {
    if (unref(resource)) {
      preview.value = await loadPreview({
        space: unref(space),
        resource: unref(resource),
        dimensions: ImageDimension.Preview,
        cancelRunning: true,
        updateStore: false
      })
    }
  },
  { immediate: true }
)
</script>
