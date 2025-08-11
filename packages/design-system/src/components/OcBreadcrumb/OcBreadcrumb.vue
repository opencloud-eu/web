<template>
  <nav
    :id="id"
    :class="`oc-breadcrumb oc-breadcrumb-${variation}`"
    :aria-label="$gettext('Breadcrumbs')"
  >
    <ol class="oc-breadcrumb-list oc-flex oc-m-rm oc-p-rm">
      <li
        v-for="(item, index) in displayItems"
        :key="index"
        :data-key="index"
        :data-item-id="item.id"
        :aria-hidden="item.isTruncationPlaceholder"
        :class="[
          'oc-breadcrumb-list-item',
          'oc-flex',
          'oc-flex-middle',
          {
            'oc-invisible-sr':
              hiddenItems.indexOf(item) !== -1 ||
              (item.isTruncationPlaceholder && hiddenItems.length === 0)
          }
        ]"
        @dragover.prevent
        @dragenter.prevent="dropItemStyling(item, index, false, $event)"
        @dragleave.prevent="dropItemStyling(item, index, true, $event)"
        @mouseleave="dropItemStyling(item, index, true, $event as DragEvent)"
        @drop="dropItemEvent(item, index)"
      >
        <router-link
          v-if="item.to"
          :aria-current="getAriaCurrent(index)"
          :to="item.isTruncationPlaceholder ? lastHiddenItem.to : item.to"
        >
          <span class="oc-breadcrumb-item-text oc-breadcrumb-item-navigable">{{ item.text }}</span>
        </router-link>
        <oc-button
          v-else-if="item.onClick"
          :aria-current="getAriaCurrent(index)"
          appearance="raw"
          class="oc-flex"
          no-hover
          @click="item.onClick"
        >
          <span
            :class="[
              'oc-breadcrumb-item-text',
              'oc-breadcrumb-item-navigable',
              {
                'oc-breadcrumb-item-text-last': index === displayItems.length - 1
              }
            ]"
            v-text="item.text"
          />
        </oc-button>
        <span
          v-else
          class="oc-breadcrumb-item-text"
          :aria-current="getAriaCurrent(index)"
          tabindex="-1"
          v-text="item.text"
        />
        <oc-icon
          v-if="index !== displayItems.length - 1"
          color="var(--oc-role-on-surface)"
          name="arrow-right-s"
          class="mx-1"
          fill-type="line"
        />
        <template v-if="showContextActions && index === displayItems.length - 1">
          <oc-button
            id="oc-breadcrumb-contextmenu-trigger"
            v-oc-tooltip="contextMenuLabel"
            :aria-label="contextMenuLabel"
            appearance="raw"
            no-hover
          >
            <oc-icon name="more-2" color="var(--oc-role-on-surface)" />
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
      class="oc-breadcrumb-mobile-navigation"
    >
      <oc-icon name="arrow-left-s" fill-type="line" size="large" />
    </oc-button>
  </nav>
  <div v-if="displayItems.length > 1" class="oc-breadcrumb-mobile-current">
    <span class="oc-text-truncate" aria-current="page" v-text="currentFolder.text" />
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

<style lang="scss">
.oc-breadcrumb {
  overflow: visible;
  &-item-dragover {
    transition:
      background 0.06s,
      border 0s 0.08s,
      border-color 0s,
      border-width 0.06s;
    background-color: var(--oc-role-secondary-container);
    box-shadow: 0 0 0 5px var(--oc-role-secondary-container);
    border-radius: 5px;
  }
  &-item-text {
    max-width: 200px;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;

    &-last {
      vertical-align: text-bottom;
    }
  }

  &-item-navigable:hover {
    text-decoration: underline;
  }

  &-mobile-current,
  &-mobile-navigation {
    @media (min-width: $oc-breakpoint-small-default) {
      display: none !important;
    }
  }

  &-list {
    list-style: none;
    align-items: baseline;
    flex-wrap: nowrap;

    @media (max-width: $oc-breakpoint-xsmall-max) {
      display: none !important;
    }

    #oc-breadcrumb-contextmenu-trigger > span {
      vertical-align: middle;
      border: 3px solid transparent;
    }

    #oc-breadcrumb-contextmenu li button {
      display: inline-flex;
    }

    > li button {
      display: inline;
    }

    > :nth-child(n + 2)::before {
      color: var(--oc-role-on-surface);
      display: inline-block;
    }

    > :last-child > span {
      color: var(--oc-role-on-surface);
    }
  }

  /* stylelint-disable */
  &-list-item {
    a:first-of-type,
    button:first-of-type,
    span:first-of-type {
      font-size: var(--oc-font-size-medium);
      color: var(--oc-role-on-surface);
      display: inline-block;
      vertical-align: sub;
      line-height: normal;
    }
  }

  &-lead &-list-item {
    a,
    button,
    span {
      font-size: var(--oc-font-size-large);
    }
  }
}
</style>
