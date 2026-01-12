<template>
  <oc-page-size
    label="Items per page"
    :options="[10, 20, 50]"
    :selected="currentSelection"
    @change="setItemsPerPage"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { PageSizeOption } from '../../../src/helpers'

const options: number[] = [10, 20, 50]
const currentSelection = ref(options[0])

const setItemsPerPage = (value: PageSizeOption) => {
  currentSelection.value = value as number
}
</script>
