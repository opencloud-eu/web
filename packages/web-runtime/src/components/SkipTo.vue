<template>
  <button
    class="skip-button absolute left-0 top-[-100px] z-60 bg-role-secondary text-role-on-secondary py-1 px-2 focus:border-dashed focus:border-white focus:outline-0 focus:top-0 appearance-none"
    @click="skipToTarget"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'

const { target } = defineProps<{
  target: string
}>()

const targetElement = computed(() => document.getElementById(target))

function skipToTarget() {
  if (unref(targetElement)) {
    targetElement.value.setAttribute('tabindex', '-1')
    targetElement.value.focus()
    targetElement.value.scrollIntoView()
  }
}
</script>
