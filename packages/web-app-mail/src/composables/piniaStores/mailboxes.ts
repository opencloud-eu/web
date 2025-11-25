import { defineStore } from 'pinia'
import { ref, unref } from 'vue'
import { Mailbox } from '../../types'
import { useRouteQuery } from '@opencloud-eu/web-pkg/src'

export const useMailboxesStore = defineStore('mailboxes', () => {
  const currentMailboxIdQuery = useRouteQuery('mailboxId')

  const mailboxes = ref<Mailbox[]>([])
  const currentMailbox = ref<Mailbox>()

  const setMailboxes = (data: Mailbox[]) => {
    mailboxes.value = data
  }

  const upsertMailbox = (data: Mailbox) => {
    const existing = unref(mailboxes).find(({ id }) => id === data.id)
    if (existing) {
      Object.assign(existing, data)
      return
    }
    unref(mailboxes).push(data)
  }

  const removeMailboxes = (values: Mailbox[]) => {
    mailboxes.value = unref(mailboxes).filter(
      (mailbox) => !values.find(({ id }) => id === mailbox.id)
    )
  }

  const setCurrentMailbox = (data: Mailbox) => {
    currentMailbox.value = data
    currentMailboxIdQuery.value = data?.id
  }

  const updateMailboxField = <T extends Mailbox>({
    id,
    field,
    value
  }: {
    id: T['id']
    field: keyof T
    value: T[keyof T]
  }) => {
    const mailbox = unref(mailboxes).find((mailbox) => id === mailbox.id) as T
    if (mailbox) {
      mailbox[field] = value
    }
  }

  const reset = () => {
    mailboxes.value = []
    currentMailbox.value = null
  }

  return {
    mailboxes,
    currentMailbox,
    updateMailboxField,
    setMailboxes,
    upsertMailbox,
    removeMailboxes,
    setCurrentMailbox,
    reset
  }
})

export type MailboxesStore = ReturnType<typeof useMailboxesStore>
