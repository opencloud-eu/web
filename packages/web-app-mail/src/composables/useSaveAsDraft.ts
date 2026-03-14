import { computed, Ref, ref, unref } from 'vue'
import { useTask } from 'vue-concurrency'

export type DraftEmailPayload = Record<string, any> & {
  mailboxIds: Record<string, true>
  keywords: Record<string, boolean>
}

export type DraftEmailResponse = {
  id: string
  blobId?: string
  threadId?: string
  size?: number
}

export type MailDraftApi = {
  createDraft: (accountId: string, payload: DraftEmailPayload) => Promise<DraftEmailResponse>
  replaceDraft: (
    accountId: string,
    emailId: string,
    payload: DraftEmailPayload
  ) => Promise<DraftEmailResponse>
  deleteDraft: (accountId: string, emailId: string) => Promise<void> | void
}

export const useSaveAsDraft = (opts: {
  accountId: Ref<string>
  draftMailboxId: Ref<string>
  api: MailDraftApi
  getDraftPayload: () =>
    | Omit<DraftEmailPayload, 'mailboxIds' | 'keywords'>
    | Partial<DraftEmailPayload>
  initialDraftId?: string | null
}) => {
  const draftId = ref<string | null>(opts.initialDraftId ?? null)
  const isDirty = ref(false)

  const canSave = computed(() => {
    return !!unref(opts.accountId) && !!unref(opts.draftMailboxId)
  })

  const saveDraftTask = useTask(function* () {
    const accountId = unref(opts.accountId)
    const draftMailboxId = unref(opts.draftMailboxId)
    if (!accountId || !draftMailboxId) {
      return null
    }

    const base = opts.getDraftPayload() ?? {}

    const payload: DraftEmailPayload = {
      ...(base as any),
      mailboxIds: { [draftMailboxId]: true },
      keywords: { ...(base as any).keywords, $draft: true }
    }

    let res: DraftEmailResponse
    if (!unref(draftId)) {
      res = yield opts.api.createDraft(accountId, payload)
    } else {
      res = yield opts.api.replaceDraft(accountId, unref(draftId), payload)
    }

    draftId.value = res.id
    isDirty.value = false
    return res
  }).restartable()

  const discardDraftTask = useTask(function* () {
    const accountId = unref(opts.accountId)
    if (!accountId || !unref(draftId)) {
      return
    }

    yield opts.api.deleteDraft(accountId, unref(draftId))
    draftId.value = null
    isDirty.value = false
  }).restartable()

  const isSaving = computed(() => {
    return saveDraftTask.isRunning
  })

  const markDirty = () => {
    isDirty.value = true
  }

  const resetDraft = (nextDraftId: string | null) => {
    draftId.value = nextDraftId
    isDirty.value = false
  }

  const saveAsDraft = async () => {
    if (!canSave.value) {
      return null
    }
    return await saveDraftTask.perform()
  }

  const discardDraft = async () => {
    return await discardDraftTask.perform()
  }

  return {
    draftId,
    isDirty,
    isSaving,
    canSave,
    markDirty,
    resetDraft,
    saveAsDraft,
    discardDraft
  }
}
