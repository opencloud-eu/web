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
import { useResourceContents } from '@opencloud-eu/web-pkg'

const { resourceContentsText } = useResourceContents()
</script>
