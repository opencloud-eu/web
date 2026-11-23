import { unref } from 'vue'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useUpdateContact } from '../../../src/composables/useUpdateContact'
import type { Contact } from '../../../src/types'

const contact: Contact = { id: 'contact-1', name: { full: 'Ada Lovelace' } }

type PatchResponse = Awaited<
  ReturnType<
    ReturnType<typeof defaultComponentMocks>['$clientService']['httpAuthenticated']['patch']
  >
>

describe('useUpdateContact', () => {
  it('sends the payload as PATCH to the contact', async () => {
    const { instance, mocks } = getWrapper()
    mocks.$clientService.httpAuthenticated.patch.mockResolvedValue({
      data: contact
    } as PatchResponse)

    await instance.updateContact('account-1', 'contact-1', { nicknames: {} })

    expect(mocks.$clientService.httpAuthenticated.patch).toHaveBeenCalledWith(
      expect.stringMatching(/\/groupware\/accounts\/account-1\/contacts\/contact-1$/),
      { nicknames: {} }
    )
  })

  it.each([
    { response: contact, description: 'a contact' },
    { response: { contact }, description: 'a wrapped contact' }
  ])('returns the saved contact for $description', async ({ response }) => {
    const { instance, mocks } = getWrapper()
    mocks.$clientService.httpAuthenticated.patch.mockResolvedValue({
      data: response
    } as PatchResponse)

    await expect(instance.updateContact('account-1', 'contact-1', {})).resolves.toEqual(contact)
  })

  it('resets the saving state if the request fails', async () => {
    const { instance, mocks } = getWrapper()
    mocks.$clientService.httpAuthenticated.patch.mockRejectedValue(new Error('failed'))

    await expect(instance.updateContact('account-1', 'contact-1', {})).rejects.toThrow('failed')
    expect(unref(instance.isSaving)).toBe(false)
  })
})

function getWrapper() {
  const mocks = defaultComponentMocks()
  let instance: ReturnType<typeof useUpdateContact>
  getComposableWrapper(
    () => {
      instance = useUpdateContact()
    },
    { mocks, provide: mocks }
  )
  return { instance, mocks }
}
