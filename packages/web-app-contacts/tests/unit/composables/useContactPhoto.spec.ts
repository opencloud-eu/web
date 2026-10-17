import { unref } from 'vue'
import { useGroupwareAccountsStore } from '@opencloud-eu/web-pkg'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useContactPhoto } from '../../../src/composables/useContactPhoto'
import type { Contact } from '../../../src/types'

describe('useContactPhoto', () => {
  beforeAll(() => {
    URL.createObjectURL = vi.fn(() => 'blob:photo')
    URL.revokeObjectURL = vi.fn()
  })

  it('uses inline data URIs', () => {
    const { photoUrl } = getWrapper({
      id: 'c1',
      media: { m1: { kind: 'photo', uri: 'data:image/png;base64,AAAA' } }
    })
    expect(unref(photoUrl)).toBe('data:image/png;base64,AAAA')
  })

  it('ignores remote URIs', () => {
    const { photoUrl, mocks } = getWrapper({
      id: 'c1',
      media: { m1: { kind: 'photo', uri: 'https://tracker.example/photo.png' } }
    })
    expect(unref(photoUrl)).toBeUndefined()
    expect(mocks.$clientService.httpAuthenticated.get).not.toHaveBeenCalled()
  })

  it('loads photos from the blob store', async () => {
    const { photoUrl, mocks } = getWrapper({
      id: 'c1',
      media: { m1: { kind: 'photo', blobId: 'blob-1' } }
    })
    await vi.waitFor(() => expect(unref(photoUrl)).toBe('blob:photo'))
    expect(mocks.$clientService.httpAuthenticated.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/groupware\/accounts\/account-1\/blobs\/blob-1$/),
      { responseType: 'blob' }
    )
  })

  it('ignores media other than photos', () => {
    const { photoUrl } = getWrapper({
      id: 'c1',
      media: { m1: { kind: 'logo', uri: 'data:image/png;base64,AAAA' } }
    })
    expect(unref(photoUrl)).toBeUndefined()
  })
})

function getWrapper(contact: Contact) {
  const mocks = defaultComponentMocks()
  mocks.$clientService.httpAuthenticated.get.mockResolvedValue({ data: new Blob() } as any)
  let instance: ReturnType<typeof useContactPhoto>
  getComposableWrapper(
    () => {
      const accountsStore = useGroupwareAccountsStore()
      accountsStore.accounts = [{ accountId: 'account-1' } as (typeof accountsStore.accounts)[0]]
      // @ts-expect-error getters are writable in the testing pinia
      accountsStore.currentAccount = accountsStore.accounts[0]
      instance = useContactPhoto(contact)
    },
    { mocks, provide: mocks }
  )
  return { ...instance, mocks }
}
