<template>
  <div>
    <oc-select
      :model-value="selectedOption"
      :label="$gettext('Login')"
      :options="options"
      :placeholder="$gettext('Select...')"
      :description-message="
        currentUserSelected ? $gettext('Your own login status will remain unchanged.') : ''
      "
      :position-fixed="true"
      required-mark
      @update:model-value="changeSelectedOption"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, unref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import { User } from '@opencloud-eu/web-client/graph/generated'
import {
  useClientService,
  useUserStore,
  Modal,
  useMessages,
  isPromiseFulfilled,
  isPromiseRejected
} from '@opencloud-eu/web-pkg'
import { useUserSettingsStore } from '../../composables/stores/userSettings'

type LoginOption = {
  label: string
  value: boolean
}

const { users } = defineProps<{
  modal: Modal
  users: User[]
}>()

const emit = defineEmits<{
  (e: 'update:confirmDisabled', value: boolean): void
}>()

const { showMessage, showErrorMessage } = useMessages()
const clientService = useClientService()
const { $gettext, $ngettext } = useGettext()
const userStore = useUserStore()
const userSettingsStore = useUserSettingsStore()

const selectedOption = ref<LoginOption>()
const options = [
  { label: $gettext('Allowed'), value: true },
  { label: $gettext('Forbidden'), value: false }
]

const currentUserSelected = computed(() => users.some((u) => u.id === userStore.user.id))

watch(
  selectedOption,
  () => {
    emit('update:confirmDisabled', !unref(selectedOption))
  },
  { immediate: true }
)

function changeSelectedOption(option: LoginOption) {
  selectedOption.value = option
}

onMounted(() => {
  if (users.every((u) => u.accountEnabled !== false)) {
    selectedOption.value = options.find(({ value }) => value)
  } else if (users.every((u) => u.accountEnabled === false)) {
    selectedOption.value = options.find(({ value }) => !value)
  }
})

async function onConfirm() {
  const affectedUsers = users.filter(({ id }) => userStore.user.id !== id)
  const client = clientService.graphAuthenticated
  const promises = affectedUsers.map(({ id }) =>
    client.users.editUser(id, { accountEnabled: unref(selectedOption).value } as User)
  )
  const results = await Promise.allSettled(promises)

  const succeeded = results.filter(isPromiseFulfilled)
  if (succeeded.length) {
    const title =
      succeeded.length === 1 && affectedUsers.length === 1
        ? $gettext('Login for user "%{user}" was edited successfully', {
            user: affectedUsers[0].displayName
          })
        : $ngettext(
            '%{userCount} user login was edited successfully',
            '%{userCount} users logins edited successfully',
            succeeded.length,
            { userCount: succeeded.length.toString() }
          )
    showMessage({ title })
  }

  const failed = results.filter(isPromiseRejected)
  if (failed.length) {
    failed.forEach(console.error)

    const title =
      failed.length === 1 && affectedUsers.length === 1
        ? $gettext('Failed edit login for user "%{user}"', {
            user: affectedUsers[0].displayName
          })
        : $ngettext(
            'Failed to edit %{userCount} user login',
            'Failed to edit %{userCount} user logins',
            failed.length,
            { userCount: failed.length.toString() }
          )
    showErrorMessage({
      title,
      errors: (failed as PromiseRejectedResult[]).map((f) => f.reason)
    })
  }

  try {
    const usersResponse = await Promise.all(
      succeeded.map(({ value }) => {
        return client.users.getUser(value.id)
      })
    )

    usersResponse.forEach((user) => {
      userSettingsStore.upsertUser(user)
    })
  } catch (e) {
    console.error(e)
  }
}

defineExpose({ onConfirm })
</script>
