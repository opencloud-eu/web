<template>
  <oc-button
    appearance="raw"
    justify-content="left"
    :type="option.to ? 'router-link' : 'button'"
    :to="option.to"
    @click="option.method"
  >
    <oc-icon :name="option.icon" fill-type="line" size="medium" />
    <span v-text="option.title" />
  </oc-button>
</template>

<script setup lang="ts">
import { EditOption } from './EditDropdown.vue'

const { option } = defineProps<{
  option: EditOption
}>()
</script>
