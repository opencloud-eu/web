import { ref, unref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { SharingLinkType } from '@opencloud-eu/web-client/graph/generated'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { CapabilityStore, useLinkTypes, useModals, useSharesStore } from '@opencloud-eu/web-pkg'
import { useFileActionsCreateLink } from '../../../../../src/composables/actions/files'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useLinkTypes: vi.fn()
}))

describe('useFileActionsCreateLink', () => {
  describe('isVisible property', () => {
    it('should return false if no resource selected', () => {
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ space: null, resources: [] })).toBeFalsy()
        }
      })
    })

    it('should return false if one resource can not be shared', () => {
      getWrapper({
        setup: ({ actions }) => {
          const resources = [mock<Resource>({ canShare: () => false })]
          expect(unref(actions)[0].isVisible({ space: null, resources })).toBeFalsy()
        }
      })
    })

    it('should return false if one resource is a disabled project space', () => {
      getWrapper({
        setup: ({ actions }) => {
          const resources = [
            mock<SpaceResource>({ canShare: () => true, disabled: true, driveType: 'project' })
          ]
          expect(unref(actions)[0].isVisible({ space: null, resources })).toBeFalsy()
        }
      })
    })

    it('should return true if all files can be shared', () => {
      getWrapper({
        setup: ({ actions }) => {
          const resources = [
            mock<Resource>({ canShare: () => true }),
            mock<Resource>({ canShare: () => true })
          ]
          expect(unref(actions)[0].isVisible({ space: null, resources })).toBeTruthy()
        }
      })
    })
  })

  describe('handler', () => {
    it('calls the createLink method and shows messages', () => {
      getWrapper({
        setup: async ({ actions }) => {
          const { addLink } = useSharesStore()
          await unref(actions)[0].handler({
            resources: [mock<Resource>({ canShare: () => true })],
            space: undefined
          })
          expect(addLink).toHaveBeenCalledTimes(1)
        }
      })
    })

    it('shows a modal if enforced', () => {
      getWrapper({
        enforceModal: true,
        setup: ({ actions }) => {
          const { addLink } = useSharesStore()
          const { dispatchModal } = useModals()
          unref(actions)[0].handler({
            resources: [mock<Resource>({ canShare: () => true })],
            space: undefined
          })
          expect(addLink).not.toHaveBeenCalled()
          expect(dispatchModal).toHaveBeenCalledTimes(1)
        }
      })
    })
  })
})

function getWrapper({
  setup,
  enforceModal = false,
  passwordEnforced = false,
  defaultLinkType = SharingLinkType.View
}: {
  setup: (
    instance: ReturnType<typeof useFileActionsCreateLink>,
    mocks: Record<string, unknown>
  ) => void
  enforceModal?: boolean
  passwordEnforced?: boolean
  defaultLinkType?: SharingLinkType
}) {
  vi.mocked(useLinkTypes).mockReturnValue(
    mock<ReturnType<typeof useLinkTypes>>({ defaultLinkType: ref(defaultLinkType) })
  )

  const mocks = { ...defaultComponentMocks() }
  const capabilities = {
    files_sharing: { public: { password: { enforced_for: { read_only: passwordEnforced } } } }
  } satisfies Partial<CapabilityStore['capabilities']>

  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useFileActionsCreateLink({
          enforceModal
        })
        setup(instance, { mocks })
      },
      {
        provide: mocks,
        pluginOptions: { piniaOptions: { capabilityState: { capabilities } } }
      }
    )
  }
}
