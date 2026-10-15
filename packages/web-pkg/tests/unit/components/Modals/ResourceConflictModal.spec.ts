import ResourceConflictModal from '../../../../src/components/Modals/ResourceConflictModal.vue'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { Resource } from '@opencloud-eu/web-client'
import { ResolveStrategy } from '../../../../src/helpers/resource'
import { Modal } from '../../../../src/composables/piniaStores'

describe('ResourceConflictModal', () => {
  describe('checkbox', () => {
    it('renders if more than one conflict given', () => {
      const { wrapper } = getWrapper({ props: { conflictCount: 2 } })
      expect(wrapper.find('oc-checkbox-stub').exists()).toBeTruthy()
    })
    it('does not render if one conflict given', () => {
      const { wrapper } = getWrapper({ props: { conflictCount: 1 } })
      expect(wrapper.find('oc-checkbox-stub').exists()).toBeFalsy()
    })
    it('counts by the type of the conflicting resource', () => {
      const { wrapper } = getWrapper({
        props: {
          conflictCount: 2,
          separateSkipHandling: true,
          resource: mock<Resource>({ name: 'dup', isFolder: false }),
          existingIsFolder: true
        }
      })
      expect(wrapper.find('oc-checkbox-stub').attributes('label')).toEqual('Apply to all 2 files')
    })
  })
  describe('message', () => {
    it.each([
      { existingIsFolder: true, expected: 'Folder with name »dup« already exists.' },
      { existingIsFolder: false, expected: 'File with name »dup« already exists.' }
    ])(
      'names the type of the existing resource, not of the conflicting one',
      ({ existingIsFolder, expected }) => {
        const { wrapper } = getWrapper({
          props: {
            resource: mock<Resource>({ name: 'dup', isFolder: !existingIsFolder }),
            existingIsFolder
          }
        })
        expect(wrapper.find('span').text()).toEqual(expected)
      }
    )
    it('falls back to the type of the conflicting resource', () => {
      const { wrapper } = getWrapper({
        props: { resource: mock<Resource>({ name: 'dup', isFolder: true }) }
      })
      expect(wrapper.find('span').text()).toEqual('Folder with name »dup« already exists.')
    })
  })
  describe('buttons', () => {
    describe('confirmSecondary', () => {
      describe('text', () => {
        it('should equal "Replace" when no "confirmSecondaryTextOverwrite" property is given', () => {
          const { wrapper } = getWrapper()
          expect((wrapper.vm as any).confirmSecondaryText).toEqual('Replace')
        })
        it('should equal "confirmSecondaryTextOverwrite" when property is given', () => {
          const { wrapper } = getWrapper({
            props: { confirmSecondaryTextOverwrite: 'Merge' }
          })
          expect((wrapper.vm as any).confirmSecondaryText).toEqual('Merge')
        })
      })
    })
  })
  describe('onConfirm', () => {
    it('should call the callback', async () => {
      const callbackFn = vi.fn()
      const { wrapper } = getWrapper({ props: { callbackFn } })
      await (wrapper.vm as any).onConfirm()
      expect(callbackFn).toHaveBeenCalledWith({
        strategy: ResolveStrategy.KEEP_BOTH,
        doForAllConflicts: false
      })
    })
  })
  describe('onConfirmSecondary', () => {
    it('should call the callback with merge strategy if merge suggested', async () => {
      const callbackFn = vi.fn()
      const { wrapper } = getWrapper({ props: { callbackFn, suggestMerge: true } })
      await (wrapper.vm as any).onConfirmSecondary()
      expect(callbackFn).toHaveBeenCalledWith({
        strategy: ResolveStrategy.MERGE,
        doForAllConflicts: false
      })
    })
    it('should call the callback with replace strategy if merge not suggested', async () => {
      const callbackFn = vi.fn()
      const { wrapper } = getWrapper({ props: { callbackFn, suggestMerge: false } })
      await (wrapper.vm as any).onConfirmSecondary()
      expect(callbackFn).toHaveBeenCalledWith({
        strategy: ResolveStrategy.REPLACE,
        doForAllConflicts: false
      })
    })
  })
  describe('onCancel', () => {
    it('should call the callback', async () => {
      const callbackFn = vi.fn()
      const { wrapper } = getWrapper({ props: { callbackFn } })
      await (wrapper.vm as any).onCancel()
      expect(callbackFn).toHaveBeenCalledWith({
        strategy: ResolveStrategy.SKIP,
        doForAllConflicts: false
      })
    })
  })
})

function getWrapper({ props = {} } = {}) {
  const mocks = defaultComponentMocks()

  return {
    mocks,
    wrapper: shallowMount(ResourceConflictModal, {
      props: {
        modal: mock<Modal>(),
        resource: mock<Resource>(),
        conflictCount: 1,
        callbackFn: () => ({}),
        ...props
      },
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        provide: mocks
      }
    })
  }
}
