import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Mailbox } from '../../types'
import { useRouteQueryId } from '../useRouterQueryId'

export const useMailboxesStore = defineStore('mail-mailboxes', () => {
  const mailboxes = ref<Mailbox[]>([])

  const currentMailboxId = useRouteQueryId('mailboxId')

  const currentMailbox = computed(() => {
    const id = currentMailboxId.value
    return mailboxes.value.find((m) => m.id === id)
  })

  const draftsMailboxId = computed(() => {
    const byRole = mailboxes.value.find((m: Mailbox & { role?: string }) => m.role === 'drafts')?.id
    if (byRole) {
      return byRole
    }

    const byName = mailboxes.value.find((m) => (m.name ?? '').toLowerCase() === 'drafts')?.id
    return byName ?? ''
  })

  const setMailboxes = (list: Mailbox[]) => {
    mailboxes.value = list ?? []
  }

  const setCurrentMailbox = (mailbox: Mailbox | null) => {
    currentMailboxId.value = mailbox?.id ?? ''
  }

  return {
    mailboxes,
    currentMailboxId,
    currentMailbox,
    draftsMailboxId,
    setMailboxes,
    setCurrentMailbox
  }
})
