import { mock } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useResourceIndicators } from '../../../../src/composables/resources'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { AncestorMetaDataValue } from '../../../../src/types'

describe('useResourceIndicators', () => {
  describe('locked indicator', () => {
    it.each([true, false])('should only be present if the file is locked', (locked) => {
      getWrapper({
        setup: ({ getIndicators }) => {
          const space = mock<SpaceResource>({ id: 'space' })
          const resource = mock<Resource>({ id: 'resource', locked })
          const indicators = getIndicators({ space, resource })
          expect(indicators.some(({ type }) => type === 'resource-locked')).toBe(locked)
        }
      })
    })
  })
  describe('processing indicator', () => {
    it.each([true, false])('should only be present if the file is processing', (processing) => {
      getWrapper({
        setup: ({ getIndicators }) => {
          const space = mock<SpaceResource>({ id: 'space' })
          const resource = mock<Resource>({ id: 'resource', processing })
          const indicators = getIndicators({ space, resource })
          expect(indicators.some(({ type }) => type === 'resource-processing')).toBe(processing)
        }
      })
    })
  })

  describe('sharing indicators', () => {
    it("should not be present in another user's personal space", () => {
      getWrapper({
        setup: ({ getIndicators }) => {
          const space = mock<SpaceResource>({ driveType: 'personal', isOwner: () => false })
          const resource = mock<Resource>({ id: 'resource', shareTypes: [0, 3] })
          const indicators = getIndicators({ space, resource })
          expect(indicators.some(({ category }) => category === 'sharing')).toBeFalsy()
        }
      })
    })
    it('should not be present in a share space', () => {
      getWrapper({
        setup: ({ getIndicators }) => {
          const space = mock<SpaceResource>({ driveType: 'share' })
          const resource = mock<Resource>({ id: 'resource', shareTypes: [0, 3] })
          const indicators = getIndicators({ space, resource })
          expect(indicators.some(({ category }) => category === 'sharing')).toBeFalsy()
        }
      })
    })
    it('should not be present in a public space', () => {
      getWrapper({
        setup: ({ getIndicators }) => {
          const space = mock<SpaceResource>({ driveType: 'public' })
          const resource = mock<Resource>({ id: 'resource', shareTypes: [0, 3] })
          const indicators = getIndicators({ space, resource })
          expect(indicators.some(({ category }) => category === 'sharing')).toBeFalsy()
        }
      })
    })
    it('should be present for direct collaborator and link shares', () => {
      getWrapper({
        setup: ({ getIndicators }) => {
          const space = mock<SpaceResource>({ driveType: 'project' })
          const resource = mock<Resource>({ id: 'resource', shareTypes: [0, 3] })
          const indicators = getIndicators({ space, resource })
          expect(
            indicators.some(
              ({ category, type }) => category === 'sharing' && type === 'link-direct'
            )
          ).toBeTruthy()
          expect(
            indicators.some(
              ({ category, type }) => category === 'sharing' && type === 'user-direct'
            )
          ).toBeTruthy()
        }
      })
    })
    it('should be present for indirect collaborator and link shares', () => {
      getWrapper({
        ancestorMetaData: { '/': mock<AncestorMetaDataValue>({ shareTypes: [0, 3] }) },
        setup: ({ getIndicators }) => {
          const space = mock<SpaceResource>({ driveType: 'project' })
          const resource = mock<Resource>({ id: 'resource', shareTypes: [] })
          const indicators = getIndicators({ space, resource })
          expect(
            indicators.some(
              ({ category, type }) => category === 'sharing' && type === 'link-indirect'
            )
          ).toBeTruthy()
          expect(
            indicators.some(
              ({ category, type }) => category === 'sharing' && type === 'user-indirect'
            )
          ).toBeTruthy()
        }
      })
    })
  })
})

function getWrapper({
  setup,
  ancestorMetaData = {}
}: {
  setup: (instance: ReturnType<typeof useResourceIndicators>) => void
  ancestorMetaData?: Record<string, AncestorMetaDataValue>
}) {
  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useResourceIndicators()
        setup(instance)
      },
      { pluginOptions: { piniaOptions: { resourcesStore: { ancestorMetaData } } } }
    )
  }
}
