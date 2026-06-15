import { Contact } from '@opencloud-eu/web-client/ox'
import { ShareTypes } from '@opencloud-eu/web-client'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useOpenXchangeContacts } from '../../../../src/composables/openXchange/useOpenXchangeContacts'

describe('useOpenXchangeContacts', () => {
  it('returns an empty list and does not call the api when the config option is disabled', async () => {
    const { instance, mocks } = getWrapper({ enabled: false })
    const result = await instance.searchContacts('jane')
    expect(result).toEqual([])
    expect(mocks.$clientService.ox.autocompleteContacts).not.toHaveBeenCalled()
  })

  it('maps contacts to contact share recipients when enabled', async () => {
    const contacts: Contact[] = [
      { id: '1', displayName: 'Jane Doe', email: 'jane@example.com' },
      { id: '2', displayName: '', email: 'john@example.com' }
    ]
    const { instance } = getWrapper({ enabled: true, contacts })

    const result = await instance.searchContacts('j')

    expect(result).toEqual([
      {
        id: 'jane@example.com',
        displayName: 'Jane Doe',
        mail: 'jane@example.com',
        shareType: ShareTypes.contact.value
      },
      {
        id: 'john@example.com',
        displayName: 'john@example.com',
        mail: 'john@example.com',
        shareType: ShareTypes.contact.value
      }
    ])
  })

  it('returns an empty list when the api call fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { instance } = getWrapper({ enabled: true, rejects: true })
    const result = await instance.searchContacts('j')
    expect(result).toEqual([])
  })
})

function getWrapper({
  enabled,
  contacts = [],
  rejects = false
}: {
  enabled: boolean
  contacts?: Contact[]
  rejects?: boolean
}) {
  const mocks = defaultComponentMocks()
  if (rejects) {
    mocks.$clientService.ox.autocompleteContacts.mockRejectedValue(new Error('failed'))
  } else {
    mocks.$clientService.ox.autocompleteContacts.mockResolvedValue(contacts)
  }

  let instance: ReturnType<typeof useOpenXchangeContacts>
  const wrapper = getComposableWrapper(
    () => {
      instance = useOpenXchangeContacts()
    },
    {
      mocks,
      provide: mocks,
      pluginOptions: {
        piniaOptions: { configState: { options: { oxAppSuite: { enabled } } } }
      }
    }
  )

  return { wrapper, instance, mocks }
}
