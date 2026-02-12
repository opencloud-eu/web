<template>
  <div
    v-if="isOpen && !isExpanded"
    class="z-50 transition absolute inset-0 md:fixed md:inset-0 pointer-events-auto md:pointer-events-none bg-transparent"
  >
    <div
      class="oc-mail-compose-widget pointer-events-auto absolute bg-role-surface border-0 md:border md:border-role-outline-variant flex flex-col md:rounded-xl top-0 left-0 right-0 bottom-0 md:top-auto md:bottom-2 md:left-auto md:right-8 md:w-[720px] md:h-[800px]"
    >
      <div class="flex items-center justify-between px-4 py-2">
        <h2
          class="oc-mail-compose-widget-headline text-lg font-bold"
          v-text="$gettext('New message')"
        />
        <div class="flex items-center gap-1">
          <oc-button
            class="hidden md:inline-flex"
            appearance="raw"
            :aria-label="
              isExpanded ? $gettext('Collapse compose window') : $gettext('Expand compose window')
            "
            @click="toggleCollapseExpand"
          >
            <oc-icon
              :name="isExpanded ? 'collapse-diagonal' : 'expand-diagonal'"
              fill-type="line"
            />
          </oc-button>
          <oc-button appearance="raw" :aria-label="$gettext('Close')" @click="requestClose">
            <oc-icon name="close" fill-type="line" />
          </oc-button>
        </div>
      </div>

      <div class="flex flex-col flex-1 min-h-0">
        <div class="flex-1 min-h-0 overflow-auto">
          <MailComposeForm
            v-model="composeState"
            :show-formatting-toolbar="showFormattingToolbar"
          />
        </div>

        <div class="px-4 pt-3 pb-2">
          <div class="flex items-center justify-start gap-3">
            <oc-button appearance="filled" class="min-w-[120px]">
              <span v-text="$gettext('Send')" />
            </oc-button>
            <MailComposeAttachmentButton
              v-model="composeState.attachments"
              :account-id="composeState.from?.accountId ?? accountId"
            />
            <oc-button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-full border border-role-outline-variant bg-role-surface hover:bg-role-surface-variant transition"
              :aria-pressed="showFormattingToolbar ? 'true' : 'false'"
              :title="$gettext('Toggle text formatting toolbar')"
              @click="showFormattingToolbar = !showFormattingToolbar"
            >
              <oc-icon name="text" fill-type="none" class="text-base text-role-on-surface" />
            </oc-button>
            <div class="ml-auto flex items-center min-w-0">
              <div
                v-if="showSavedHint"
                class="flex items-center gap-1 text-role-on-surface-variant"
              >
                <oc-icon name="check" fill-type="line" />
                <span class="text-sm" v-text="$gettext('Saved')" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <oc-modal
    v-if="isOpen && isExpanded"
    :title="$gettext('New message')"
    :hide-actions="true"
    element-class="mail-compose-modal"
  >
    <template #headerActions>
      <oc-button
        class="hidden md:inline-flex"
        appearance="raw"
        :aria-label="$gettext('Collapse compose window')"
        @click="toggleCollapseExpand"
      >
        <oc-icon name="collapse-diagonal" fill-type="line" />
      </oc-button>
      <oc-button appearance="raw" :aria-label="$gettext('Close')" @click="requestClose">
        <oc-icon name="close" fill-type="line" />
      </oc-button>
    </template>

    <template #content>
      <div class="flex flex-col flex-1 min-h-0">
        <div class="flex-1 min-h-0 overflow-auto">
          <MailComposeForm
            v-model="composeState"
            :show-formatting-toolbar="showFormattingToolbar"
          />
        </div>

        <div class="px-4 pt-3">
          <div class="flex items-center justify-start gap-3">
            <oc-button appearance="filled" class="min-w-[120px]">
              <span v-text="$gettext('Send')" />
            </oc-button>
            <MailComposeAttachmentButton
              v-model="composeState.attachments"
              :account-id="composeState.from?.accountId ?? accountId"
            />
            <oc-button
              type="button"
              appearance="raw"
              class="flex !h-9 !w-9 items-center justify-center rounded-full border border-role-outline-variant bg-role-surface hover:bg-role-surface-variant transition"
              :class="{ 'bg-role-surface-variant': showFormattingToolbar }"
              :aria-pressed="showFormattingToolbar ? 'true' : 'false'"
              :title="$gettext('Toggle text formatting toolbar')"
              @click="showFormattingToolbar = !showFormattingToolbar"
            >
              <oc-icon name="text" fill-type="none" class="text-base text-role-on-surface" />
            </oc-button>
            <div class="ml-auto flex items-center min-w-0">
              <div
                v-if="showSavedHint"
                class="flex items-center gap-1 text-role-on-surface-variant"
              >
                <oc-icon name="check" fill-type="line" />
                <span class="text-sm" v-text="$gettext('Saved')" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </oc-modal>
  <oc-modal v-if="leaveModalOpen" :title="$gettext('Leave this screen?')" :hide-actions="true">
    <template #content>
      <p
        class="oc-mb-m"
        v-text="
          $gettext(
            'Your email isn’t finished yet. You can save it as a draft or exit without saving.'
          )
        "
      />
      <div class="oc-modal-body-actions flex justify-end p-4 text-right -mr-4 -mb-4 -ml-4">
        <div class="oc-modal-body-actions-grid grid grid-flow-col auto-cols-1fr gap-2">
          <oc-button
            class="oc-modal-body-actions-confirm"
            appearance="filled"
            :disabled="isSaving || !canSaveDraft"
            @click="onSaveDraftAndClose"
          >
            {{ $gettext('Save as draft') }}
          </oc-button>
          <oc-button
            class="oc-modal-body-actions-secondary"
            appearance="outline"
            :disabled="isSaving"
            @click="onDiscardAndClose"
          >
            {{ $gettext('Discard') }}
          </oc-button>
          <oc-button
            class="oc-modal-body-actions-cancel"
            appearance="outline"
            :disabled="isSaving"
            @click="leaveModalOpen = false"
          >
            {{ $gettext('Cancel') }}
          </oc-button>
        </div>
      </div>
    </template>
  </oc-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'
import { useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import MailComposeForm, { type ComposeFormState } from './MailComposeForm.vue'
import MailComposeAttachmentButton from './MailComposeAttachmentButton.vue'
import { useSaveAsDraft } from '../composables/useSaveAsDraft'
import { createMailDraftConnector } from '../helpers/mailDraftConnector'
import { useAccountsStore } from '../composables/piniaStores/accounts'
import { useMailboxesStore } from '../composables/piniaStores/mailboxes'
import { useSavedHint } from '../composables/useSavedHint'
import { useAutoSaveDraft } from '../composables/useAutoSaveDraft'
import { useComposeDirtyTracking } from '../composables/useComposeDirtyTracking'
import { plainTextForChangeCheck, plainTextForSave } from '../helpers/mailComposeText'

const { $gettext } = useGettext()

const SAVED_HINT_DURATION_MS = 2000
const AUTO_SAVE_INTERVAL_MS = 120000 // 2(min) * 60 * 1000

const props = defineProps<{ modelValue?: boolean }>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
}>()

const clientService = useClientService()
const configStore = useConfigStore()

const accountsStore = useAccountsStore()
const mailboxesStore = useMailboxesStore()

const { currentAccount } = storeToRefs(accountsStore)
const { draftsMailboxId } = storeToRefs(mailboxesStore)

const isExpanded = ref(false)
const leaveModalOpen = ref(false)
const showFormattingToolbar = ref(false)

const { showSavedHint, flashSavedHint, clearSavedHint } = useSavedHint(SAVED_HINT_DURATION_MS)

const accountId = computed(() => unref(currentAccount)?.accountId ?? '')
const draftMailboxId = computed(() => unref(draftsMailboxId) ?? '')

const canSaveDraft = computed(() => {
  return !!accountId.value && !!draftMailboxId.value
})

const createEmptyComposeState = (): ComposeFormState => ({
  from: undefined,
  to: '',
  cc: '',
  bcc: '',
  subject: '',
  body: '',
  attachments: []
})

const composeState = ref<ComposeFormState>(createEmptyComposeState())

const isOpen = computed({
  get: () => props.modelValue ?? true,
  set: (value: boolean) => {
    emit('update:modelValue', value)
    if (!value) {
      emit('close')
    }
  }
})

const toggleCollapseExpand = () => {
  isExpanded.value = !isExpanded.value
}

const connector = createMailDraftConnector(
  clientService.httpAuthenticated as any,
  configStore.groupwareUrl
)

const parseRecipients = (value: string) => {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((email) => ({ email }))
}

const hasMeaningfulChanges = computed(() => {
  const to = (composeState.value.to ?? '').trim()
  const cc = (composeState.value.cc ?? '').trim()
  const bcc = (composeState.value.bcc ?? '').trim()
  const subject = (composeState.value.subject ?? '').trim()
  const bodyText = plainTextForChangeCheck(composeState.value.body ?? '')
  const attachments = composeState.value.attachments ?? []
  return !!to || !!cc || !!bcc || !!subject || !!bodyText || attachments.length > 0
})

const { isDirty, isSaving, markDirty, resetDraft, saveAsDraft, discardDraft } = useSaveAsDraft({
  accountId,
  draftMailboxId,
  api: connector,
  getDraftPayload: () => {
    const bodyHtml = composeState.value.body ?? ''
    const bodyPlain = plainTextForSave(bodyHtml)

    const hasText = bodyPlain.length > 0
    const hasHtml = bodyHtml.trim().length > 0 && bodyPlain.length > 0

    return {
      from: composeState.value.from
        ? [{ email: composeState.value.from.email, name: composeState.value.from.name }]
        : [],

      to: parseRecipients(composeState.value.to),
      cc: parseRecipients(composeState.value.cc),
      bcc: parseRecipients(composeState.value.bcc),
      subject: composeState.value.subject ?? '',

      textBody: hasText ? [{ partId: 't', type: 'text/plain' }] : [],
      htmlBody: hasHtml ? [{ partId: 'h', type: 'text/html' }] : [],

      bodyValues: {
        ...(hasText ? { t: { value: bodyPlain } } : {}),
        ...(hasHtml ? { h: { value: bodyHtml } } : {})
      },

      attachments: (composeState.value.attachments ?? []).map((a: any) => ({
        blobId: a.blobId,
        name: a.name,
        type: a.type,
        disposition: a.disposition ?? 'attachment'
      }))
    }
  }
})

const { runWithResetGuard } = useComposeDirtyTracking(composeState, () => {
  markDirty()
})

const resetCompose = async () => {
  await runWithResetGuard(() => {
    composeState.value = createEmptyComposeState()
    showFormattingToolbar.value = false
    leaveModalOpen.value = false
    clearSavedHint()
    resetDraft(null)
  })
}

const doClose = () => {
  isExpanded.value = false
  isOpen.value = false
}

const requestClose = () => {
  if (!hasMeaningfulChanges.value) {
    doClose()
    return
  }

  if (!isDirty.value) {
    doClose()
    return
  }

  leaveModalOpen.value = true
}

const onSaveDraftAndClose = async () => {
  if (!canSaveDraft.value) {
    return
  }
  await saveAsDraft()
  doClose()
}

const onDiscardAndClose = async () => {
  await discardDraft()
  doClose()
}

const canAutoSaveNow = computed(() => {
  return (
    isOpen.value &&
    !leaveModalOpen.value &&
    canSaveDraft.value &&
    hasMeaningfulChanges.value &&
    isDirty.value &&
    !isSaving.value
  )
})

useAutoSaveDraft({
  isOpen,
  canAutoSaveNow,
  intervalMs: AUTO_SAVE_INTERVAL_MS,
  save: saveAsDraft,
  onSaved: () => {
    flashSavedHint()
  },
  onError: (error) => {
    console.error('Failed to auto-save draft:', error)
  }
})

watch(
  () => isOpen.value,
  async (open) => {
    if (!open) {
      await resetCompose()
    }
  }
)
</script>

<style>
.mail-compose-modal {
  width: 90vw;
  max-width: 90vw;
  height: 90vh;
  display: flex;
  flex-direction: column;
}

.mail-compose-modal .oc-modal-body,
.mail-compose-modal .oc-modal-body-message {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
