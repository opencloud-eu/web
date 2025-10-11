<template>
  <oc-button
    v-if="availableLinkTypeOptions.length > 1"
    :id="`link-role-dropdown-toggle-${dropUuid}`"
    appearance="raw"
    gap-size="none"
    no-hover
    class="text-left link-role-dropdown-toggle"
  >
    <span class="link-current-role" v-text="currentLinkRoleLabel || $gettext('Select a role')" />
    <oc-icon name="arrow-down-s" />
  </oc-button>
  <span
    v-else
    v-oc-tooltip="getLinkRoleByType(modelValue)?.description"
    class="link-current-role mr-4"
    v-text="currentLinkRoleLabel"
  />
  <oc-drop
    v-if="availableLinkTypeOptions.length > 1"
    class="link-role-dropdown w-md"
    :title="$gettext('Role')"
    :drop-id="`link-role-dropdown-${dropUuid}`"
    :toggle="`#link-role-dropdown-toggle-${dropUuid}`"
    padding-size="small"
    mode="click"
    close-on-click
  >
    <oc-list class="role-dropdown-list">
      <li v-for="(type, i) in availableLinkTypeOptions" :key="`role-dropdown-${i}`">
        <oc-button
          :id="`files-role-${getLinkRoleByType(type).id}`"
          :class="{
            selected: isSelectedType(type)
          }"
          :appearance="isSelectedType(type) ? 'filled' : 'raw-inverse'"
          :color-role="isSelectedType(type) ? 'secondaryContainer' : 'surface'"
          justify-content="space-between"
          class="p-2"
          @click="updateSelectedType(type)"
        >
          <span class="flex items-center">
            <oc-icon :name="getLinkRoleByType(type).icon" class="pl-2 pr-4" />
            <span class="text-left">
              <span
                class="role-dropdown-list-option-label font-semibold block w-full leading-4"
                v-text="$gettext(getLinkRoleByType(type).displayName)"
              />
              <span class="text-sm leading-4">{{
                $gettext(getLinkRoleByType(type).description)
              }}</span>
            </span>
          </span>
          <span class="flex">
            <oc-icon v-if="isSelectedType(type)" name="check" />
          </span>
        </oc-button>
      </li>
    </oc-list>
  </oc-drop>
</template>

<script lang="ts">
import { v4 as uuidV4 } from 'uuid'
import { defineComponent, PropType } from 'vue'
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { SharingLinkType } from '@opencloud-eu/web-client/graph/generated'
import { useLinkTypes } from '../composables/links'

export default defineComponent({
  name: 'LinkRoleDropdown',
  props: {
    modelValue: { type: Object as PropType<SharingLinkType>, required: true },
    availableLinkTypeOptions: { type: Array as PropType<SharingLinkType[]>, required: true }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const { $gettext } = useGettext()
    const { getLinkRoleByType } = useLinkTypes()

    const isSelectedType = (type: SharingLinkType) => {
      return props.modelValue === type
    }

    const updateSelectedType = (type: SharingLinkType) => {
      emit('update:modelValue', type)
    }

    const currentLinkRoleLabel = computed(() => {
      return $gettext(getLinkRoleByType(props.modelValue)?.displayName)
    })

    const dropUuid = uuidV4()

    return {
      isSelectedType,
      updateSelectedType,
      currentLinkRoleLabel,
      dropUuid,
      getLinkRoleByType
    }
  }
})
</script>
