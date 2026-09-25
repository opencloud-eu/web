<template>
  <div class="[&_.vs\_\_actions]:!flex-nowrap">
    <oc-select
      id="create-space-members-input"
      class="w-full"
      :label="$gettext('Members')"
      :placeholder="$gettext('Search')"
      :model-value="selectedCollaborators"
      :options="autocompleteResults"
      :loading="searchInProgress"
      :multiple="true"
      :filter="filterRecipients"
      :position-fixed="true"
      :dropdown-should-open="
        ({ open, search }: DropDownShouldOpenOptions) =>
          open && search.length >= minSearchLength && !searchInProgress
      "
      @search:input="onSearch"
      @update:model-value="onCollaboratorsChanged"
    >
      <template #option="option">
        <autocomplete-item :item="option" :term="searchQuery" />
      </template>
      <template #no-options>
        <span v-text="$gettext('No users or groups found.')" />
      </template>
      <template #selected-option-container="{ option, deselect }">
        <recipient-container :key="option.id" :recipient="option" :deselect="deselect" />
      </template>
      <template #open-indicator>
        <!-- Empty to hide the caret -->
        <span />
      </template>
    </oc-select>
    <role-dropdown
      class="mt-2 ml-1"
      mode="create"
      :existing-share-role="selectedRole"
      @option-change="onRoleChanged"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, provide, ref, unref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import { CollaboratorAutoCompleteItem, ShareRole } from '@opencloud-eu/web-client'
import { SpaceMemberInvite, useSharesStore, useUserStore } from '@opencloud-eu/web-pkg'
import { useCollaboratorAutocomplete, useCollaboratorSearch } from '../../../composables/shares'
import RoleDropdown from '../../SideBar/Shares/Collaborators/RoleDropdown.vue'
import AutocompleteItem from '../../SideBar/Shares/Collaborators/InviteCollaborator/AutocompleteItem.vue'
import RecipientContainer from '../../SideBar/Shares/Collaborators/InviteCollaborator/RecipientContainer.vue'

type DropDownShouldOpenOptions = { open: boolean; search: string[] }

const members = defineModel<SpaceMemberInvite[]>({ default: () => [] })
// Kept outside the component so a step change doesn't reset the pick.
const roleId = defineModel<string>('roleId', { default: '' })

const { $gettext } = useGettext()
const sharesStore = useSharesStore()
const userStore = useUserStore()
const { searchCollaborators } = useCollaboratorSearch()

// Unmounted on every step change, while the model keeps the members.
const selectedCollaborators = ref<CollaboratorAutoCompleteItem[]>(
  unref(members).map(
    ({ id, displayName, shareType }) =>
      ({ id, displayName, shareType }) as CollaboratorAutoCompleteItem
  )
)

const {
  autocompleteResults,
  filterRecipients,
  minSearchLength,
  onSearch,
  searchInProgress,
  searchQuery
} = useCollaboratorAutocomplete(async (query, signal) => {
  const collaborators = await searchCollaborators(query, { signal })

  return collaborators.filter(({ id }) => {
    // the creator becomes the manager of the space anyway
    if (id === userStore.user.id) {
      return false
    }
    return !unref(selectedCollaborators).some((collaborator) => collaborator.id === id)
  })
})

// The space doesn't exist yet, so its allowed roles can't be read from the
// server. Space roles are the ones that apply to a drive root.
const spaceRoles = computed(() =>
  Object.values(sharesStore.graphRoles).filter(({ rolePermissions }) =>
    rolePermissions?.some(({ condition }) => condition === 'exists @Resource.Root')
  )
)

const selectedRole = computed(
  () => unref(spaceRoles).find(({ id }) => id === unref(roleId)) || unref(spaceRoles)[0]
)

provide('availableInternalShareRoles', spaceRoles)
provide('availableExternalShareRoles', ref<ShareRole[]>([]))

watch([selectedCollaborators, selectedRole], ([collaborators, role]) => {
  if (!role) {
    members.value = []
    return
  }

  members.value = collaborators.map(({ id, displayName, shareType }) => ({
    id,
    displayName,
    shareType,
    roleId: role.id
  }))
})

function onCollaboratorsChanged(collaborators: CollaboratorAutoCompleteItem[]) {
  selectedCollaborators.value = collaborators
  autocompleteResults.value = []
  searchQuery.value = ''
}

function onRoleChanged(role: ShareRole) {
  roleId.value = role.id
}
</script>
