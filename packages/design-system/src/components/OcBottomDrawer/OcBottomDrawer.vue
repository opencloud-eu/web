<template>
  <component
    :is="usePortal ? 'portal' : 'div'"
    v-if="isActive"
    :to="usePortal ? portalTarget : undefined"
  >
    <div
      class="oc-bottom-drawer-background fixed inset-0 z-[calc(var(--z-index-modal)+2)] top-0 left-0 bg-black/40 size-full"
      role="button"
      @click="onBackgroundClicked"
    >
      <focus-trap :active="isCurrentlyOnTop">
        <div
          :id="drawerId"
          tabindex="0"
          class="oc-bottom-drawer fixed inset-x-0 bg-role-surface-container-high rounded-t-sm w-full max-h-[66vh] overflow-y-auto transition-all duration-200 bottom-[-100%]"
          :class="{
            '[&.active]:bottom-0': isCurrentlyOnTop
          }"
        >
          <oc-card
            class="bg-transparent overflow-x-hidden"
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
                @click="closeAllDrawers()"
              >
                <oc-icon name="close" fill-type="line" />
              </oc-button>
            </template>
            <div ref="bottomDrawerCardBodyRef">
              <slot />
            </div>
          </oc-card>
        </div>
      </focus-trap>
    </div>
  </component>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  unref,
  useTemplateRef,
  watch
} from 'vue'
import { useGettext } from 'vue3-gettext'
import { FocusTrap } from 'focus-trap-vue'
import { onKeyStroke } from '@vueuse/core'
import OcButton from '../OcButton/OcButton.vue'
import OcCard from '../OcCard/OcCard.vue'
import { BottomDrawer, useBottomDrawer } from '../../composables'
import { storeToRefs } from 'pinia'

export interface Props {
  /**
   * @docs The ID the drawer element gets.
   */
  drawerId: string
  /**
   * @docs The CSS selector for the element that toggles the bottom drawer.
   */
  toggle: string
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
   * @docs Whether to use a portal for the bottom drawer. The portal can be used to render the bottom drawer outside of the current DOM hierarchy.
   * @default false
   */
  usePortal?: boolean
  /**
   * @docs
   * The target of the portal, when in use.
   * @default app.runtime.bottom.drawer
   */
  portalTarget?: string
}

const {
  drawerId,
  toggle,
  closeOnClick = false,
  title = '',
  usePortal = false,
  portalTarget = 'app.runtime.bottom.drawer'
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

const show = async () => {
  drawer.value = showDrawer()
  emit('show')
  await nextTick()
  unref(bottomDrawerCardBodyRef)?.addEventListener('click', onChildClicked)
}

const hide = () => {
  closeDrawer(unref(drawer)?.id)
  unref(bottomDrawerCardBodyRef)?.removeEventListener('click', onChildClicked)
  emit('hide')
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
    closeAllDrawers()
  }
}

onKeyStroke('Escape', (e) => {
  e.preventDefault()
  closeAllDrawers()
})

onMounted(() => {
  if (!unref(toggle)) {
    return
  }

  document.querySelector(toggle).addEventListener('click', show)
})

onBeforeUnmount(() => {
  document.querySelector(toggle).removeEventListener('click', show)
  if (unref(drawer)) {
    closeDrawer(unref(drawer).id)
  }
})

watch(isCurrentlyOnTop, async () => {
  if (unref(isCurrentlyOnTop)) {
    await nextTick()
    const drawerEl = document.getElementById(drawerId)
    drawerEl?.classList.add('active')
  }
})

defineExpose({ show, hide })
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-bottom-drawer .oc-card-body ul:not(:last-child) {
    @apply mb-2;
  }
}

@layer utilities {
  .oc-bottom-drawer ul {
    /* overwrite default list styling */
    @apply p-2 bg-role-surface rounded-lg;
  }
}
</style>
