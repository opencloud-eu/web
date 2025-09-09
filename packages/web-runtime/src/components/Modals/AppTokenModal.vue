<template>
  <div v-if="!createdToken">
    <oc-text-input
      v-model="tokenLabel"
      :label="$gettext('Note')"
      :error-message="tokenLabelErrorMessage"
      required-mark
    />
    <oc-datepicker
      :label="$gettext('Expiration date')"
      class="mt-2"
      type="date"
      :min-date="minDate"
      @date-changed="onDateChanged"
    />
    <div class="link-modal-actions flex justify-end items-center mt-2">
      <oc-button
        class="oc-modal-body-actions-cancel ml-2"
        appearance="outline"
        @click="$emit('cancel')"
      >
        {{ $gettext('Cancel') }}
      </oc-button>
      <oc-button
        :disabled="isConfirmDisabled"
        class="oc-modal-body-actions-confirm ml-2"
        appearance="filled"
        @click="createAppToken"
      >
        {{ $gettext('Confirm') }}
      </oc-button>
    </div>
  </div>
  <div v-else>
    <span
      v-text="
        $gettext(
          'Your app token has been successfully created. This is the only time it will be displayed, so please make sure to copy it now.'
        )
      "
    />
    <div class="mt-4 mb-2 flex items-center rounded-sm">
      <div class="w-full">
        <div
          class="created-token flex items-center justify-between rounded-sm p-2 font-bold bg-role-surface-container-high"
        >
          {{ createdToken }}
          <oc-button
            v-oc-tooltip="$gettext('Copy app token to clipboard')"
            appearance="raw"
            class="copy-app-token-btn ml-2 p-1"
            :aria-label="$gettext('Copy app token to clipboard')"
            @click="copy(createdToken)"
          >
            <oc-icon :name="copied ? 'check' : 'file-copy'" fill-type="line" />
          </oc-button>
        </div>
        <div class="text-sm text-right mt-2">
          <span v-text="$gettext('Expires on:')" />
          <span v-text="formatDateFromDateTime(expiryDate, currentLanguage)" />
        </div>
      </div>
    </div>
    <div class="link-modal-actions flex justify-end items-center mt-6">
      <oc-button
        class="oc-modal-body-actions-confirm ml-2"
        appearance="filled"
        @click="$emit('confirm')"
      >
        {{ $gettext('Close') }}
      </oc-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, unref, watch } from 'vue'
import { DateTime } from 'luxon'
import { formatDateFromDateTime, Modal, useClientService } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import { useClipboard } from '@vueuse/core'
import { AppToken } from '../../helpers/appTokens'

defineProps<{ modal: Modal }>()
defineEmits(['confirm', 'cancel'])

const { $gettext, current: currentLanguage } = useGettext()
const { httpAuthenticated: client } = useClientService()
const { copy, copied } = useClipboard({ legacy: true, copiedDuring: 1500 })

const tokenLabel = ref<string>('')
const tokenLabelErrorMessage = ref<string>('')
watch(tokenLabel, (newValue) => {
  tokenLabelErrorMessage.value = newValue.length ? '' : $gettext('The note is required')
})

const expiryDate = ref<DateTime>()
const minDate = computed(() => DateTime.now())
const onDateChanged = ({ date, error }: { date: DateTime; error: boolean }) => {
  expiryDate.value = error ? undefined : date
}

const isConfirmDisabled = computed<boolean>(() => {
  return !unref(tokenLabel) || !unref(expiryDate)
})
const createdToken = ref('')
const createAppToken = async () => {
  if (unref(isConfirmDisabled)) {
    return
  }
  try {
    const label = unref(tokenLabel)
    const expiry = `${unref(expiryDate).diff(DateTime.now(), 'hours').hours}h`
    const { data } = await client.post<AppToken>('/auth-app/tokens', null, {
      params: { label, expiry }
    })
    createdToken.value = data.token
  } catch (error) {
    console.error(error)
  }
}
</script>
