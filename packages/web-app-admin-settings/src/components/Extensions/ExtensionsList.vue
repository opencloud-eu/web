<template>
  <no-content-message
    v-if="!filteredExtensions.length"
    id="admin-settings-extensions-empty-filtered"
    img-src="images/illustrations/apps.svg"
  >
    <template #message>
      <span v-text="$gettext('No apps found')" />
    </template>
    <template #callToAction>
      <span v-text="$gettext('Try refining the search term or filters to get results')" />
    </template>
  </no-content-message>
  <oc-table
    v-else
    :data-testid="'extensions-table'"
    :sort-by="sortBy"
    :sort-dir="sortDir"
    :fields="fields"
    :data="items"
    :hover="true"
    :sticky="true"
    class="extensions-table"
    @sort="handleSort"
  >
    <template #name="{ item }">
      <div class="flex items-center gap-2">
        <oc-icon
          :name="getIcon(item)"
          :fill-type="getIconFillType(item)"
          size-class="size-5"
          @error="onIconError(item)"
        />
        <oc-filter-highlight :text="item.name" :term="filterTerm" />
      </div>
    </template>
    <template #version="{ item }">
      <span v-text="item.version || '—'" />
    </template>
    <template #minOpenCloud="{ item }">
      <span v-if="loadingCompatibility" :class="shimmerClasses" />
      <span v-else v-text="item.minOpenCloud || '—'" />
    </template>
    <template #maxOpenCloud="{ item }">
      <span v-if="loadingCompatibility" :class="shimmerClasses" />
      <span v-else v-text="item.maxOpenCloud || '—'" />
    </template>
    <template #status="{ item }">
      <span v-if="loadingCompatibility" :class="shimmerClasses" />
      <div v-else class="flex items-center gap-1">
        <oc-tag
          v-if="item.status === 'active'"
          appearance="filled"
          size="small"
          class="border-0 !rounded-sm !bg-green-200 !text-green-900"
        >
          <span v-text="$gettext('Active')" />
        </oc-tag>
        <oc-tag
          v-else
          appearance="filled"
          size="small"
          class="border-0 !rounded-sm !bg-red-200 !text-red-900"
        >
          <span v-text="getStatusLabel(item)" />
        </oc-tag>
        <oc-contextual-helper
          v-if="item.status === 'incompatible'"
          :title="$gettext('Incompatible OpenCloud version')"
          :text="getIncompatibilityText(item)"
          teleport="#app-runtime-drop"
        />
      </div>
    </template>
  </oc-table>
</template>

<script setup lang="ts">
import { IconFillType, NoContentMessage, SortField, useSort } from '@opencloud-eu/web-pkg'
import { SortDir } from '@opencloud-eu/design-system/helpers'
import { computed, ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { OcFilterHighlight } from '@opencloud-eu/design-system/components'
import { ExtensionInfo, ExtensionStatus } from './types'

const {
  extensions,
  filterTerm = '',
  serverVersion = '',
  loadingCompatibility = false
} = defineProps<{
  extensions: ExtensionInfo[]
  filterTerm?: string
  serverVersion?: string
  loadingCompatibility?: boolean
}>()

const { $gettext } = useGettext()

const shimmerClasses =
  'compatibility-loading shimmer relative inline-block h-3 w-12 overflow-hidden rounded-sm bg-role-shadow opacity-10 align-middle after:absolute after:inset-0 after:transform-[translateX(-100%)] after:animate-shimmer'

const filteredExtensions = computed(() => {
  const term = unref(filterTerm).toLowerCase()
  if (!term) {
    return unref(extensions)
  }

  return unref(extensions).filter((extension) => {
    const name = String(extension.name || '').toLowerCase()
    return name.includes(term)
  })
})

const fallbackIcon = 'puzzle'
const brokenIcons = ref<string[]>([])

function getIcon({ icon }: ExtensionInfo) {
  if (!icon || unref(brokenIcons).includes(icon)) {
    return fallbackIcon
  }
  return icon
}

function getIconFillType(item: ExtensionInfo): IconFillType {
  if (getIcon(item) === fallbackIcon) {
    return 'line'
  }
  return item.iconFillType || 'line'
}

function onIconError(item: ExtensionInfo) {
  const icon = getIcon(item)
  if (icon !== fallbackIcon) {
    brokenIcons.value.push(icon)
  }
}

function getIncompatibilityText({ minOpenCloud, maxOpenCloud, loaded }: ExtensionInfo) {
  let requirement: string
  if (minOpenCloud && maxOpenCloud) {
    requirement = $gettext(
      'This app version requires an OpenCloud version between %{min} and %{max}.',
      { min: minOpenCloud, max: maxOpenCloud }
    )
  } else if (minOpenCloud) {
    requirement = $gettext('This app version requires OpenCloud %{min} or higher.', {
      min: minOpenCloud
    })
  } else {
    requirement = $gettext('This app version requires OpenCloud %{max} or lower.', {
      max: maxOpenCloud
    })
  }

  const sentences = [requirement]
  if (serverVersion) {
    sentences.push(
      $gettext('The current OpenCloud version is %{version}.', { version: serverVersion })
    )
  }
  if (!loaded) {
    sentences.push($gettext('The app could not be loaded, most likely because of this.'))
  }
  return sentences.join(' ')
}

const statusOrder: ExtensionStatus[] = ['active', 'incompatible', 'failed']

function getStatusLabel({ status }: ExtensionInfo) {
  const labels: Record<ExtensionStatus, string> = {
    active: $gettext('Active'),
    incompatible: $gettext('Incompatible'),
    failed: $gettext('Failed')
  }
  return labels[status]
}

const sortFields: SortField[] = [
  { name: 'name', sortable: true, sortDir: SortDir.Asc },
  {
    name: 'status',
    // active extensions come first in ascending order
    sortable: (status: ExtensionStatus) => statusOrder.indexOf(status),
    sortDir: SortDir.Asc
  }
]
const { sortBy, sortDir, items, handleSort } = useSort<ExtensionInfo>({
  items: filteredExtensions,
  fields: sortFields
})

const fields = computed(() => [
  {
    name: 'name',
    title: $gettext('Name'),
    type: 'slot',
    sortable: true,
    thClass: 'pl-4',
    tdClass: 'pl-4',
    width: 'expand' as const
  },
  {
    name: 'version',
    title: $gettext('Version'),
    type: 'slot'
  },
  {
    name: 'minOpenCloud',
    title: $gettext('Min. OpenCloud'),
    type: 'slot',
    thClass: 'hidden md:table-cell',
    tdClass: 'hidden md:table-cell'
  },
  {
    name: 'maxOpenCloud',
    title: $gettext('Max. OpenCloud'),
    type: 'slot',
    thClass: 'hidden md:table-cell',
    tdClass: 'hidden md:table-cell'
  },
  {
    name: 'status',
    title: $gettext('Status'),
    type: 'slot',
    sortable: true,
    width: 'shrink' as const
  }
])
</script>

<style scoped>
@layer components {
  .shimmer::after {
    background-image: linear-gradient(90deg, #ffffff00 0, #ffffff33 20%, #ffffff80 60%, #ffffff00);
  }
}
</style>
