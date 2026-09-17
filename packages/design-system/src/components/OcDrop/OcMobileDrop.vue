<template>
  <teleport v-if="isActive" to="#app-runtime-bottom-drawer">
    <oc-bottom-drawer
      :id="drawerId"
      :is-drawer-active="isCurrentlyOnTop"
      :is-focus-trap-active="isCurrentlyOnTop"
      class="oc-mobile-drop z-[calc(var(--z-index-modal)+2)]"
      @clicked="onBackgroundClicked"
    >
      <oc-card
        class="bg-role-surface-container-high overflow-x-hidden rounded-b-none"
        header-class="flex flex-row justify-between items-center"
      >
        <template #header>
          <oc-button
            v-if="drawers.length > 1"
            appearance="raw"
            class="raw-hover-surface oc-bottom-drawer-back-button"
            :aria-label="$gettext('Open the parent context menu')"
            @click="hide()"
          >
            <oc-icon name="arrow-left" fill-type="line" />
          </oc-button>
          <span class="font-semibold" v-text="title" />
          <oc-button
            appearance="raw"
            class="raw-hover-surface oc-bottom-drawer-close-button"
            :aria-label="$gettext('Close the context menu')"
            @click="onClose"
          >
            <oc-icon name="close" fill-type="line" />
          </oc-button>
        </template>
        <div ref="bottomDrawerCardBodyRef" data-oc-drop-container>
          <slot />
        </div>
      </oc-card>
    </oc-bottom-drawer>
  </teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, unref, useTemplateRef, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import { onKeyStroke } from '@vueuse/core'
import OcButton from '../OcButton/OcButton.vue'
import OcCard from '../OcCard/OcCard.vue'
import OcBottomDrawer from '../OcBottomDrawer/OcBottomDrawer.vue'
import { BottomDrawer, useBottomDrawer } from '../../composables'
import { storeToRefs } from 'pinia'
import { hideAncestorDrops, registerOpenDrop, unregisterOpenDrop } from './dropRegistry'

export interface Props {
  /**
   * @docs The ID the drawer element gets.
   */
  drawerId: string
  /**
   * @docs The CSS selector for the element that toggles the bottom drawer. Optional; when omitted, the drawer is controlled purely programmatically via `show`/`hide`.
   */
  toggle?: string
  /**
   * @docs Whether the bottom drawer should close when a child element is clicked.
   * @default false
   */
  closeOnClick?: boolean
  /**
   * @docs The title of the bottom drawer.
   */
  title?: string
  /**
   * @docs Whether the component should register a click handler on the toggle element. Set this to false if you want to control the drawer programmatically and don't want the component to interfere with the toggle element.
   * @default true
   */
  registerClickHandler?: boolean
}

const {
  drawerId,
  toggle = '',
  closeOnClick = false,
  title = '',
  registerClickHandler = true
} = defineProps<Props>()

export interface Emits {
  /**
   * @docs Emitted when the bottom drawer is opened.
   */
  (e: 'show'): void

  /**
   * @docs Emitted when the bottom drawer is closed.
   */
  (e: 'hide'): void
}

const emit = defineEmits<Emits>()

export interface Slots {
  /**
   * @docs Bottom drawer content.
   */
  default?: () => unknown
}

defineSlots<Slots>()

const { $gettext } = useGettext()
const bottomDrawerStore = useBottomDrawer()
const { showDrawer, closeDrawer, closeAllDrawers } = bottomDrawerStore
const { drawers, currentDrawer } = storeToRefs(bottomDrawerStore)

const drawer = ref<BottomDrawer | null>(null)
const bottomDrawerCardBodyRef = useTemplateRef('bottomDrawerCardBodyRef')

const isActive = computed(() => {
  // active means the drawer is in the stack, but not necessarily on top (visible)
  return unref(drawers)
    .map(({ id }) => id)
    .includes(unref(drawer)?.id)
})

const isCurrentlyOnTop = computed(() => {
  // the drawer that is currently shown
  return unref(drawer)?.id && unref(currentDrawer)?.id === unref(drawer).id
})

const show = () => {
  drawer.value = showDrawer()
  emit('show')
}

const hide = ({ includeAncestors = false }: { includeAncestors?: boolean } = {}) => {
  if (includeAncestors && unref(bottomDrawerCardBodyRef)) {
    hideAncestorDrops(unref(bottomDrawerCardBodyRef))
  }
  closeDrawer(unref(drawer)?.id)
  emit('hide')
}

const unregisterDropElement = (dropElement: HTMLElement | null) => {
  if (!dropElement) {
    return
  }

  dropElement.removeEventListener('click', onChildClicked)
  unregisterOpenDrop(dropElement)
}

const onChildClicked = (event: MouseEvent) => {
  const target = (event.target as HTMLElement).closest('a[href], button')
  if (!target) {
    return
  }
  if (target.hasAttribute('aria-expanded')) {
    target.setAttribute('aria-expanded', 'true')
    return
  }
  if (closeOnClick) {
    hide()
    closeAllDrawers()
  }
}

const onBackgroundClicked = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    onClose()
  }
}

const onClose = () => {
  closeAllDrawers()
  emit('hide')
}

onKeyStroke('Escape', (e) => {
  e.preventDefault()
  onClose()
})

onMounted(() => {
  if (!unref(toggle) || !registerClickHandler) {
    return
  }

  document.querySelector(toggle)?.addEventListener('click', show)
})

watch(bottomDrawerCardBodyRef, (dropElement, previousDropElement) => {
  unregisterDropElement(previousDropElement)
  if (!dropElement) {
    return
  }

  dropElement.addEventListener('click', onChildClicked)
  registerOpenDrop(dropElement, {
    getAnchor: () => document.querySelector<HTMLElement>(toggle),
    hide
  })
})

onBeforeUnmount(() => {
  if (registerClickHandler) {
    document.querySelector(toggle)?.removeEventListener('click', show)
  }

  if (unref(drawer)) {
    closeDrawer(unref(drawer).id)
  }
  unregisterDropElement(unref(bottomDrawerCardBodyRef))
})

defineExpose({ show, hide })
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-mobile-drop .oc-card-body ul:not(:last-child) {
    @apply mb-2;
  }
}

@layer utilities {
  .oc-mobile-drop ul {
    /* overwrite default list styling */
    @apply p-2 bg-role-surface rounded-lg;
  }
}
</style>
