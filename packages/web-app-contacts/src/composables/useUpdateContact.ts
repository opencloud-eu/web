import { ref } from 'vue'
import { z } from 'zod'
import { urlJoin } from '@opencloud-eu/web-client'
import { useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import { ContactSchema, type Contact } from '../types'
import type { UpdateContactPayload } from '../helpers/contactForm'

const WrappedContactResponseSchema = z.object({
  contact: ContactSchema
})

export const useUpdateContact = () => {
  const clientService = useClientService()
  const configStore = useConfigStore()
  const isSaving = ref(false)

  const updateContact = async (
    accountId: string,
    contactId: string,
    payload: UpdateContactPayload
  ): Promise<Contact> => {
    isSaving.value = true

    try {
      const { data } = await clientService.httpAuthenticated.patch(
        urlJoin(configStore.groupwareUrl, `accounts/${accountId}/contacts/${contactId}`),
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
    updateContact
  }
}
