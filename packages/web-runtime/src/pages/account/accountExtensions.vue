<template>
  <div id="account-extensions">
    <h1 class="text-lg mt-2" v-text="$gettext('Apps')" />
    <no-content-message
      v-if="!extensionPointsWithUserPreferences.length"
      id="account-extensions-empty"
      icon="store"
    >
      <template #message>
        <span v-text="$gettext('No apps available')" />
      </template>
    </no-content-message>
    <account-table
      v-else
      :fields="[$gettext('App name'), $gettext('App description'), $gettext('App value')]"
      class="account-page-extensions"
    >
      <oc-table-tr
        v-for="extensionPoint in extensionPointsWithUserPreferences"
        :key="`extension-point-preference-${extensionPoint.id}`"
        class="mb-4"
      >
        <oc-table-td>{{ $gettext(extensionPoint.userPreference.label) }}</oc-table-td>
        <oc-table-td v-if="extensionPoint.userPreference.description">
          <span v-text="$gettext(extensionPoint.userPreference.description || '')" />
        </oc-table-td>
        <oc-table-td>
          <extension-preference :extension-point="extensionPoint" />
        </oc-table-td>
      </oc-table-tr>
    </account-table>
  </div>
</template>
<script setup lang="ts">
import { useGettext } from 'vue3-gettext'
import ExtensionPreference from '../../components/Account/ExtensionPreference.vue'
import AccountTable from '../../components/Account/AccountTable.vue'
import { NoContentMessage, useExtensionRegistry } from '@opencloud-eu/web-pkg'
import { computed } from 'vue'
import { isEmpty } from 'lodash-es'

const { $gettext } = useGettext()
const extensionRegistry = useExtensionRegistry()

const extensionPointsWithUserPreferences = computed(() => {
  return extensionRegistry.getExtensionPoints().filter((extensionPoint) => {
    if (
      !Object.hasOwn(extensionPoint, 'userPreference') ||
      isEmpty(extensionPoint.userPreference)
    ) {
      return false
    }
    const extensions = extensionRegistry.requestExtensions(extensionPoint)
    return !!extensions.length
  })
})
</script>
