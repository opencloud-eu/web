import { unref } from 'vue'
import { mock, mockDeep } from 'vitest-mock-extended'
import { User } from '@opencloud-eu/web-client/graph/generated'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { ClientService } from '@opencloud-eu/web-pkg'
import { useOpenWithDefaultApp, useSpaceHelpers } from '@opencloud-eu/web-pkg'
import { useSpaceActionsEditReadmeContent } from '../../../../../src/composables/actions/spaces'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useOpenWithDefaultApp: vi.fn(),
  useSpaceHelpers: vi.fn()
}))

describe('editReadmeContent', () => {
  describe('isVisible property', () => {
    it('should be true if canEditReadme is true', () => {
      const spaceMock = mock<SpaceResource>({ canEditReadme: () => true })

      getWrapper({
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isVisible({
              resources: [spaceMock]
            })
          ).toBe(true)
        }
      })
    })
    it('should be false when not resource given', () => {
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ resources: [] })).toBe(false)
        }
      })
    })
    it('should be false if canEditReadme is false', () => {
      const spaceMock = mock<SpaceResource>({ canEditReadme: () => false })

      getWrapper({
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isVisible({
              resources: [spaceMock]
            })
          ).toBe(false)
        }
      })
    })
  })
  describe('method "handler"', () => {
    it('calls method "openWithDefaultApp"', () => {
      getWrapper({
        setup: async ({ actions }, { openWithDefaultApp }) => {
          await unref(actions)[0].handler({ resources: [mock<SpaceResource>()] })
          expect(openWithDefaultApp).toHaveBeenCalled()
        }
      })
    })
  })
})

function getWrapper({
  setup,
  openWithDefaultApp = vi.fn()
}: {
  setup: (
    instance: ReturnType<typeof useSpaceActionsEditReadmeContent>,
    mocks: { openWithDefaultApp: () => void }
  ) => void
  openWithDefaultApp?: () => void
}) {
  vi.mocked(useOpenWithDefaultApp).mockReturnValue(
    mock<ReturnType<typeof useOpenWithDefaultApp>>({
      openWithDefaultApp
    })
  )

  vi.mocked(useSpaceHelpers).mockReturnValue({
    getDefaultMetaFolder: () => new Promise(() => mock<Resource>())
  } as ReturnType<typeof useSpaceHelpers>)

  const mocks = { openWithDefaultApp }

  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useSpaceActionsEditReadmeContent()
        setup(instance, mocks)
      },
      {
        provide: { $clientService: mockDeep<ClientService>() },
        pluginOptions: {
          piniaOptions: {
            userState: { user: { id: '1', onPremisesSamAccountName: 'alice' } as User }
          }
        }
      }
    )
  }
}
