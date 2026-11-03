<template>
  <div class="text-center">
    <p
      data-testid="files-list-footer-info"
      class="text-role-on-surface-variant"
      v-text="resourceContentsText"
    ></p>
  </div>
</template>

<script setup lang="ts">
import { Resource } from '@opencloud-eu/web-client'
import { useResourceContents } from '@opencloud-eu/web-pkg'

const { isHidden = undefined } = defineProps<{
  isHidden?: (resource: Resource) => boolean
}>()

const { resourceContentsText } = useResourceContents({ isHidden })
</script>
