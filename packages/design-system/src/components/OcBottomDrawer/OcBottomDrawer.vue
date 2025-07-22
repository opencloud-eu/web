<template>
  <component :is="usePortal ? 'portal' : 'div'" v-if="show" to="app.runtime.bottom.drawer">
    <transition name="oc-bottom-drawer-slide">
      <div
        v-show="show"
        class="oc-bottom-drawer-background"
        role="button"
        :aria-label="$gettext('Close the bottom drawer')"
        @click="onBackgroundClicked"
      >
        <focus-trap>
          <div :id="drawerId" ref="bottomDrawer" class="oc-bottom-drawer">
            <div class="oc-card">
              <div class="oc-card-header">
                <div class="oc-flex oc-flex-between oc-flex-middle">
                  <span class="oc-text-bold" v-text="title" />
                  <oc-button
                    appearance="raw"
                    class="raw-hover-surface"
                    :aria-label="$gettext('Close the bottom drawer')"
                    @click="close"
                  >
                    <oc-icon name="close" fill-type="fill" />
                  </oc-button>
                </div>
              </div>
              <div ref="bottomDrawerCardBody" class="oc-card-body">
                <slot />
              </div>
            </div>
          </div>
        </focus-trap>
      </div>
    </transition>
  </component>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, unref, useTemplateRef } from 'vue'
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
}

const {
  drawerId,
  toggle,
  closeOnClick = false,
  title = '',
  usePortal = false
} = defineProps<Props>()

export interface Emits {
  /**
   * @docs Emitted when the bottom drawer is opened.
   */
  (e: 'open'): void
  /**
   * @docs Emitted when the bottom drawer is closed.
   */
  (e: 'close'): void
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

const show = ref(false)
const bottomDrawerCardBody = useTemplateRef<HTMLElement | null>('bottomDrawerCardBody')

const open = async () => {
  show.value = true
  emit('open')
  await nextTick()
  unref(bottomDrawerCardBody).addEventListener('click', onBottomDrawerChildClicked)

  // set active class for the slide-in animation
  const drawer = document.getElementById(drawerId)
  drawer?.classList.add('active')
}

const close = async () => {
  unref(bottomDrawerCardBody)?.removeEventListener('click', onBottomDrawerChildClicked)

  // remove active class for the slide-out animation
  const drawer = document.getElementById(drawerId)
  drawer?.classList.remove('active')
  await new Promise((resolve) => setTimeout(resolve, 150)) // wait for the animation to finish

  show.value = false
  emit('close')
}

const onBottomDrawerChildClicked = (event: MouseEvent) => {
  const target = (event.target as HTMLElement).closest('a[href], button')
  if (!target || !unref(closeOnClick)) {
    return
  }
  close()
}

const onBackgroundClicked = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    close()
  }
}

onKeyStroke('Escape', (e) => {
  e.preventDefault()
  close()
})

onMounted(() => {
  if (!unref(toggle)) {
    return
  }

  document.querySelector(toggle).addEventListener('click', open)
})

onBeforeUnmount(() => {
  document.querySelector(toggle).removeEventListener('click', open)
})
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
      padding-left: var(--oc-space-small);
      padding-right: var(--oc-space-small);
      border-bottom: 0 !important;
    }

    &-body {
      padding: var(--oc-space-small);

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

li.oc-menu-item-hover {
  a,
  .item-has-switch,
  button:not([role='switch']) {
    box-sizing: border-box;
    padding: var(--oc-space-small);

    &:focus:not([disabled]),
    &:hover:not([disabled]) {
      text-decoration: none !important;
      border-radius: 5px;
    }

    span {
      text-decoration: none !important;
    }
  }
}
</style>
