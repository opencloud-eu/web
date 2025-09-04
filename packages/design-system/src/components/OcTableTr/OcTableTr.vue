<template>
  <tr
    ref="observerTarget"
    @click="$emit('click', $event)"
    @contextmenu="$emit('contextmenu', $event)"
    @dragstart="$emit('dragstart', $event)"
    @drop="$emit('drop', $event)"
    @dragenter="$emit('dragenter', $event)"
    @dragleave="$emit('dragleave', $event)"
    @dragover="$emit('dragover', $event)"
    @mouseleave="$emit('mouseleave', $event)"
  >
    <oc-td v-if="isHidden" :colspan="lazyColspan">
      <span
        class="shimmer inline-block bg-role-shadow overflow-hidden absolute inset-x-2 inset-y-3 after:absolute after:inset-0 after:transform-[translateX(-100%)] opacity-10 after:animate-shimmer"
      />
    </oc-td>
    <slot v-else />
  </tr>
</template>

<script setup lang="ts">
import { customRef, computed, ref, unref } from 'vue'
import { useIsVisible } from '../../composables'
import OcTd from '../OcTableTd/OcTableTd.vue'

export interface Props {
  lazy?: { colspan: number }
}

const { lazy } = defineProps<Props>()

const emit = defineEmits([
  'contextmenu',
  'click',
  'dragstart',
  'drop',
  'dragenter',
  'dragleave',
  'dragover',
  'mouseleave',
  'itemVisible'
])

const observerTarget = customRef((track, trigger) => {
  let $el: HTMLElement
  return {
    get() {
      track()
      return $el
    },
    set(value) {
      $el = value
      trigger()
    }
  }
})

const lazyColspan = computed(() => {
  return lazy ? lazy.colspan : 1
})

const { isVisible } = lazy
  ? useIsVisible({
      ...lazy,
      target: observerTarget,
      onVisibleCallback: () => emit('itemVisible')
    })
  : { isVisible: ref(true) }

const isHidden = computed(() => !unref(isVisible))

if (!lazy) {
  emit('itemVisible')
}
</script>

<style lang="scss" scoped>
// needs to be scss because of the linear-gradient
@layer components {
  .shimmer::after {
    background-image: linear-gradient(
      90deg,
      rgba(#fff, 0) 0,
      rgba(#fff, 0.2) 20%,
      rgba(#fff, 0.5) 60%,
      rgba(#fff, 0)
    );
  }
}
</style>
