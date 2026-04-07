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
        :class="[
          'oc-breadcrumb-list-item',
          'flex',
          'items-center',
          { 'sr-only': isItemHidden(item as BreadcrumbItem) }
        ]"
        @dragover.prevent
        @dragenter.prevent="dropItemStyling(item as BreadcrumbItem, index, false, $event)"
        @dragleave.prevent="dropItemStyling(item as BreadcrumbItem, index, true, $event)"
        @mouseleave="dropItemStyling(item as BreadcrumbItem, index, true, $event as DragEvent)"
        @drop="dropItemEvent(item as BreadcrumbItem, index)"
      >
        <template v-if="item.isTruncationPlaceholder">
          <oc-button
            id="oc-breadcrumb-contextmenu-truncation-trigger"
            class="hover:underline"
            appearance="raw-inverse"
            color-role="surface"
            no-hover
            >...</oc-button
          >
          <oc-drop
            :title="$gettext('Collapsed items')"
            toggle="#oc-breadcrumb-contextmenu-truncation-trigger"
            mode="click"
            close-on-click
            padding-size="small"
          >
            <div class="flex flex-col">
              <oc-button
                v-for="truncationItem in truncationItems"
                :key="truncationItem.id"
                :to="truncationItem.to as RouteLocationRaw"
                type="router-link"
                appearance="raw-inverse"
                color-role="surface"
                class="p-2"
                justify-content="left"
              >
                <oc-icon name="folder" class="align-middle" fill-type="line" />
                <span>{{ truncationItem.text }}</span>
              </oc-button>
            </div>
          </oc-drop>
        </template>
        <template v-else>
          <router-link
            v-if="item.to"
            :aria-current="getAriaCurrent(index)"
            :to="item.to as RouteLocationRaw"
            class="first:text-base text-xl text-role-on-surface"
          >
            <span class="hover:underline align-sub truncate inline-block leading-[1.2] max-w-3xs">{{
              item.text
            }}</span>
          </router-link>
          <oc-button
            v-else-if="item.onClick"
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
            v-else
            class="first:text-base text-xl align-sub truncate inline-block leading-[1.2] max-w-3xs"
            :aria-current="getAriaCurrent(index)"
            tabindex="-1"
            v-text="item.text"
          />
        </template>
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
    v-if="displayItems.length"
    class="oc-breadcrumb-mobile-current flex items-center w-0 flex-1"
    :class="{
      'sm:hidden': mobileBreakpoint === 'sm',
      'md:hidden': mobileBreakpoint === 'md',
      'lg:hidden': mobileBreakpoint === 'lg',
      'justify-center': displayItems.length > 1
    }"
  >
    <span class="truncate" aria-current="page" v-text="currentFolder.text" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, unref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import { EVENT_ITEM_DROPPED_BREADCRUMB, uniqueId, BreadcrumbItem, SizeType } from '../../helpers'
import OcButton from '../OcButton/OcButton.vue'
import OcDrop from '../OcDrop/OcDrop.vue'
import OcIcon from '../OcIcon/OcIcon.vue'
import { RouteLocationPathRaw, RouteLocationRaw } from 'vue-router'

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
const displayItems = ref<BreadcrumbItem[]>([])
const truncationItems = ref<BreadcrumbItem[]>([])

const isItemHidden = (item: BreadcrumbItem): boolean => {
  return (
    truncationItems.value.indexOf(item) !== -1 ||
    (item.isTruncationPlaceholder && truncationItems.value.length === 0)
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
  displayItems.value.forEach((item) => {
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
  if (!isOverflowing || displayItems.value.length <= truncationOffset + 1) {
    return
  }
  // Remove from the left side
  const removed = displayItems.value.splice(offsetIndex, 1)

  truncationItems.value.push(removed[0])
  reduceBreadcrumb(offsetIndex)
}

const renderBreadcrumb = () => {
  displayItems.value = [...items]
  truncationItems.value = []

  if (displayItems.value.length > truncationOffset) {
    const placeholder = {
      id: uniqueId('oc-breadcrumb-truncation-'),
      text: '...',
      isTruncationPlaceholder: true
    }
    displayItems.value.splice(truncationOffset - 1, 0, placeholder)
  }

  nextTick(() => {
    reduceBreadcrumb(truncationOffset)
    if (truncationItems.value.length === 0) {
      const placeholderIndex = displayItems.value.findIndex((item) => item.isTruncationPlaceholder)
      if (placeholderIndex !== -1) {
        displayItems.value.splice(placeholderIndex, 1)
      }
    }
  })
}

watch([() => maxWidth, () => items], renderBreadcrumb, { immediate: true })

const currentFolder = computed<BreadcrumbItem>(() => {
  if (items.length === 0 || !items) {
    return undefined
  }
  return items[items.length - 1]
})
const parentFolderTo = computed(() => {
  return items[items.length - 2]?.to
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
    @apply bg-role-secondary-container rounded-xs transition-[background] transition-[border] duration-100 ring-4 ring-role-secondary-container;
  }
}
</style>
