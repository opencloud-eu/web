<template>
  <div id="account-extension">
    <no-content-message v-if="!extension" id="account-extensions-empty" icon="emotion-unhappy">
      <template #message>
        <span v-text="$gettext('Extension not found')" />
      </template>
    </no-content-message>
    <component :is="extension.content" v-else />
  </div>
</template>
<script setup lang="ts">
import { computed, unref } from 'vue'
import { preferencesPanelExtensionPoint } from '../../extensionPoints'
import { NoContentMessage, useExtensionRegistry, useRouteQuery } from '@opencloud-eu/web-pkg/src'

const extensionRegistry = useExtensionRegistry()

const extensionId = useRouteQuery('extension-id')

const extension: any = computed(() => {
  return extensionRegistry
    .requestExtensions(preferencesPanelExtensionPoint)
    .find((ext) => ext.id === unref(extensionId))
})
</script>
