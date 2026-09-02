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
import { customRef, computed, ref, unref, Ref } from 'vue'
import { useIsVisible } from '../../composables'
import OcTd from '../OcTableTd/OcTableTd.vue'

export interface Props {
  lazy?: { colspan: number }
  scrollContainer?: Element
}

const { lazy, scrollContainer } = defineProps<Props>()

const emit = defineEmits([
  'contextmenu',
  'click',
  'dragstart',
  'drop',
  'dragenter',
  'dragleave',
  'dragover',
  'mouseleave',
  'itemVisible',
  'itemHidden'
])

const observerTarget = customRef((track, trigger) => {
  let $el: HTMLElement
  return {
    get() {
      track()
      return $el
    },
    set(value) {
      $el = value as HTMLElement
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
      target: observerTarget as Ref<HTMLElement>,
      root: computed(() => scrollContainer),
      onVisibleCallback: () => emit('itemVisible'),
      onHiddenCallback: () => emit('itemHidden')
    })
  : { isVisible: ref(true) }

const isHidden = computed(() => !unref(isVisible))

if (!lazy) {
  emit('itemVisible')
}
</script>

<style scoped>
@layer components {
  .shimmer::after {
    background-image: linear-gradient(90deg, #ffffff00 0, #ffffff33 20%, #ffffff80 60%, #ffffff00);
  }
}
</style>
