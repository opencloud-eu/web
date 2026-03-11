<template>
  <div v-if="hasActions" class="hidden md:flex items-center h-14 -mx-4 px-4 border-b">
    <oc-button appearance="raw" :aria-label="$gettext('Edit draft')" @click="$emit('edit-draft')">
      <oc-icon name="pencil" fill-type="line" size="medium" />
    </oc-button>
  </div>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import type { Mail } from '../types'

const props = defineProps<{
  mail: Mail
}>()

defineEmits<{
  (e: 'edit-draft'): void
}>()

const isDraft = computed(() => Boolean(props.mail?.keywords?.$draft))
const hasActions = computed(() => unref(isDraft))
</script>
