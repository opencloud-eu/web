<template>
  <div v-if="selectedRole" class="flex items-center">
    <span v-if="availableRoles.length === 1">
      <span v-text="inviteLabel" />
    </span>
    <div v-else v-oc-tooltip="dropButtonTooltip" class="max-w-full">
      <oc-button
        :id="roleButtonId"
        class="files-recipient-role-select-btn max-w-full"
        appearance="raw"
        gap-size="none"
        :disabled="isLocked"
        :aria-label="
          mode === 'create' ? $gettext('Select permission') : $gettext('Edit permission')
        "
        no-hover
      >
        <span class="truncate" v-text="inviteLabel" />
        <oc-icon name="arrow-down-s" />
      </oc-button>
      <oc-contextual-helper
        v-if="isDisabledRole"
        class="ml-1 files-permission-actions-list"
        :text="customPermissionsText"
        :title="$gettext('Custom permissions')"
      />
    </div>
    <oc-drop
      v-if="availableRoles.length > 1"
      :title="$gettext('Role')"
      :toggle="'#' + roleButtonId"
      mode="click"
      padding-size="small"
      class="files-recipient-role-drop w-md"
      close-on-click
    >
      <oc-list
        class="files-recipient-role-drop-list"
        :aria-label="$gettext('Select role for the invitation')"
      >
        <li v-for="role in availableRoles" :key="role.id">
          <oc-button
            :id="`files-recipient-role-drop-btn-${role.id}`"
            class="files-recipient-role-drop-btn p-2"
            :class="{
              selected: isSelectedRole(role)
            }"
            justify-content="space-between"
            :appearance="isSelectedRole(role) ? 'filled' : 'raw-inverse'"
            :color-role="isSelectedRole(role) ? 'secondaryContainer' : 'surface'"
            @click="selectRole(role)"
          >
            <span class="flex items-center">
              <oc-icon :name="role.icon" class="pl-2 pr-4" fill-type="line" />
              <role-item :role="role" />
            </span>
            <span class="flex">
              <oc-icon v-if="isSelectedRole(role)" name="check" />
            </span>
          </oc-button>
        </li>
      </oc-list>
    </oc-drop>
  </div>
</template>

<script setup lang="ts">
import RoleItem from '../Shared/RoleItem.vue'
import { v4 as uuidV4 } from 'uuid'
import { inject, computed, ref, unref, Ref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import { ShareRole } from '@opencloud-eu/web-client'

const {
  existingShareRole = undefined,
  existingSharePermissions = [],
  domSelector = undefined,
  mode = 'create',
  isLocked = false,
  isExternal = false
} = defineProps<{
  existingShareRole?: ShareRole
  existingSharePermissions?: string[]
  domSelector?: string
  mode?: 'create' | 'edit'
  isLocked?: boolean
  isExternal?: boolean
}>()

const emit = defineEmits<{
  (e: 'optionChange', role: ShareRole): void
}>()

const { $gettext } = useGettext()

const dropButtonTooltip = computed(() => {
  if (isLocked) {
    return $gettext('Resource is temporarily locked, unable to manage share')
  }

  return ''
})
const customPermissionsText = computed(() =>
  $gettext('Dear user, please replace this legacy role with one of the currently available roles')
)

const availableInternalRoles = inject<Ref<ShareRole[]>>('availableInternalShareRoles')
const availableExternalRoles = inject<Ref<ShareRole[]>>('availableExternalShareRoles')
const availableRoles = computed(() => {
  let roles = availableInternalRoles
  if (isExternal) {
    roles = availableExternalRoles
  }

  return unref(roles)
})

let initialSelectedRole: ShareRole
const hasExistingShareRole = computed(() => !!existingShareRole)
const hasExistingSharePermissions = computed(() => !!existingSharePermissions.length)
const isDisabledRole = computed(
  () => !unref(hasExistingShareRole) && unref(hasExistingSharePermissions)
)
switch (true) {
  // if no role is set and no permissions are set, we use the first available role as the default
  case !unref(hasExistingShareRole) && !unref(hasExistingSharePermissions):
    initialSelectedRole = unref(availableRoles)[0]
    break
  // in the rare case that a role is disabled and permissions are set aka a disabled unified role ...
  case unref(isDisabledRole):
    // ... we need to create a fake role as an indicator that the permissions are custom
    initialSelectedRole = {
      displayName: $gettext('Custom permissions')
    }
    break
  default:
    initialSelectedRole = existingShareRole
    break
}

const selectedRole = ref<ShareRole>(initialSelectedRole)
const isSelectedRole = (role: ShareRole) => {
  return unref(selectedRole).id === role.id
}

const selectRole = (role: ShareRole) => {
  selectedRole.value = role
  emit('optionChange', unref(selectedRole))
}

watch(
  () => isExternal,
  () => {
    if (!unref(hasExistingShareRole)) {
      // when no role exists and the external flag changes, we need to reset the selected role
      selectedRole.value = unref(availableRoles)[0]
    }
  }
)

const roleButtonId = computed(() => {
  if (domSelector) {
    return `files-collaborators-role-button-${domSelector}-${uuidV4()}`
  }
  return 'files-collaborators-role-button-new'
})

const inviteLabel = computed(() => {
  return $gettext(selectedRole.value?.displayName || '')
})
</script>
