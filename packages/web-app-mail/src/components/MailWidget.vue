<template>
  <div
    v-if="!isExpanded"
    class="z-[var(--z-index-modal)] transition absolute inset-0 md:fixed md:inset-0 pointer-events-auto md:pointer-events-none bg-transparent"
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
          <MailComposeForm v-model="composeState" />
        </div>

        <div class="px-4 pt-3 pb-2">
          <div class="flex items-center justify-start gap-3">
            <oc-button
              appearance="filled"
              class="min-w-[120px]"
              :disabled="isSaving"
              @click="onSend"
            >
              <span v-text="$gettext('Send')" />
            </oc-button>
            <MailComposeAttachmentButton
              v-model="composeState.attachments"
              :account-id="currentAccountId"
            />
            <div class="ml-auto flex items-center min-w-0">
              <MailSavedHint v-if="showSavedHint" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <oc-modal
    v-if="isExpanded"
    :title="$gettext('New message')"
    :hide-actions="true"
    hide-cancel-button
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
          <MailComposeForm v-model="composeState" />
        </div>

        <div class="px-4 pt-3">
          <div class="flex items-center justify-start gap-3">
            <oc-button
              appearance="filled"
              class="min-w-[120px]"
              :disabled="isSaving"
              @click="onSend"
            >
              <span v-text="$gettext('Send')" />
            </oc-button>
            <MailComposeAttachmentButton
              v-model="composeState.attachments"
              :account-id="currentAccountId"
            />
            <div class="ml-auto flex items-center min-w-0">
              <MailSavedHint v-if="showSavedHint" />
            </div>
          </div>
        </div>
      </div>
    </template>
  </oc-modal>
</template>

<script setup lang="ts">
import { ref, computed, unref, watch, onUnmounted } from 'vue'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'
import { useGroupwareAccountsStore, useModals } from '@opencloud-eu/web-pkg'
import MailComposeForm, { type ComposeFormState } from './MailComposeForm.vue'
import MailComposeAttachmentButton from './MailComposeAttachmentButton.vue'
import MailSavedHint from './MailSavedHint.vue'
import { useSaveAsDraft } from '../composables/useSaveAsDraft'
import { useMailDraftConnector } from '../composables/useMailDraftConnector'
import { useMailboxesStore } from '../composables/piniaStores/mailboxes'
import { useSavedHint } from '../composables/useSavedHint'
import { useAutoSaveDraft } from '../composables/useAutoSaveDraft'
import { useComposeDirtyTracking } from '../composables/useComposeDirtyTracking'
import { plainTextFromHtml } from '../helpers/mailComposeText'
import isEmpty from 'lodash-es/isEmpty'
import type { Mail, Mailbox, MailAddress } from '../types'

type ComposeAttachment = ComposeFormState['attachments'][number]

const { $gettext } = useGettext()
const { dispatchModal } = useModals()
const appliedDraftId = ref<string | null>(null)

const SAVED_HINT_DURATION_MS = 2000
const AUTO_SAVE_INTERVAL_MS = 120000 // 2(min) * 60 * 1000

const props = defineProps<{
  draftMail?: Mail | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const accountsStore = useGroupwareAccountsStore()
const mailboxesStore = useMailboxesStore()
const connector = useMailDraftConnector()

const { currentAccount } = storeToRefs(accountsStore)
const { mailboxes } = storeToRefs(mailboxesStore)

const currentAccountId = computed(() => unref(currentAccount).accountId || '')

const draftsMailboxId = computed(() => {
  return (unref(mailboxes) || []).find((mailbox: Mailbox) => mailbox.role === 'drafts')?.id
})

const sentMailboxId = computed(() => {
  return (unref(mailboxes) || []).find((mailbox: Mailbox) => mailbox.role === 'sent')?.id
})

const selectedIdentityId = computed(() => {
  return unref(currentAccount)?.identities?.[0]?.id || ''
})

const isExpanded = ref(false)

const { showSavedHint, flashSavedHint, clearSavedHint } = useSavedHint(SAVED_HINT_DURATION_MS)

const canSaveDraft = computed(() => {
  return !!unref(currentAccountId) && !!unref(draftsMailboxId)
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

const recipientsToInput = (recipients: MailAddress[] = []) => {
  return recipients.map((recipient) => recipient.email).join(', ')
}

const getDraftBody = (mail: Mail) => {
  const htmlPartId = mail.htmlBody?.[0]?.partId
  if (htmlPartId) {
    return mail.bodyValues?.[htmlPartId]?.value ?? ''
  }

  const textPartId = mail.textBody?.[0]?.partId
  if (textPartId) {
    return mail.bodyValues?.[textPartId]?.value ?? ''
  }

  return ''
}

const getDraftAttachments = (mail: Mail) => {
  return (mail.attachments ?? [])
    .filter((attachment) => attachment.blobId)
    .map((attachment) => ({
      id: attachment.blobId,
      blobId: attachment.blobId,
      name: attachment.name,
      type: attachment.type,
      disposition: 'attachment' as const,
      size: attachment.size ?? 0
    }))
}

const createComposeStateFromDraft = (mail: Mail): ComposeFormState => {
  return {
    from: undefined,
    to: recipientsToInput(mail.to),
    cc: recipientsToInput(mail.cc),
    bcc: recipientsToInput(mail.bcc),
    subject: mail.subject ?? '',
    body: getDraftBody(mail),
    attachments: getDraftAttachments(mail)
  }
}

const toggleCollapseExpand = () => {
  isExpanded.value = !isExpanded.value
}

const parseRecipients = (value: string): MailAddress[] => {
  return (value || '')
    .split(',')
    .map((recipient) => recipient.trim())
    .filter(Boolean)
    .map((email) => ({ email }))
}

const hasMeaningfulChanges = computed(() => {
  const state = unref(composeState)

  return (
    !isEmpty(state.to?.trim()) ||
    !isEmpty(state.cc?.trim()) ||
    !isEmpty(state.bcc?.trim()) ||
    !isEmpty(state.subject?.trim()) ||
    !isEmpty(plainTextFromHtml(state.body ?? '').trim()) ||
    (state.attachments?.length ?? 0) > 0
  )
})

const { draftId, isDirty, isSaving, markDirty, resetDraft, saveAsDraft, discardDraft } =
  useSaveAsDraft({
    accountId: currentAccountId,
    draftMailboxId: draftsMailboxId,
    api: connector,
    getDraftPayload: () => {
      const state = unref(composeState)

      const bodyHtml = state.body ?? ''
      const bodyPlain = plainTextFromHtml(bodyHtml)

      const hasText = bodyPlain.length > 0
      const hasHtml = bodyHtml.trim().length > 0 && bodyPlain.length > 0

      return {
        from: state.from ? [{ email: state.from.email, name: state.from.name }] : [],
        to: parseRecipients(state.to),
        cc: parseRecipients(state.cc),
        bcc: parseRecipients(state.bcc),
        subject: state.subject ?? '',

        textBody: hasText ? [{ partId: 't', type: 'text/plain' }] : [],
        htmlBody: hasHtml ? [{ partId: 'h', type: 'text/html' }] : [],

        bodyValues: {
          ...(hasText ? { t: { value: bodyPlain } } : {}),
          ...(hasHtml ? { h: { value: bodyHtml } } : {})
        },

        attachments: (state.attachments || []).map((attachment: ComposeAttachment) => ({
          blobId: attachment.blobId,
          name: attachment.name,
          type: attachment.type,
          disposition: 'attachment' as const
        }))
      }
    }
  })

const onSend = async () => {
  if (
    !unref(currentAccountId) ||
    !unref(draftsMailboxId) ||
    !unref(sentMailboxId) ||
    !unref(selectedIdentityId)
  ) {
    return
  }

  const emailId = unref(draftId) || (await saveAsDraft())?.id
  if (!emailId) {
    return
  }

  await connector.sendDraft(
    unref(currentAccountId),
    emailId,
    unref(selectedIdentityId),
    unref(draftsMailboxId),
    unref(sentMailboxId)
  )

  await resetCompose()
  doClose()
}

const { runWithResetGuard } = useComposeDirtyTracking(composeState, () => {
  markDirty()
})

const resetCompose = async () => {
  await runWithResetGuard(() => {
    composeState.value = createEmptyComposeState()
    clearSavedHint()
    resetDraft(null)
  })
}

const applyDraftMail = async (mail: Mail) => {
  await runWithResetGuard(() => {
    composeState.value = createComposeStateFromDraft(mail)
    clearSavedHint()
    resetDraft(mail.id)
    appliedDraftId.value = mail.id
  })
}

const doClose = () => {
  isExpanded.value = false
  emit('close')
}

const requestClose = () => {
  if (!unref(hasMeaningfulChanges)) {
    doClose()
    return
  }

  if (!unref(isDirty)) {
    doClose()
    return
  }

  dispatchModal({
    title: $gettext('Leave this screen?'),
    message: $gettext(
      'Your email isn’t finished yet. You can save it as a draft or exit without saving.'
    ),
    confirmText: $gettext('Save as draft'),
    hasInput: false,
    onConfirm: () => onSaveDraftAndClose(),
    onCancel: () => onDiscardAndClose()
  })
}

const onSaveDraftAndClose = async () => {
  if (!unref(canSaveDraft)) {
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
  return unref(canSaveDraft) && unref(hasMeaningfulChanges) && unref(isDirty) && !unref(isSaving)
})

useAutoSaveDraft({
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

onUnmounted(() => {
  resetCompose()
})

watch(
  () => props.draftMail?.id,
  async (draftId) => {
    if (!draftId || !props.draftMail) {
      return
    }

    if (draftId === appliedDraftId.value) {
      return
    }

    if (unref(isDirty) || unref(hasMeaningfulChanges)) {
      return
    }

    await applyDraftMail(props.draftMail)
    appliedDraftId.value = props.draftMail.id
  },
  { immediate: true }
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
