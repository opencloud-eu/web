import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Mail } from '../../types'
import { useRouteQueryId } from '../useRouterQueryId'

export const useMailsStore = defineStore('mails', () => {
  const mails = ref<Mail[]>([])

  const currentMailId = useRouteQueryId('mailId')

  const currentMail = computed(() => {
    const id = currentMailId.value
    return mails.value.find((m) => m.id === id)
  })

  const setMails = (list: Mail[]) => {
    mails.value = list ?? []
  }

  const upsertMail = (mail: Mail) => {
    const idx = mails.value.findIndex((m) => m.id === mail.id)
    if (idx === -1) {
      mails.value.unshift(mail)
    } else {
      mails.value[idx] = { ...mails.value[idx], ...mail }
    }
  }

  const setCurrentMail = (mail: Mail | null) => {
    if (!mail) {
      currentMailId.value = ''
      return
    }
    upsertMail(mail)
    currentMailId.value = mail.id
  }

  const updateMailField = (opts: { id: string; field: keyof Mail; value: any }) => {
    const idx = mails.value.findIndex((m) => m.id === opts.id)
    if (idx === -1) {
      return
    }
    mails.value[idx] = { ...mails.value[idx], [opts.field]: opts.value }
  }

  return {
    mails,
    currentMailId,
    currentMail,
    setMails,
    upsertMail,
    setCurrentMail,
    updateMailField
  }
})
