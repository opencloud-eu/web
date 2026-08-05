<template>
  <span v-text="formattedSize" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatFileSize } from '../../helpers'
import { useGettext } from 'vue3-gettext'

const { size } = defineProps<{
  size: string | number
}>()

const { current: currentLanguage } = useGettext()
const formattedSize = computed(() => formatFileSize(size, currentLanguage))
</script>
