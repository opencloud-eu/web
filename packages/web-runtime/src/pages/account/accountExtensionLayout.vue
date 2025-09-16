<template>
  <div id="account-extension">
    <component :is="extension.content" v-if="extension" />
  </div>
</template>
<script setup lang="ts">
import { computed, unref } from 'vue'
import { preferencesPanelExtensionPoint } from '../../extensionPoints'
import { useExtensionRegistry, useRouteQuery } from '@opencloud-eu/web-pkg/src'

const extensionRegistry = useExtensionRegistry()

const extensionId = useRouteQuery('extension-id')

const extension: any = computed(() => {
  return extensionRegistry
    .requestExtensions(preferencesPanelExtensionPoint)
    .find((ext) => ext.id === unref(extensionId))
})
</script>
