<template>
  <nav
    :id="id"
    :class="`oc-breadcrumb oc-breadcrumb-${variation} overflow-visible`"
    :aria-label="$gettext('Breadcrumbs')"
  >
    <ol
      class="oc-breadcrumb-list hidden items-baseline m-0 p-0 flex-nowrap"
      :class="{
        'sm:flex': mobileBreakpoint === 'sm',
        'md:flex': mobileBreakpoint === 'md',
        'lg:flex': mobileBreakpoint === 'lg'
      }"
    >
      <li
        v-for="(item, index) in displayItems"
        :key="index"
        :data-key="index"
        :data-item-id="item.id"
        :aria-hidden="item.isTruncationPlaceholder"
        :class="[
          'oc-breadcrumb-list-item',
          'flex',
          'items-center',
          {
            'sr-only': isItemHidden(item, index)
          }
        ]"
        @dragover.prevent
        @dragenter.prevent="dropItemStyling(item, index, false, $event)"
        @dragleave.prevent="dropItemStyling(item, index, true, $event)"
        @mouseleave="dropItemStyling(item, index, true, $event as DragEvent)"
        @drop="dropItemEvent(item, index)"
      >
        <router-link
          v-if="item.to && !item.isTruncationPlaceholder"
          :aria-current="getAriaCurrent(index)"
          :to="item.to"
          class="first:text-base text-xl text-role-on-surface"
        >
          <span class="hover:underline align-sub truncate inline-block leading-[1.2] max-w-3xs">{{
            item.text
          }}</span>
        </router-link>
        <oc-button
          v-else-if="item.onClick && !item.isTruncationPlaceholder"
          :aria-current="getAriaCurrent(index)"
          appearance="raw-inverse"
          color-role="surface"
          class="flex first:text-base text-xl"
          no-hover
          @click="item.onClick"
        >
          <span
            :class="[
              'hover:underline',
              'align-sub',
              'truncate',
              'inline-block',
              'leading-[1.2]',
              'max-w-3xs',
              {
                'oc-breadcrumb-item-text-last': index === displayItems.length - 1
              }
            ]"
            v-text="item.text"
          />
        </oc-button>
        <span
          v-else-if="item.isTruncationPlaceholder"
          class="first:text-base text-xl align-sub truncate inline-block leading-[1.2] max-w-3xs"
          tabindex="-1"
          aria-hidden="true"
          v-text="item.text"
        />
        <span
          v-else
          class="first:text-base text-xl align-sub truncate inline-block leading-[1.2] max-w-3xs"
          :aria-current="getAriaCurrent(index)"
          tabindex="-1"
          v-text="item.text"
        />
        <oc-icon
          v-if="index !== displayItems.length - 1"
          color="var(--oc-role-on-surface)"
          name="arrow-right-s"
          class="mx-1 align-sub"
          fill-type="line"
        />
        <template v-if="showContextActions && index === displayItems.length - 1">
          <oc-button
            id="oc-breadcrumb-contextmenu-trigger"
            v-oc-tooltip="contextMenuLabel"
            :aria-label="contextMenuLabel"
            appearance="raw"
            no-hover
            class="mx-1"
          >
            <oc-icon name="more-2" color="var(--oc-role-on-surface)" class="align-middle" />
          </oc-button>
          <oc-drop
            drop-id="oc-breadcrumb-contextmenu"
            toggle="#oc-breadcrumb-contextmenu-trigger"
            mode="click"
            close-on-click
            :padding-size="contextMenuPadding"
          >
            <!-- @slot Add context actions that open in a dropdown when clicking on the "three dots" button -->
            <slot name="contextMenu" />
          </oc-drop>
        </template>
      </li>
    </ol>
    <oc-button
      v-if="parentFolderTo && displayItems.length > 1"
      appearance="raw"
      type="router-link"
      :aria-label="$gettext('Navigate one level up')"
      :to="parentFolderTo"
      class="oc-breadcrumb-mobile-navigation flex"
      :class="{
        'sm:hidden': mobileBreakpoint === 'sm',
        'md:hidden': mobileBreakpoint === 'md',
        'lg:hidden': mobileBreakpoint === 'lg'
      }"
    >
      <oc-icon name="arrow-left-s" fill-type="line" size="large" />
    </oc-button>
  </nav>
  <div
    v-if="displayItems.length > 1"
    class="oc-breadcrumb-mobile-current flex justify-center items-center w-0 flex-1"
    :class="{
      'sm:hidden': mobileBreakpoint === 'sm',
      'md:hidden': mobileBreakpoint === 'md',
      'lg:hidden': mobileBreakpoint === 'lg'
    }"
  >
    <span class="truncate" aria-current="page" v-text="currentFolder.text" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, Ref, ref, unref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import { EVENT_ITEM_DROPPED_BREADCRUMB, uniqueId, BreadcrumbItem, SizeType } from '../../helpers'
import OcButton from '../OcButton/OcButton.vue'
import OcDrop from '../OcDrop/OcDrop.vue'
import OcIcon from '../OcIcon/OcIcon.vue'
import { RouteLocationPathRaw } from 'vue-router'

export interface Props {
  /**
   * @docs The items to display in the breadcrumb. Please refer to the component source for the `BreadcrumbItem` type definition.
   */
  items: BreadcrumbItem[]
  /**
   * @docs The padding size of the context menu dropdown.
   * @default medium
   */
  contextMenuPadding?: SizeType | 'remove'
  /**
   * @docs The element ID of the breadcrumb.
   */
  id?: string
  /**
   * @docs The maximum width of the breadcrumb. If the breadcrumb exceeds this width, items will be truncated. Set to `-1` to disable truncation.
   * @default -1
   */
  maxWidth?: number
  /**
   * @docs The Tailwind breakpoint at which the mobile version of the breadcrumb is shown.
   * @default sm
   */
  mobileBreakpoint?: 'sm' | 'md' | 'lg'
  /**
   * @docs Determines if the context actions are shown for the last breadcrumb item.
   * @default false
   */
  showContextActions?: boolean
  /**
   * @docs The number of items to show before truncating the breadcrumb.
   * @default 2
   */
  truncationOffset?: number
  /**
   * @docs The variation of the breadcrumb.
   * @default default
   */
  variation?: 'default' | 'lead'
}

export interface Emits {
  /**
   * @docs Emitted when an item has been droped onto a breadcrumb element.
   */
  (e: 'itemDroppedBreadcrumb', to: RouteLocationPathRaw): void
}

export interface Slots {
  /**
   * @docs Context menu for the last breadcrumb item. Needs `showContextActions` to be `true`.
   */
  contextMenu?: () => unknown
}

const {
  items,
  contextMenuPadding = 'medium',
  id = uniqueId('oc-breadcrumbs-'),
  maxWidth = -1,
  mobileBreakpoint = 'sm',
  showContextActions = false,
  truncationOffset = 2,
  variation = 'default'
} = defineProps<Props>()

const emit = defineEmits<Emits>()
defineSlots<Slots>()

const { $gettext } = useGettext()
const visibleItems = ref<BreadcrumbItem[]>([])
const hiddenItems = ref<BreadcrumbItem[]>([])

// FIXME: setting this initially will cause vue-router type errors
const displayItems: Ref<BreadcrumbItem[]> = ref([])
displayItems.value = items

const isItemHidden = (item: BreadcrumbItem, index: number): boolean => {
  return (
    hiddenItems.value.indexOf(item) !== -1 ||
    (item.isTruncationPlaceholder && hiddenItems.value.length === 0)
  )
}

const getBreadcrumbElement = (id: string): HTMLElement => {
  return document.querySelector(`.oc-breadcrumb-list [data-item-id="${id}"]`)
}

const isDropAllowed = (item: BreadcrumbItem, index: number): boolean => {
  return !(
    !item.id ||
    index === unref(displayItems).length - 1 ||
    item.isTruncationPlaceholder ||
    item.isStaticNav
  )
}
const dropItemEvent = (item: BreadcrumbItem, index: number) => {
  if (!isDropAllowed(item, index)) {
    return
  }

  if (typeof item.to === 'object') {
    const itemTo = item.to as RouteLocationPathRaw
    itemTo.path = itemTo.path || '/'
    emit(EVENT_ITEM_DROPPED_BREADCRUMB, itemTo)
  }
}

const calculateTotalBreadcrumbWidth = () => {
  let totalBreadcrumbWidth = 100 // 100px margin to the right to avoid breadcrumb from getting too close to the controls
  visibleItems.value.forEach((item) => {
    const breadcrumbElement = getBreadcrumbElement(item.id)
    const itemClientWidth = breadcrumbElement?.getBoundingClientRect()?.width || 0
    totalBreadcrumbWidth += itemClientWidth
  })
  return totalBreadcrumbWidth
}

const reduceBreadcrumb = (offsetIndex: number) => {
  const breadcrumbMaxWidth = maxWidth
  if (!breadcrumbMaxWidth) {
    return
  }
  const totalBreadcrumbWidth = calculateTotalBreadcrumbWidth()

  const isOverflowing = breadcrumbMaxWidth < totalBreadcrumbWidth
  if (!isOverflowing || visibleItems.value.length <= truncationOffset + 1) {
    return
  }
  // Remove from the left side
  const removed = visibleItems.value.splice(offsetIndex, 1)

  hiddenItems.value.push(removed[0])
  reduceBreadcrumb(offsetIndex)
}

const lastHiddenItem = computed(() =>
  hiddenItems.value.length >= 1 ? unref(hiddenItems)[unref(hiddenItems).length - 1] : { to: {} }
)

const renderBreadcrumb = () => {
  displayItems.value = [...items]
  if (displayItems.value.length > truncationOffset - 1) {
    displayItems.value.splice(truncationOffset - 1, 0, {
      text: '...',
      allowContextActions: false,
      to: {} as BreadcrumbItem['to'],
      isTruncationPlaceholder: true
    })
  }
  visibleItems.value = [...displayItems.value]
  hiddenItems.value = []
  nextTick(() => {
    reduceBreadcrumb(truncationOffset)
  })
}

watch([() => maxWidth, () => items], renderBreadcrumb, { immediate: true })

const currentFolder = computed<BreadcrumbItem>(() => {
  if (items.length === 0 || !items) {
    return undefined
  }
  return [...items].reverse()[0]
})
const parentFolderTo = computed(() => {
  return [...items].reverse()[1]?.to
})

const contextMenuLabel = computed(() => {
  return $gettext('Show actions for current folder')
})

const getAriaCurrent = (index: number): 'page' | null => {
  return items.length - 1 === index ? 'page' : null
}

const dropItemStyling = (
  item: BreadcrumbItem,
  index: number,
  leaving: boolean,
  event: DragEvent
) => {
  if (!isDropAllowed(item, index)) {
    return
  }
  const hasFilePayload = (event.dataTransfer?.types || []).some((e) => e === 'Files')
  if (hasFilePayload) return
  if ((event.currentTarget as HTMLElement)?.contains(event.relatedTarget as HTMLElement)) {
    return
  }

  const classList = getBreadcrumbElement(item.id).children[0].classList
  const className = 'oc-breadcrumb-item-dragover'
  leaving ? classList.remove(className) : classList.add(className)
}
</script>

<style scoped>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-breadcrumb-item-dragover {
    @apply bg-role-secondary-container rounded-xs transition-[background,border] duration-100 ring-4 ring-role-secondary-container;
  }
}
</style>
