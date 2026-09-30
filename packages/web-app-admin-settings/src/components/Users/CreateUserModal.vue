<template>
  <form autocomplete="off" @submit.prevent="emit('confirm')">
    <oc-text-input
      id="create-user-input-user-name"
      v-model="user.onPremisesSamAccountName"
      class="mb-2"
      :label="$gettext('User name')"
      :error-message="formData.userName.errorMessage"
      :fix-message-line="true"
      required-mark
      @update:model-value="validateUserName"
    />
    <oc-text-input
      id="create-user-input-display-name"
      v-model="user.displayName"
      class="mb-2"
      :label="$gettext('First and last name')"
      :error-message="formData.displayName.errorMessage"
      :fix-message-line="true"
      required-mark
      @update:model-value="validateDisplayName"
    />
    <oc-text-input
      id="create-user-input-email"
      v-model="user.mail"
      class="mb-2"
      :label="$gettext('Email')"
      :error-message="formData.email.errorMessage"
      :error-message-debounced-time="1000"
      type="email"
      :fix-message-line="true"
      required-mark
      @update:model-value="validateEmail"
    />
    <oc-text-input
      id="create-user-input-password"
      v-model="user.passwordProfile.password"
      autocomplete="new-password"
      class="mb-2"
      :label="$gettext('Password')"
      :error-message="formData.password.errorMessage"
      type="password"
      :fix-message-line="true"
      required-mark
      @update:model-value="validatePassword"
    />
    <input type="submit" class="hidden" />
  </form>
</template>

<script setup lang="ts">
import { useGettext } from 'vue3-gettext'
import { computed, ref, unref, watch } from 'vue'
import * as EmailValidator from 'email-validator'
import { Modal, useClientService, useMessages } from '@opencloud-eu/web-pkg'
import { useUserSettingsStore } from '../../composables/stores/userSettings'
import { useUserNameValidation } from '../../composables/users'

type FormField = 'userName' | 'displayName' | 'email' | 'password'

defineProps<{ modal: Modal }>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'update:confirmDisabled', value: boolean): void
}>()

const { showMessage, showErrorMessage } = useMessages()
const clientService = useClientService()
const { $gettext } = useGettext()
const userSettingsStore = useUserSettingsStore()
const { getUserNameError } = useUserNameValidation()

const formData = ref<Record<FormField, { errorMessage: string; valid: boolean }>>({
  userName: { errorMessage: '', valid: false },
  displayName: { errorMessage: '', valid: false },
  email: { errorMessage: '', valid: false },
  password: { errorMessage: '', valid: false }
})

const user = ref({
  onPremisesSamAccountName: '',
  displayName: '',
  mail: '',
  passwordProfile: {
    password: ''
  }
})

const isFormInvalid = computed(() => Object.values(unref(formData)).some((v) => !v.valid))

watch(
  isFormInvalid,
  () => {
    emit('update:confirmDisabled', unref(isFormInvalid))
  },
  { immediate: true }
)

function setFieldError(field: FormField, errorMessage: string) {
  formData.value[field].errorMessage = errorMessage
  formData.value[field].valid = false
  return false
}

function setFieldValid(field: FormField) {
  formData.value[field].errorMessage = ''
  formData.value[field].valid = true
  return true
}

async function validateUserName() {
  const userName = unref(user).onPremisesSamAccountName

  const error = getUserNameError(userName)
  if (error) {
    return setFieldError('userName', error)
  }

  try {
    // the user name is taken if fetching a user with it succeeds
    await clientService.graphAuthenticated.users.getUser(userName)
    return setFieldError('userName', $gettext('User "%{userName}" already exists', { userName }))
  } catch {}

  return setFieldValid('userName')
}

function validateDisplayName() {
  const { displayName } = unref(user)

  if (displayName.trim() === '') {
    return setFieldError('displayName', $gettext('First and last name cannot be empty'))
  }

  if (displayName.length > 255) {
    return setFieldError(
      'displayName',
      $gettext('First and last name cannot exceed 255 characters')
    )
  }

  return setFieldValid('displayName')
}

function validateEmail() {
  if (!EmailValidator.validate(unref(user).mail)) {
    return setFieldError('email', $gettext('Please enter a valid email'))
  }

  return setFieldValid('email')
}

function validatePassword() {
  if (unref(user).passwordProfile.password.trim() === '') {
    return setFieldError('password', $gettext('Password cannot be empty'))
  }

  return setFieldValid('password')
}

async function onConfirm() {
  if (unref(isFormInvalid)) {
    return Promise.reject()
  }

  try {
    const client = clientService.graphAuthenticated
    const { id: createdUserId } = await client.users.createUser(unref(user))
    const createdUser = await client.users.getUser(createdUserId)
    showMessage({ title: $gettext('User was created successfully') })
    userSettingsStore.upsertUser(createdUser)
  } catch (error) {
    console.error(error)
    showErrorMessage({
      title: $gettext('Failed to create user'),
      errors: [error]
    })
  }
}

defineExpose({ onConfirm })
</script>
