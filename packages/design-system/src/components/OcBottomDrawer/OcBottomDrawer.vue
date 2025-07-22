<template>
  <portal v-if="show" to="app.runtime.bottom.drawer">
    <div
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
  </portal>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, unref, useTemplateRef } from 'vue'
import { useGettext } from 'vue3-gettext'
import { FocusTrap } from 'focus-trap-vue'
import { onKeyStroke } from '@vueuse/core'

const {
  drawerId,
  toggle,
  closeOnClick = false,
  title = ''
} = defineProps<{ drawerId: string; toggle: string; closeOnClick?: boolean; title?: string }>()

const emit = defineEmits<{
  /**
   * @docs Emitted when the bottom drawer is opened.
   */
  (e: 'open'): void
  /**
   * @docs Emitted when the bottom drawer is closed.
   */
  (e: 'close'): void
}>()

const { $gettext } = useGettext()

const show = ref(false)
const bottomDrawerCardBody = useTemplateRef<HTMLElement | null>('bottomDrawerCardBody')

const open = async () => {
  show.value = true
  emit('open')
  await nextTick()
  unref(bottomDrawerCardBody).addEventListener('click', onBottomDrawerChildClicked)
}

const close = () => {
  unref(bottomDrawerCardBody)?.removeEventListener('click', onBottomDrawerChildClicked)
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
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 66vh;
  width: 100%;
  overflow-y: auto;
  background-color: var(--oc-role-surface-container-high);

  border-top-left-radius: 5px;
  border-top-right-radius: 5px;

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
