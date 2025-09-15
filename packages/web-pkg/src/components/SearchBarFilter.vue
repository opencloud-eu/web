<template>
  <div
    class="z-[var(--z-index-modal)] absolute top-[50%] transform-[translateY(-50%)] right-0 ml-4 mb-4 mt-0 mr-[34px] float-right"
    data-testid="search-bar-filter"
    @click.stop
  >
    <div v-if="currentSelection">
      <oc-filter-chip
        :is-toggle="false"
        :is-toggle-active="false"
        :filter-label="$gettext('Location filter')"
        :selected-item-names="[currentSelectionTitle]"
        class="oc-search-bar-filter [&_button]:items-center [&_.oc-drop]:w-45"
        :has-active-state="false"
        raw
        close-on-click
      >
        <template #default>
          <oc-list>
            <li v-for="(option, index) in locationOptions" :key="index">
              <oc-button
                appearance="raw"
                size="medium"
                class="flex items-center w-full py-1 px-2"
                :class="{ 'oc-role-secondary-container': option.id === currentSelection.id }"
                justify-content="space-between"
                :disabled="!option.enabled"
                :data-test-id="option.id"
                @click="onOptionSelected(option)"
              >
                <span>{{ option.title }}</span>
                <div v-if="option.id === currentSelection.id" class="flex">
                  <oc-icon name="check" />
                </div>
              </oc-button>
            </li>
          </oc-list>
        </template>
      </oc-filter-chip>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, Ref, unref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import { SearchLocationFilterConstants, useRouteQuery } from '../composables'

type LocationOption = {
  id: string
  title: string
  enabled: Ref<boolean> | boolean
}

export default defineComponent({
  name: 'SearchBarFilter',
  props: {
    currentFolderAvailable: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const { $gettext } = useGettext()
    const useScopeQueryValue = useRouteQuery('useScope')

    const currentSelection = ref<LocationOption>()
    const userSelection = ref<LocationOption>()
    const currentSelectionTitle = computed(() => $gettext(currentSelection.value?.title))
    const locationOptions = computed<LocationOption[]>(() => [
      {
        id: SearchLocationFilterConstants.currentFolder,
        title: $gettext('Current folder'),
        enabled: props.currentFolderAvailable
      },
      {
        id: SearchLocationFilterConstants.allFiles,
        title: $gettext('All files'),
        enabled: true
      }
    ])

    watch(
      () => props.currentFolderAvailable,
      () => {
        if (unref(useScopeQueryValue)) {
          const useScope = unref(useScopeQueryValue).toString() === 'true'
          if (useScope) {
            currentSelection.value = unref(locationOptions).find(
              ({ id }) => id === SearchLocationFilterConstants.currentFolder
            )
            return
          }
          currentSelection.value = unref(locationOptions).find(
            ({ id }) => id === SearchLocationFilterConstants.allFiles
          )
          return
        }

        if (!props.currentFolderAvailable) {
          currentSelection.value = unref(locationOptions).find(
            ({ id }) => id === SearchLocationFilterConstants.allFiles
          )
          return
        }

        if (unref(userSelection)) {
          currentSelection.value = unref(locationOptions).find(
            ({ id }) => id === unref(userSelection).id
          )
          return
        }

        currentSelection.value = unref(locationOptions).find(
          ({ id }) => id === SearchLocationFilterConstants.allFiles
        )
      },
      { immediate: true }
    )

    const onOptionSelected = (option: LocationOption) => {
      userSelection.value = option
      currentSelection.value = option
      emit('update:modelValue', { value: option })
    }

    return {
      currentSelection,
      currentSelectionTitle,
      onOptionSelected,
      locationOptions
    }
  }
})
</script>
