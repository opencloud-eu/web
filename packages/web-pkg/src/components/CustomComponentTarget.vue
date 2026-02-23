<template>
  <component
    :is="extension.content"
    v-for="extension in extensions"
    :key="`custom-component-${extension.id}`"
    v-bind="extension.componentProps ? extension.componentProps() : undefined"
  />
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import {
  CustomComponentExtension,
  ExtensionPoint,
  useExtensionPreferencesStore,
  useExtensionRegistry
} from '../composables'

const props = defineProps<{
  extensionPoint: ExtensionPoint<CustomComponentExtension>
}>()

const extensionRegistry = useExtensionRegistry()
const extensionPreferences = useExtensionPreferencesStore()

const allExtensions = computed(() => {
  return extensionRegistry.requestExtensions(props.extensionPoint)
})

const defaultExtensionIds = extensionPreferences.extractDefaultExtensionIds(
  props.extensionPoint,
  unref(allExtensions)
)

const extensions = computed<CustomComponentExtension[]>(() => {
  // TODO: for `multiple` we want to respect the selected extensions as well in the future.
  if (props.extensionPoint.multiple || unref(allExtensions).length <= 1) {
    return unref(allExtensions)
  }

  const preference = extensionPreferences.getExtensionPreference(
    props.extensionPoint.id,
    defaultExtensionIds
  )
  if (preference.selectedExtensionIds.length) {
    return [
      unref(allExtensions).find((extension) =>
        preference.selectedExtensionIds.includes(extension.id)
      ) || unref(allExtensions)[0]
    ]
  }

  // if no user preference and no default provided, return the first one.
  return [unref(allExtensions)[0]]
})
</script>
