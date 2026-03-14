import { ref } from 'vue'
import { Mail } from '../types'

const isOpen = ref(false)
const draftMail = ref<Mail | null>(null)

export const useMailCompose = () => {
  const openNewCompose = () => {
    draftMail.value = null
    isOpen.value = true
  }

  const openDraftCompose = (mail: Mail) => {
    draftMail.value = mail
    isOpen.value = true
  }

  const closeCompose = () => {
    isOpen.value = false
    draftMail.value = null
  }

  return {
    isOpen,
    draftMail,
    openNewCompose,
    openDraftCompose,
    closeCompose
  }
}
