<template>
  <div class="px-4 flex flex-col min-h-full">
    <div class="py-2 mb-2 border-b border-role-outline-variant">
      <oc-select
        :model-value="modelValue.from"
        :label="`${$gettext('From')}:`"
        :inline-label="true"
        :has-border="false"
        :options="fromOptions"
        option-label="label"
        option-value="value"
        class="w-full"
        @update:model-value="(value) => updateField('from', value as FromOption)"
      />
    </div>
    <oc-text-input
      :model-value="modelValue.to"
      type="email"
      class="mail-new-message-to-input mb-2 pb-2 border-b border-role-outline-variant"
      :label="`${$gettext('To')}:`"
      :inline-label="true"
      :has-border="false"
      @update:model-value="(value: string) => updateField('to', value)"
    />
    <oc-text-input
      :model-value="modelValue.cc"
      type="email"
      class="mail-new-message-cc-input mb-2 pb-2 border-b border-role-outline-variant"
      :label="`${$gettext('CC')}:`"
      :inline-label="true"
      :has-border="false"
      @update:model-value="(value: string) => updateField('cc', value)"
    />
    <oc-text-input
      :model-value="modelValue.bcc"
      type="email"
      class="mail-new-message-bcc-input mb-2 pb-2 border-b border-role-outline-variant"
      :label="`${$gettext('BCC')}:`"
      :inline-label="true"
      :has-border="false"
      @update:model-value="(value: string) => updateField('bcc', value)"
    />
    <oc-text-input
      :model-value="modelValue.subject"
      class="mail-new-message-to-input pb-2 border-b border-role-outline-variant"
      :label="`${$gettext('Subject')}:`"
      :inline-label="true"
      :has-border="false"
      @update:model-value="(value: string) => updateField('subject', value)"
    />
    <div class="flex-1 flex flex-col min-h-0">
      <div class="mail-body-editor flex flex-col gap-2 h-full min-h-0 flex-1">
        <div class="mail-body-editor-wrapper flex-1 min-h-0" @click="onWrapperClick">
          <TextEditorProvider :editor="textEditor">
            <TextEditorToolbar />
            <TextEditorContent />
          </TextEditorProvider>
        </div>
      </div>
      <MailAttachmentList
        :attachments="modelValue.attachments ?? []"
        mode="compose"
        @remove="removeAttachment"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, unref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  useGroupwareAccountsStore,
  useRouteQuery,
  useModals
} from '@opencloud-eu/web-pkg'
import {
  useTextEditor,
  TextEditorProvider,
  TextEditorContent,
  TextEditorToolbar
} from '@opencloud-eu/web-pkg/editor'
import { storeToRefs } from 'pinia'
import DOMPurify from 'dompurify'
import MailAttachmentList from './MailAttachmentList.vue'

type FromOption = {
  value: string
  label: string
  name: string
  email: string
  accountId: string
  identityId: string
}

export type MailComposeAttachment = {
  id: string
  blobId: string
  name: string
  type: string
  disposition: 'attachment'
  size: number
}

export type ComposeFormState = {
  from?: FromOption
  to: string
  cc: string
  bcc: string
  subject: string
  body: string
  attachments?: MailComposeAttachment[]
}

const { modelValue } = defineProps<{
  modelValue: ComposeFormState
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: ComposeFormState): void
}>()

const { $gettext } = useGettext()

const { dispatchModal } = useModals()

const textEditor = useTextEditor({
  contentType: 'html',
  modelValue: modelValue.body,
  onUpdate: (content) => {
    updateField('body', content)
  },
  onRequestLinkUrl: (currentUrl?: string) => {
    return new Promise((resolve) => {
      dispatchModal({
        title: $gettext('Add link'),
        confirmText: $gettext('Apply'),
        hasInput: true,
        inputType: 'text',
        inputLabel: $gettext('URL'),
        inputValue: currentUrl ?? '',
        onConfirm: (value: any) => {
          const raw = typeof value === 'string' ? value : (value ?? '').toString()
          const cleaned = DOMPurify.sanitize(raw, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim()
          if (!cleaned) {
            resolve(null)
            return
          }
          let href = cleaned
          if (!/^[a-zA-Z][\w+.-]*:/.test(href)) href = `https://${href}`
          try {
            const url = new URL(href)
            if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) {
              resolve(null)
              return
            }
            resolve(url.href)
          } catch {
            resolve(null)
          }
        },
        onCancel: () => resolve(null)
      })
    })
  }
})

const onWrapperClick = (event: MouseEvent) => {
  if (!textEditor.editor.value) return
  const editorDom = textEditor.editor.value.view.dom as HTMLElement
  if (editorDom.contains(event.target as Node)) return
  textEditor.focus()
}

const accountsStore = useGroupwareAccountsStore()
const { accounts } = storeToRefs(accountsStore)

const selectedAccountIdQuery = useRouteQuery('accountId')

const fromOptions = computed<FromOption[]>(() => {
  return (
    unref(accounts)?.flatMap((account) =>
      account.identities?.map((identity) => ({
        label: identity.name ? `${identity.name} <${identity.email}>` : identity.email,
        value: identity.id,
        name: identity.name || identity.email,
        email: identity.email,
        accountId: account.accountId,
        identityId: identity.id
      }))
    ) ?? []
  )
})

const updateField = <K extends keyof ComposeFormState>(key: K, value: ComposeFormState[K]) => {
  emit('update:modelValue', { ...modelValue, [key]: value })
}

const removeAttachment = (id: string) => {
  const next = (modelValue.attachments ?? []).filter((a) => a.id !== id)
  updateField('attachments', next)
}

watch(
  fromOptions,
  (options) => {
    if (!options.length) {
      return
    }
    const selectedAccountId = unref(selectedAccountIdQuery)
    const defaultFrom = selectedAccountId
      ? (options.find((o) => o.accountId === selectedAccountId) ?? options[0])
      : options[0]

    if (!modelValue.from && defaultFrom) {
      updateField('from', defaultFrom)
    }
  },
  { immediate: true }
)
</script>
