<template>
  <div id="account-extensions">
    <h1 class="text-lg mt-1" v-text="$gettext('Extensions')" />
    <no-content-message
      v-if="!extensionPointsWithUserPreferences.length"
      id="account-extensions-empty"
      icon="brush-2"
    >
      <template #message>
        <span v-text="$gettext('No extensions available')" />
      </template>
    </no-content-message>
    <account-table
      v-else
      :fields="[
        $gettext('Extension name'),
        $gettext('Extension description'),
        $gettext('Extension value')
      ]"
      class="account-page-extensions"
    >
      <oc-table-tr
        v-for="extensionPoint in extensionPointsWithUserPreferences"
        :key="`extension-point-preference-${extensionPoint.id}`"
        class="mb-4"
      >
        <oc-table-td>{{ extensionPoint.userPreference.label }}</oc-table-td>
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
