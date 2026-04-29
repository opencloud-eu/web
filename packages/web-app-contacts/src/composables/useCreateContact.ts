import { ref } from 'vue'
import { z } from 'zod'
import { urlJoin } from '@opencloud-eu/web-client'
import { useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import { ContactSchema, type Contact } from '../types'
import type { CreateContactPayload } from '../helpers/contactForm'

const WrappedContactResponseSchema = z.object({
  contact: ContactSchema
})

export const useCreateContact = () => {
  const clientService = useClientService()
  const configStore = useConfigStore()
  const isSaving = ref(false)

  const createContact = async (
    accountId: string,
    payload: CreateContactPayload
  ): Promise<Contact> => {
    isSaving.value = true

    try {
      const { data } = await clientService.httpAuthenticated.post(
        urlJoin(configStore.groupwareUrl, `accounts/${accountId}/contacts`),
        payload
      )

      const directContact = ContactSchema.safeParse(data)
      if (directContact.success) {
        return directContact.data
      }

      return WrappedContactResponseSchema.parse(data).contact
    } finally {
      isSaving.value = false
    }
  }

  return {
    isSaving,
    createContact
  }
}
