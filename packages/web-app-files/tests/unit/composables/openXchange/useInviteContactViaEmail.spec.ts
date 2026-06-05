import { mock } from 'vitest-mock-extended'
import {
  CollaboratorAutoCompleteItem,
  LinkShare,
  Resource,
  SpaceResource
} from '@opencloud-eu/web-client'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useSharesStore } from '@opencloud-eu/web-pkg'
import { useInviteContactViaEmail } from '../../../../src/composables/openXchange/useInviteContactViaEmail'

const contact = () =>
  mock<CollaboratorAutoCompleteItem>({
    id: 'contact@example.com',
    mail: 'contact@example.com',
    displayName: 'Contact'
  })

describe('useInviteContactViaEmail', () => {
  it('creates a public link named after the contact email and emails it (no password when not enforced)', async () => {
    const { instance, mocks, addLink } = getWrapper()

    await instance.inviteContact({
      space: mock<SpaceResource>(),
      resource: mock<Resource>({ name: 'Report.pdf' }),
      contact: contact()
    })

    const options = vi.mocked(addLink).mock.calls[0][0].options
    expect(options.displayName).toBe('contact@example.com')
    expect(options.password).toBeUndefined()

    expect(mocks.$clientService.ox.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: { name: 'Contact', email: 'contact@example.com' },
        subject: '«Report.pdf» was shared with you'
      })
    )
    expect(mocks.$passwordPolicyService.generatePassword).not.toHaveBeenCalled()
  })

  it('generates a password when enforced and passes it to the link and email', async () => {
    const { instance, mocks, addLink } = getWrapper({ enforcePassword: true })
    mocks.$passwordPolicyService.generatePassword.mockReturnValue('gen-pw')

    await instance.inviteContact({
      space: mock<SpaceResource>(),
      resource: mock<Resource>({ name: 'Report.pdf' }),
      contact: contact()
    })

    const options = vi.mocked(addLink).mock.calls[0][0].options
    expect(options.password).toBe('gen-pw')
    const sentHtml = mocks.$clientService.ox.sendMail.mock.calls[0][0].htmlContent
    expect(sentHtml).toContain('gen-pw')
  })
})

function getWrapper({ enforcePassword = false }: { enforcePassword?: boolean } = {}) {
  const mocks = defaultComponentMocks()
  let instance: ReturnType<typeof useInviteContactViaEmail>
  let addLink: ReturnType<typeof useSharesStore>['addLink']

  const wrapper = getComposableWrapper(
    () => {
      const sharesStore = useSharesStore()
      addLink = sharesStore.addLink
      vi.mocked(addLink).mockResolvedValue(
        mock<LinkShare>({ webUrl: 'https://cloud.example.com/s/abc' })
      )
      instance = useInviteContactViaEmail()
    },
    {
      mocks,
      provide: mocks,
      pluginOptions: {
        piniaOptions: {
          capabilityState: {
            capabilities: {
              files_sharing: {
                public: { password: { enforced_for: { read_only: enforcePassword } } }
              }
            }
          }
        }
      }
    }
  )

  return { wrapper, instance, mocks, addLink }
}
