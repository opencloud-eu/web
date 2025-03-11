<template>
  <div v-if="!createdToken">
    <oc-datepicker
      :label="$gettext('Expiration date')"
      type="date"
      :min-date="minDate"
      @date-changed="onDateChanged"
    />
    <div class="link-modal-actions oc-flex oc-flex-right oc-flex-middle oc-mt-s">
      <oc-button
        class="oc-modal-body-actions-cancel oc-ml-s"
        appearance="outline"
        @click="$emit('cancel')"
      >
        {{ $gettext('Cancel') }}
      </oc-button>
      <oc-button
        :disabled="confirmDisabled"
        class="oc-modal-body-actions-confirm oc-ml-s"
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
    <div class="oc-mt-m oc-mb-s oc-flex oc-flex-middle oc-rounded">
      <div class="created-token-container oc-pr-m">
        <span class="created-token" v-text="createdToken" />
        <div class="oc-text-small">
          <span v-text="$gettext('Expires on:')" />
          <span v-text="formatDateFromDateTime(expiryDate, currentLanguage)" />
        </div>
      </div>
      <oc-button
        v-oc-tooltip="$gettext('Copy app token to clipboard')"
        appearance="raw"
        class="copy-app-token-btn oc-ml-s oc-p-xs"
        :aria-label="$gettext('Copy app token to clipboard')"
        @click="copy(createdToken)"
      >
        <oc-icon :name="copied ? 'check' : 'file-copy'" fill-type="line" />
      </oc-button>
    </div>
    <div class="link-modal-actions oc-flex oc-flex-right oc-flex-middle oc-mt-s">
      <oc-button
        class="oc-modal-body-actions-confirm oc-ml-s"
        appearance="filled"
        @click="$emit('confirm')"
      >
        {{ $gettext('Close') }}
      </oc-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, unref } from 'vue'
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

const expiryDate = ref<DateTime>()
const confirmDisabled = ref(true)
const createdToken = ref('')

const minDate = computed(() => DateTime.now())

const onDateChanged = ({ date, error }: { date: DateTime; error: boolean }) => {
  confirmDisabled.value = error || !date
  expiryDate.value = date
}

const createAppToken = async () => {
  try {
    const expiry = `${unref(expiryDate).diff(DateTime.now(), 'hours').hours}h`
    const { data } = await client.post<AppToken>('/auth-app/tokens', null, { params: { expiry } })
    createdToken.value = data.token
  } catch (error) {
    console.error(error)
  }
}
</script>

<style lang="scss" scoped>
.created-token {
  font-weight: bold;
  &-container {
    border-right: 0.5px solid var(--oc-role-outline-variant);
  }
}
</style>
