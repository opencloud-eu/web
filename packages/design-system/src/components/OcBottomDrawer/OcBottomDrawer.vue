<template>
  <component
    :is="usePortal ? 'portal' : 'div'"
    v-if="isOpen"
    :to="usePortal ? portalTarget : undefined"
  >
    <div
      v-if="isOpen"
      ref="bottomDrawerRef"
      class="oc-bottom-drawer-background"
      role="button"
      :aria-label="$gettext('Close the bottom drawer')"
      @click="onBackgroundClicked"
    >
      <focus-trap>
        <div :id="drawerId" class="oc-bottom-drawer">
          <div class="oc-card">
            <div class="oc-card-header">
              <div class="oc-flex oc-flex-between oc-flex-middle">
                <oc-button
                  v-if="isNestedElement"
                  appearance="raw"
                  class="raw-hover-surface oc-bottom-drawer-back-button"
                  :aria-label="$gettext('Open the parent bottom drawer')"
                  @click="openParentDrawer"
                >
                  <oc-icon name="arrow-left" fill-type="line" />
                </oc-button>
                <span class="oc-text-bold" v-text="title" />
                <oc-button
                  appearance="raw"
                  class="raw-hover-surface oc-bottom-drawer-close-button"
                  :aria-label="$gettext('Close the bottom drawer')"
                  @click="hide"
                >
                  <oc-icon name="close" fill-type="line" />
                </oc-button>
              </div>
            </div>
            <div ref="bottomDrawerCardBodyRef" class="oc-card-body">
              <slot />
            </div>
          </div>
        </div>
      </focus-trap>
    </div>
  </component>
</template>

<script setup lang="ts">
import {
  ComponentPublicInstance,
  nextTick,
  onBeforeUnmount,
  onMounted,
  Ref,
  ref,
  unref,
  useTemplateRef
} from 'vue'
import { useGettext } from 'vue3-gettext'
import { FocusTrap } from 'focus-trap-vue'
import { onKeyStroke } from '@vueuse/core'
import OcButton from '../OcButton/OcButton.vue'

interface Props {
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
  /**
   * @docs Determines if the bottom drawer element is nested.
   * @default false
   */
  isNestedElement?: boolean
  /**
   * @docs The parent `OcBottomDrawer` ref of the nested bottom drawer.
   */
  nestedParentRef?: Ref<
    ComponentPublicInstance & {
      show: () => void
      hide: () => void
      getElement: () => HTMLElement
    }
  >
}

const {
  drawerId,
  toggle,
  closeOnClick = false,
  title = '',
  usePortal = false,
  isNestedElement = false,
  nestedParentRef = null,
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

const isOpen = ref(false)
const bottomDrawerRef = useTemplateRef<HTMLElement | null>('bottomDrawerRef')
const bottomDrawerCardBodyRef = useTemplateRef<HTMLElement | null>('bottomDrawerCardBodyRef')

const show = async () => {
  if (isNestedElement) {
    unref(nestedParentRef).getElement().classList.add('oc-hidden')
  }

  isOpen.value = true
  emit('show')
  await nextTick()
  unref(bottomDrawerCardBodyRef).addEventListener('click', onChildClicked)

  // set active class for the slide-in animation
  const drawer = document.getElementById(drawerId)
  drawer?.classList.add('active')
}

const openParentDrawer = () => {
  hide({ hideParent: false })
  unref(nestedParentRef).getElement().classList.remove('oc-hidden')
}

const hide = async ({ hideParent = true } = {}) => {
  if (isNestedElement && hideParent) {
    unref(nestedParentRef).hide()
  }

  unref(bottomDrawerCardBodyRef)?.removeEventListener('click', onChildClicked)

  // remove active class for the slide-out animation
  const drawer = document.getElementById(drawerId)
  drawer?.classList.remove('active')
  await new Promise((resolve) => setTimeout(resolve, 150)) // wait for the animation to finish

  isOpen.value = false
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

  if (!closeOnClick) {
    return
  }

  if (isNestedElement) {
    unref(nestedParentRef).hide()
  }

  hide()
}

const onBackgroundClicked = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    hide()
  }
}

onKeyStroke('Escape', (e) => {
  e.preventDefault()
  hide()
})

onMounted(() => {
  if (!unref(toggle)) {
    return
  }

  document.querySelector(toggle).addEventListener('click', show)
})

onBeforeUnmount(() => {
  document.querySelector(toggle).removeEventListener('click', show)
})

const getElement = () => {
  return unref(bottomDrawerRef)
}

defineExpose({ show, hide, getElement })
</script>

<style lang="scss">
.oc-bottom-drawer-background {
  background-color: #0006;
  height: 100%;
  width: 100% !important;
  left: 0;
  top: 0;
  position: fixed;
  z-index: calc(var(--oc-z-index-modal) + 2);
}

.oc-bottom-drawer {
  position: fixed;
  bottom: -100%;
  left: 0;
  right: 0;
  max-height: 66vh;
  width: 100%;
  overflow-y: auto;
  background-color: var(--oc-role-surface-container-high);
  border-top-left-radius: 5px;
  border-top-right-radius: 5px;
  transition: all 0.2s;

  &.active {
    bottom: 0;
    transition: all 0.2s;
  }

  .oc-card {
    background-color: unset !important;

    &-header {
      padding-top: var(--oc-space-medium);
      padding-left: var(--oc-space-medium);
      padding-right: var(--oc-space-medium);
      border-bottom: 0 !important;
    }

    &-body {
      padding: var(--oc-space-medium);
      padding-top: var(--oc-space-small);

      ul:not(:last-child) {
        margin-bottom: var(--oc-space-small) !important;
      }

      ul {
        background-color: var(--oc-role-surface) !important;
        border-radius: 10px;
      }
    }
  }
}
</style>
