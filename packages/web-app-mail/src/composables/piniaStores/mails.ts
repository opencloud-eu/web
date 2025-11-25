import { defineStore } from 'pinia'
import { ref, unref } from 'vue'
import { Mail } from '../../types'
import { useRouteQuery } from '@opencloud-eu/web-pkg/src'

export const useMailsStore = defineStore('mails', () => {
  const currentMailIdQuery = useRouteQuery('mailId')

  const mails = ref<Mail[]>([])
  const currentMail = ref<Mail>()

  const setMails = (data: Mail[]) => {
    mails.value = data
  }

  const upsertMail = (data: Mail) => {
    const existing = unref(mails).find(({ id }) => id === data.id)
    if (existing) {
      Object.assign(existing, data)
      return
    }
    unref(mails).push(data)
  }

  const removeMails = (values: Mail[]) => {
    mails.value = unref(mails).filter((mail) => !values.find(({ id }) => id === mail.id))
  }

  const setCurrentMail = (data: Mail) => {
    currentMail.value = data
    currentMailIdQuery.value = data?.id
  }

  const updateMailField = <T extends Mail>({
    id,
    field,
    value
  }: {
    id: T['id']
    field: keyof T
    value: T[keyof T]
  }) => {
    const mail = unref(mails).find((mail) => id === mail.id) as T
    if (mail) {
      mail[field] = value
    }
  }

  const reset = () => {
    mails.value = []
    currentMail.value = null
  }

  return {
    mails,
    currentMail,
    updateMailField,
    setMails,
    upsertMail,
    removeMails,
    setCurrentMail,
    reset
  }
})

export type MailsStore = ReturnType<typeof useMailsStore>
