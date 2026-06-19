<template>
  <oc-checkbox
    v-if="isCheckbox"
    :model-value="checkboxModel"
    size="large"
    :label="extensionPoint.userPreference.label"
    @update:model-value="updateCheckbox"
  />
  <oc-select
    v-else
    v-model="model"
    class="extension-preference"
    :label="extensionPoint.userPreference.label"
    :label-hidden="true"
    :multiple="extensionPoint.multiple"
    :options="extensions"
    :filter="filterOptions"
    option-label="displayName"
  >
    <template #selected-option="{ userPreference }">
      <span>{{ $gettext(userPreference?.optionLabel || '') }}</span>
    </template>
    <template #option="{ userPreference }">
      <span>{{ $gettext(userPreference?.optionLabel || '') }}</span>
    </template>
  </oc-select>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, unref } from 'vue'
import {
  Extension,
  ExtensionPoint,
  useExtensionPreferencesStore,
  useExtensionRegistry
} from '@opencloud-eu/web-pkg'

export default defineComponent({
  name: 'ExtensionPreference',
  props: {
    extensionPoint: {
      type: Object as PropType<ExtensionPoint<Extension>>,
      required: true
    }
  },
  setup(props) {
    const extensionRegistry = useExtensionRegistry()
    const extensionPreferences = useExtensionPreferencesStore()

    const isCheckbox = computed(() => props.extensionPoint.userPreference?.type === 'checkbox')

    const allExtensions = computed(() => extensionRegistry.requestExtensions(props.extensionPoint))
    const defaultExtensionIds = computed(() => {
      return extensionPreferences.extractDefaultExtensionIds(
        props.extensionPoint,
        unref(allExtensions)
      )
    })
    const extensions = computed(() => {
      return unref(allExtensions).sort((extension1, extension2) => {
        if (
          unref(defaultExtensionIds).length &&
          (unref(defaultExtensionIds).includes(extension1.id) ||
            unref(defaultExtensionIds).includes(extension2.id))
        ) {
          return extension1.id === props.extensionPoint.defaultExtensionId ? -1 : 1
        }
        return extension1.id.localeCompare(extension2.id)
      })
    })

    // Checkbox mode: exactly 2 extensions expected (enabled/disabled),
    // checked = first extension selected, unchecked = second (or none)
    const checkboxModel = computed(() => {
      const preference = extensionPreferences.getExtensionPreference(
        props.extensionPoint.id,
        unref(defaultExtensionIds)
      )
      const exts = unref(extensions)
      if (!exts.length) return false
      return preference.selectedExtensionIds.includes(exts[0].id)
    })

    const updateCheckbox = (checked: boolean) => {
      const exts = unref(extensions)
      if (!exts.length) return
      if (checked) {
        extensionPreferences.setSelectedExtensionIds(props.extensionPoint.id, [exts[0].id])
      } else {
        extensionPreferences.setSelectedExtensionIds(
          props.extensionPoint.id,
          exts.length > 1 ? [exts[1].id] : []
        )
      }
    }

    // Select mode (existing logic)
    const modelSingleSelect = computed({
      get(): Extension {
        const preference = extensionPreferences.getExtensionPreference(
          props.extensionPoint.id,
          unref(defaultExtensionIds)
        )
        return unref(extensions).find((extension) =>
          preference.selectedExtensionIds.includes(extension.id)
        )
      },
      set(extension) {
        extensionPreferences.setSelectedExtensionIds(props.extensionPoint.id, [extension.id])
      }
    })
    const modelMultiSelect = computed({
      get(): Extension[] {
        const preference = extensionPreferences.getExtensionPreference(
          props.extensionPoint.id,
          unref(defaultExtensionIds)
        )
        return unref(extensions).filter((extension) =>
          preference.selectedExtensionIds.includes(extension.id)
        )
      },
      set(extensions) {
        extensionPreferences.setSelectedExtensionIds(
          props.extensionPoint.id,
          extensions.map((extension) => extension.id)
        )
      }
    })

    const filterOptions = (options: Extension[], search: string) => {
      return options.filter((option) =>
        option.userPreference?.optionLabel.toLowerCase().includes(search.toLowerCase().trim())
      )
    }
    return {
      isCheckbox,
      checkboxModel,
      updateCheckbox,
      extensions,
      filterOptions,
      model: props.extensionPoint.multiple ? modelMultiSelect : modelSingleSelect
    }
  }
})
</script>
