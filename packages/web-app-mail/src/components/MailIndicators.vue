<template>
  <div class="mail-indicators ml-2 flex items-center">
    <oc-icon v-if="mail.hasAttachment" size="xsmall" name="attachment-2" fill-type="none" />
  </div>
</template>

<script setup lang="ts">
import { Mail } from '../types'

const { mail } = defineProps<{
  mail: Mail
}>()
</script>
