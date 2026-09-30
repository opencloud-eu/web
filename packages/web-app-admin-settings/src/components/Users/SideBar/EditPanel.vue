<template>
  <div id="user-edit-panel" class="flex-1 flex flex-col p-2">
    <form id="user-edit-form" class="flex-1 flex flex-col" autocomplete="off">
      <section class="bg-role-surface-container rounded-xl px-4 pt-3 pb-1">
        <h3 class="font-semibold text-sm mt-0 mb-1" v-text="$gettext('Profile')" />
        <oc-text-input
          id="userName-input"
          v-model="editUser.onPremisesSamAccountName"
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
          :label="$gettext('Email')"
          :error-message="formData.email.errorMessage"
          :error-message-debounced-time="1000"
          type="email"
          :fix-message-line="true"
          :read-only="isInputFieldReadOnly('user.mail')"
          required-mark
          @update:model-value="validateEmail"
        />
      </section>
      <section class="bg-role-surface-container rounded-xl px-4 pt-3 pb-1 mt-4">
        <h3 class="font-semibold text-sm mt-0 mb-1" v-text="$gettext('Access')" />
        <oc-text-input
          id="password-input"
          :model-value="editUser.passwordProfile?.password"
          :label="$gettext('Password')"
          type="password"
          :fix-message-line="true"
          placeholder="●●●●●●●●"
          :read-only="isInputFieldReadOnly('user.passwordProfile')"
          @update:model-value="onUpdatePassword"
        />
        <oc-switch
          v-if="!graphUsersEditLoginAllowedDisabled"
          id="login-input"
          class="flex justify-between mb-5"
          :checked="loginAllowed"
          :label="$gettext('Login allowed')"
          :disabled="isLoginInputDisabled || isInputFieldReadOnly('user.accountEnabled')"
          @update:checked="onUpdateLogin"
        />
        <oc-select
          id="role-input"
          :model-value="selectedRoleValue"
          :label="$gettext('Role')"
          option-label="displayName"
          :options="translatedRoleOptions"
          :clearable="false"
          :fix-message-line="true"
          :read-only="isInputFieldReadOnly('user.appRoleAssignments')"
          required-mark
          @update:model-value="onUpdateRole"
        />
        <quota-select
          id="quota-select-form"
          :key="'quota-select-' + user.id"
          :disabled="isQuotaInputDisabled"
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
      </section>
      <section class="bg-role-surface-container rounded-xl px-4 pt-3 pb-1 mt-4">
        <h3 class="font-semibold text-sm mt-0 mb-1" v-text="$gettext('Membership')" />
        <group-select
          :read-only="isInputFieldReadOnly('user.memberOf')"
          :selected-groups="editUser.memberOf"
          :group-options="groupOptions"
          @selected-option-change="changeSelectedGroupOption"
        />
      </section>
      <compare-save-dialog
        v-model:saved="saved"
        class="mt-auto pt-4"
        :original-object="user"
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
  useMessages,
  useSpacesStore,
  useAuthService
} from '@opencloud-eu/web-pkg'
import GroupSelect from '../GroupSelect.vue'
import { cloneDeep, isEmpty, isEqual, omit } from 'lodash-es'
import { AppRole, AppRoleAssignment, Group, User } from '@opencloud-eu/web-client/graph/generated'
import { useClientService } from '@opencloud-eu/web-pkg'
import { storeToRefs } from 'pinia'
import { diff } from 'deep-object-diff'
import { useUserSettingsStore } from '../../../composables/stores/userSettings'
import { useUserNameValidation } from '../../../composables/users'
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
const { showErrorMessage } = useMessages()
const { $gettext } = useGettext()
const { getUserNameError } = useUserNameValidation()
const authService = useAuthService()
const { graphUsersEditLoginAllowedDisabled } = storeToRefs(capabilityStore)
const editUser = ref<User>()
const saved = ref(false)
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
function isInputFieldReadOnly(key: string) {
  return capabilityStore.graphUsersReadOnlyAttributes.includes(key)
}

function onUpdateUserAppRoleAssignments(user: User, editUser: User) {
  const client = clientService.graphAuthenticated
  return client.users.createUserAppRoleAssignment(user.id, {
    appRoleId: editUser.appRoleAssignments[0].appRoleId,
    resourceId: applicationId,
    principalId: editUser.id
  })
}
function onUpdateUserGroupAssignments(user: User, editUser: User) {
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

async function onUpdateUserDrive(editUser: User) {
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

function getGraphEditUserPayload(user: User) {
  return omit(user, ['drive', 'appRoleAssignments', 'memberOf'])
}

async function onEditUser({ user, editUser }: { user: User; editUser: User }) {
  try {
    const client = clientService.graphAuthenticated
    const graphEditUserPayload = diff(
      getGraphEditUserPayload(user),
      getGraphEditUserPayload(editUser)
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

    saved.value = true

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

// accountEnabled is not always set, a missing value means that login is allowed
const loginAllowed = computed(() => unref(editUser).accountEnabled !== false)

const translatedRoleOptions = computed(() => {
  return roles.map((role) => {
    return { ...role, displayName: $gettext(role.displayName) }
  })
})

const selectedRoleValue = computed(() => {
  const assignedRole = unref(editUser)?.appRoleAssignments?.[0]
  return unref(translatedRoleOptions).find((role) => role.id === assignedRole?.appRoleId)
})

const invalidFormData = computed(() => {
  return Object.values(unref(formData)).some((v) => !v.valid)
})

const showQuota = computed(() => {
  return unref(editUser).drive?.quota
})

const isQuotaInputDisabled = computed(() => {
  return typeof unref(showQuota) === 'undefined'
})

function changeSelectedQuotaOption(option: { value: number; displayValue: string }) {
  editUser.value.drive.quota.total = option.value
}

function changeSelectedGroupOption(option: Group[]) {
  editUser.value.memberOf = option
}

async function validateUserName() {
  formData.value.userName.valid = false

  const error = getUserNameError(unref(editUser).onPremisesSamAccountName)
  if (error) {
    formData.value.userName.errorMessage = error
    return false
  }

  const userName = unref(editUser).onPremisesSamAccountName
  if (user.onPremisesSamAccountName !== userName) {
    // the user name is taken if fetching a user with it succeeds
    const exists = await clientService.graphAuthenticated.users.getUser(userName).then(
      () => true,
      () => false
    )
    // the name changed while the request was running, the validation of the new name decides
    if (unref(editUser).onPremisesSamAccountName !== userName) {
      return false
    }
    if (exists) {
      formData.value.userName.errorMessage = $gettext('User "%{userName}" already exists', {
        userName
      })
      return false
    }
  }

  formData.value.userName.errorMessage = ''
  formData.value.userName.valid = true
  return true
}

function validateDisplayName() {
  formData.value.displayName.valid = false

  if (unref(editUser).displayName.trim() === '') {
    formData.value.displayName.errorMessage = $gettext('First and last name cannot be empty')
    return false
  }

  if (unref(editUser).displayName.length > 255) {
    formData.value.displayName.errorMessage = $gettext(
      'First and last name cannot exceed 255 characters'
    )
    return false
  }

  formData.value.displayName.errorMessage = ''
  formData.value.displayName.valid = true
  return true
}

function validateEmail() {
  formData.value.email.valid = false

  if (!EmailValidator.validate(unref(editUser).mail)) {
    formData.value.email.errorMessage = $gettext('Please enter a valid email')
    return false
  }

  formData.value.email.errorMessage = ''
  formData.value.email.valid = true
  return true
}

function revertChanges() {
  editUser.value = cloneDeep(unref(user))
  Object.values(unref(formData)).forEach((formDataValue) => {
    formDataValue.valid = true
    formDataValue.errorMessage = ''
  })
}

function onUpdateRole(role: AppRoleAssignment) {
  if (!unref(editUser).appRoleAssignments.length) {
    // FIXME: Add resourceId and principalId to be able to remove type cast
    unref(editUser).appRoleAssignments.push({
      appRoleId: role.id
    } as AppRoleAssignment)
    return
  }
  unref(editUser).appRoleAssignments[0].appRoleId = role.id
}

function onUpdatePassword(password: string) {
  unref(editUser).passwordProfile = {
    password
  }
}

function onUpdateLogin(value: boolean) {
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

watch(
  () => user?.id,
  () => {
    saved.value = false
  }
)
</script>
