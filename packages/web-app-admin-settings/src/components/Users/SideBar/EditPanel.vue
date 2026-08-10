<template>
  <div id="user-edit-panel">
    <UserInfoBox :user="user" />
    <form id="user-edit-form" class="bg-role-surface-container p-4 rounded-sm" autocomplete="off">
      <div>
        <oc-text-input
          id="userName-input"
          v-model="editUser.onPremisesSamAccountName"
          class="mb-2"
          :label="$gettext('User name')"
          :error-message="formData.userName.errorMessage"
          :fix-message-line="true"
          :read-only="isInputFieldReadOnly('user.onPremisesSamAccountName')"
          required-mark
          @update:model-value="validateUserName"
        />
        <oc-text-input
          id="displayName-input"
          v-model="editUser.displayName"
          class="mb-2"
          :label="$gettext('First and last name')"
          :error-message="formData.displayName.errorMessage"
          :fix-message-line="true"
          :read-only="isInputFieldReadOnly('user.displayName')"
          required-mark
          @update:model-value="validateDisplayName"
        />
        <oc-text-input
          id="email-input"
          v-model="editUser.mail"
          class="mb-2"
          :label="$gettext('Email')"
          :error-message="formData.email.errorMessage"
          :error-message-debounced-time="1000"
          type="email"
          :fix-message-line="true"
          :read-only="isInputFieldReadOnly('user.mail')"
          required-mark
          @update:model-value="validateEmail"
        />
        <oc-text-input
          id="password-input"
          :model-value="editUser.passwordProfile?.password"
          class="mb-2"
          :label="$gettext('Password')"
          type="password"
          :fix-message-line="true"
          placeholder="●●●●●●●●"
          :read-only="isInputFieldReadOnly('user.passwordProfile')"
          @update:model-value="onUpdatePassword"
        />
        <div class="mb-2">
          <oc-select
            id="role-input"
            :model-value="selectedRoleValue"
            :label="$gettext('Role')"
            option-label="displayName"
            :options="translatedRoleOptions"
            :clearable="false"
            :read-only="isInputFieldReadOnly('user.appRoleAssignments')"
            required-mark
            @update:model-value="onUpdateRole"
          />
          <div class="oc-text-input-message"></div>
        </div>
        <div v-if="!graphUsersEditLoginAllowedDisabled" class="mb-2">
          <oc-select
            id="login-input"
            :disabled="isLoginInputDisabled"
            :model-value="selectedLoginValue"
            :label="$gettext('Login')"
            :options="loginOptions"
            :clearable="false"
            :read-only="isInputFieldReadOnly('user.accountEnabled')"
            required-mark
            @update:model-value="onUpdateLogin"
          />

          <div class="oc-text-input-message"></div>
        </div>
        <quota-select
          id="quota-select-form"
          :key="'quota-select-' + user.id"
          :disabled="isQuotaInputDisabled"
          class="mb-2"
          :label="$gettext('Personal quota')"
          :total-quota="editUser.drive?.quota?.total || 0"
          :max-quota="maxQuota"
          :fix-message-line="true"
          :description-message="
            isQuotaInputDisabled && !isInputFieldReadOnly('drive.quota')
              ? $gettext('To set an individual quota, the user needs to have logged in once.')
              : ''
          "
          :read-only="isInputFieldReadOnly('drive.quota')"
          required-mark
          @selected-option-change="changeSelectedQuotaOption"
        />
        <group-select
          class="mb-2"
          :read-only="isInputFieldReadOnly('user.memberOf')"
          :selected-groups="editUser.memberOf"
          :group-options="groupOptions"
          @selected-option-change="changeSelectedGroupOption"
        />
      </div>
      <compare-save-dialog
        class="mb-6"
        :original-object="compareSaveDialogOriginalObject"
        :compare-object="editUser"
        :confirm-button-disabled="invalidFormData"
        @revert="revertChanges"
        @confirm="onEditUser({ user, editUser })"
      ></compare-save-dialog>
    </form>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, unref, watch } from 'vue'
import * as EmailValidator from 'email-validator'
import {
  CompareSaveDialog,
  QuotaSelect,
  useUserStore,
  useCapabilityStore,
  useEventBus,
  useMessages,
  useSpacesStore,
  useAuthService
} from '@opencloud-eu/web-pkg'
import GroupSelect from '../GroupSelect.vue'
import { cloneDeep, isEmpty, isEqual, omit } from 'lodash-es'
import { AppRole, AppRoleAssignment, Group, User } from '@opencloud-eu/web-client/graph/generated'
import { MaybeRef, useClientService } from '@opencloud-eu/web-pkg'
import { storeToRefs } from 'pinia'
import { diff } from 'deep-object-diff'
import { useUserSettingsStore } from '../../../composables/stores/userSettings'
import { useGettext } from 'vue3-gettext'

const {
  roles,
  groups,
  applicationId,
  user = undefined
} = defineProps<{
  roles: AppRole[]
  groups: Group[]
  applicationId: string
  user?: User
}>()

const capabilityStore = useCapabilityStore()
const clientService = useClientService()
const userStore = useUserStore()
const userSettingsStore = useUserSettingsStore()
const spacesStore = useSpacesStore()
const eventBus = useEventBus()
const { showErrorMessage } = useMessages()
const { $gettext } = useGettext()
const authService = useAuthService()
const { graphUsersEditLoginAllowedDisabled } = storeToRefs(capabilityStore)
const editUser: MaybeRef<User> = ref()
const formData = ref({
  displayName: {
    errorMessage: '',
    valid: true
  },
  userName: {
    errorMessage: '',
    valid: true
  },
  email: {
    errorMessage: '',
    valid: true
  }
})
const groupOptions = computed(() => {
  const { memberOf: selectedGroups } = unref(editUser)
  if (!selectedGroups) {
    return []
  }
  return groups.filter(
    (g) => !selectedGroups.some((s) => s.id === g.id) && !g.groupTypes?.includes('ReadOnly')
  )
})
const isLoginInputDisabled = computed(() => userStore.user.id === (user as User).id)
const isInputFieldReadOnly = (key: string) => {
  return capabilityStore.graphUsersReadOnlyAttributes.includes(key)
}

const onUpdateUserAppRoleAssignments = (user: User, editUser: User) => {
  const client = clientService.graphAuthenticated
  return client.users.createUserAppRoleAssignment(user.id, {
    appRoleId: editUser.appRoleAssignments[0].appRoleId,
    resourceId: applicationId,
    principalId: editUser.id
  })
}
const onUpdateUserGroupAssignments = (user: User, editUser: User) => {
  const client = clientService.graphAuthenticated
  const groupsToAdd = editUser.memberOf.filter(
    (editUserGroup) => !user.memberOf.some((g) => g.id === editUserGroup.id)
  )
  const groupsToDelete = user.memberOf.filter(
    (editUserGroup) => !editUser.memberOf.some((g) => g.id === editUserGroup.id)
  )
  const requests = []

  for (const groupToAdd of groupsToAdd) {
    requests.push(client.groups.addMember(groupToAdd.id, user.id))
  }
  for (const groupToDelete of groupsToDelete) {
    requests.push(client.groups.deleteMember(groupToDelete.id, user.id))
  }

  return Promise.all(requests)
}

const onUpdateUserDrive = async (editUser: User) => {
  const client = clientService.graphAuthenticated
  const updateSpace = await client.drives.updateDrive(editUser.drive.id, {
    quota: { total: editUser.drive.quota.total }
  })

  if (editUser.id === userStore.user.id) {
    // Load current user quota
    spacesStore.updateSpaceField({
      id: editUser.drive.id,
      field: 'spaceQuota',
      value: updateSpace.spaceQuota
    })
  }
}

const onEditUser = async ({ user, editUser }: { user: User; editUser: User }) => {
  try {
    const client = clientService.graphAuthenticated
    const graphEditUserPayloadExtractor = (user: User) => {
      return omit(user, ['drive', 'appRoleAssignments', 'memberOf'])
    }
    const graphEditUserPayload = diff(
      graphEditUserPayloadExtractor(user),
      graphEditUserPayloadExtractor(editUser)
    ) as User

    if (!isEmpty(graphEditUserPayload)) {
      await client.users.editUser(editUser.id, graphEditUserPayload)
    }

    if (!isEqual(user.drive?.quota?.total, editUser.drive?.quota?.total)) {
      await onUpdateUserDrive(editUser)
    }

    if (!isEqual(user.memberOf, editUser.memberOf)) {
      await onUpdateUserGroupAssignments(user, editUser)
    }

    if (
      !isEqual(user.appRoleAssignments[0]?.appRoleId, editUser.appRoleAssignments[0]?.appRoleId)
    ) {
      await onUpdateUserAppRoleAssignments(user, editUser)
    }

    // When the username of the current user changes, we need to obtain a new token
    if (
      editUser.id === user.id &&
      editUser.onPremisesSamAccountName !== user.onPremisesSamAccountName
    ) {
      await authService.signinSilent()
    }

    const updatedUser = await client.users.getUser(user.id)
    userSettingsStore.upsertUser(updatedUser)

    eventBus.publish('sidebar.entity.saved')

    if (userStore.user.id === updatedUser.id) {
      userStore.setUser(updatedUser)
    }

    return updatedUser
  } catch (error) {
    console.error(error)
    showErrorMessage({
      title: $gettext('Failed to edit user'),
      errors: [error]
    })
  }
}

const maxQuota = computed(() => capabilityStore.spacesMaxQuota)

const loginOptions = computed(() => [
  {
    label: $gettext('Allowed'),
    value: true
  },
  {
    label: $gettext('Forbidden'),
    value: false
  }
])

const selectedLoginValue = computed(() => {
  return unref(loginOptions).find((option) =>
    !('accountEnabled' in editUser.value)
      ? option.value === true
      : editUser.value.accountEnabled === option.value
  )
})

const translatedRoleOptions = computed(() => {
  return unref(roles).map((role) => {
    return { ...role, displayName: $gettext(role.displayName) }
  })
})

const selectedRoleValue = computed(() => {
  const assignedRole = unref(editUser)?.appRoleAssignments?.[0]
  return unref(translatedRoleOptions).find((role) => role.id === assignedRole?.appRoleId)
})

const invalidFormData = computed(() => {
  return Object.values(unref(formData))
    .map((v) => !!v.valid)
    .includes(false)
})

const showQuota = computed(() => {
  return unref(editUser).drive?.quota
})

const isQuotaInputDisabled = computed(() => {
  return typeof unref(showQuota) === 'undefined'
})

const compareSaveDialogOriginalObject = computed(() => {
  return cloneDeep(unref(user))
})

const changeSelectedQuotaOption = (option: { value: number; displayValue: string }) => {
  editUser.value.drive.quota.total = option.value
}

const changeSelectedGroupOption = (option: Group[]) => {
  editUser.value.memberOf = option
}

const validateUserName = async () => {
  formData.value.userName.valid = false

  if (editUser.value.onPremisesSamAccountName.trim() === '') {
    formData.value.userName.errorMessage = $gettext('User name cannot be empty')
    return false
  }

  if (editUser.value.onPremisesSamAccountName.includes(' ')) {
    formData.value.userName.errorMessage = $gettext('User name cannot contain white spaces')
    return false
  }

  if (
    editUser.value.onPremisesSamAccountName.length &&
    !isNaN(parseInt(editUser.value.onPremisesSamAccountName[0]))
  ) {
    formData.value.userName.errorMessage = $gettext('User name cannot start with a number')
    return false
  }

  if (editUser.value.onPremisesSamAccountName.length > 255) {
    formData.value.userName.errorMessage = $gettext('User name cannot exceed 255 characters')
    return false
  }

  if (user.onPremisesSamAccountName !== editUser.value.onPremisesSamAccountName) {
    try {
      // Validate username by fetching the user. If the request succeeds, we throw a validation error
      const client = clientService.graphAuthenticated
      await client.users.getUser(editUser.value.onPremisesSamAccountName)
      formData.value.userName.errorMessage = $gettext('User "%{userName}" already exists', {
        userName: editUser.value.onPremisesSamAccountName
      })
      return false
    } catch {}
  }

  formData.value.userName.errorMessage = ''
  formData.value.userName.valid = true
  return true
}

const validateDisplayName = () => {
  formData.value.displayName.valid = false

  if (editUser.value.displayName.trim() === '') {
    formData.value.displayName.errorMessage = $gettext('First and last name cannot be empty')
    return false
  }

  if (editUser.value.displayName.length > 255) {
    formData.value.displayName.errorMessage = $gettext(
      'First and last name cannot exceed 255 characters'
    )
    return false
  }

  formData.value.displayName.errorMessage = ''
  formData.value.displayName.valid = true
  return true
}

const validateEmail = () => {
  formData.value.email.valid = false

  if (!EmailValidator.validate(editUser.value.mail)) {
    formData.value.email.errorMessage = $gettext('Please enter a valid email')
    return false
  }

  formData.value.email.errorMessage = ''
  formData.value.email.valid = true
  return true
}

const revertChanges = () => {
  editUser.value = cloneDeep(unref(user))
  Object.values(unref(formData)).forEach((formDataValue) => {
    formDataValue.valid = true
    formDataValue.errorMessage = ''
  })
}

const onUpdateRole = (role: AppRoleAssignment) => {
  if (!unref(editUser).appRoleAssignments.length) {
    // FIXME: Add resourceId and principalId to be able to remove type cast
    unref(editUser).appRoleAssignments.push({
      appRoleId: role.id
    } as AppRoleAssignment)
    return
  }
  unref(editUser).appRoleAssignments[0].appRoleId = role.id
}

const onUpdatePassword = (password: string) => {
  unref(editUser).passwordProfile = {
    password
  }
}

const onUpdateLogin = ({ value }: { value: boolean }) => {
  /**
   * Property accountEnabled won't be always set, but this still means, that login is allowed.
   * So we actually don't need to change the property if missing and not set to forbidden in the UI.
   * This also avoids the compare save dialog from displaying that there are unsaved changes.
   */
  if (value === true && !('accountEnabled' in user)) {
    delete editUser.value.accountEnabled
    return
  }
  editUser.value.accountEnabled = value
}

watch(
  () => user,
  () => {
    editUser.value = cloneDeep(user)
  },
  { deep: true, immediate: true }
)
</script>
