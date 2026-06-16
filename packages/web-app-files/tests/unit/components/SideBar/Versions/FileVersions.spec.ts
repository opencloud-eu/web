import { DateTime } from 'luxon'
import FileVersions from '../../../../../src/components/SideBar/Versions/FileVersions.vue'
import {
  defaultComponentMocks,
  defaultStubs,
  PartialComponentProps
} from '@opencloud-eu/web-test-helpers'
import { mock, mockDeep } from 'vitest-mock-extended'
import { GraphSharePermission, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { ProjectSpaceResource, ShareSpaceResource } from '@opencloud-eu/web-client'
import { defaultPlugins, mount, shallowMount } from '@opencloud-eu/web-test-helpers'
import { useDownloadFile, useResourcesStore } from '@opencloud-eu/web-pkg'
import { computed } from 'vue'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useDownloadFile: vi.fn()
}))

const yesterday = DateTime.now().minus({ days: 1 }).toHTTP()
const sevenDaysBefore = DateTime.now().minus({ days: 7 }).toHTTP()
const defaultVersions = [
  mock<Resource>({
    name: '1625818937',
    size: '23',
    mimeType: 'text/plain',
    etag: '82add182994ade91e3d5bc47571ea731',
    mdate: yesterday,
    type: ''
  }),
  mock<Resource>({
    name: '1625637401',
    size: '11',
    mimeType: 'text/plain',
    etag: '311b3319ebc7063069a15ee02b926298',
    mdate: sevenDaysBefore,
    type: ''
  })
]

const selectors = {
  noVersionsMessage: '[data-testid="file-versions-no-versions"]',
  lastModifiedDate: '[data-testid="file-versions-file-last-modified-date"]',
  resourceSize: '[data-testid="file-versions-file-size"]',
  revertVersionButton: '[data-testid="file-versions-revert-button"]',
  downloadVersionButton: '[data-testid="file-versions-download-button"]'
}

describe('FileVersions', () => {
  it('should show no versions message if there are no versions', () => {
    const { wrapper } = getMountedWrapper({ mountType: shallowMount, versions: [] })
    const noVersionsMessageElement = wrapper.find(selectors.noVersionsMessage)

    expect(noVersionsMessageElement.text()).toBe('No versions available for this file')
  })

  describe('when the file has versions', () => {
    describe('versions list', () => {
      it('should show last modified date of each version', () => {
        const { wrapper } = getMountedWrapper({ mountType: shallowMount })
        const dateElement = wrapper.findAll(selectors.lastModifiedDate)

        expect(dateElement.length).toBe(2)
        expect(dateElement.at(0).text()).toBe('1 day ago')
        expect(dateElement.at(1).text()).toBe('7 days ago')
      })
      it('should show content length of each version', () => {
        const { wrapper } = getMountedWrapper({ mountType: shallowMount })
        const contentLengthElement = wrapper.findAll(selectors.resourceSize)

        expect(contentLengthElement.length).toBe(2)
        expect(contentLengthElement.at(0).text()).toBe('23 B')
        expect(contentLengthElement.at(1).text()).toBe('11 B')
      })
      describe('row actions', () => {
        describe('reverting to a specific version', () => {
          it('should be possible for a non-share', () => {
            const { wrapper } = getMountedWrapper()
            const revertVersionButton = wrapper.findAll(selectors.revertVersionButton)
            expect(revertVersionButton.length).toBe(defaultVersions.length)
          })
          it('should not be possible when isReadOnly prop is true', () => {
            const { wrapper } = getMountedWrapper({ props: { isReadOnly: true } })
            const revertVersionButton = wrapper.findAll(selectors.revertVersionButton)
            expect(revertVersionButton.length).toBe(0)
          })
          it('should be possible for a share space with updateVersions graph permission', () => {
            const space = mockDeep<ShareSpaceResource>({
              driveType: 'share',
              graphPermissions: [GraphSharePermission.updateVersions]
            })
            const { wrapper } = getMountedWrapper({ space })
            const revertVersionButton = wrapper.findAll(selectors.revertVersionButton)
            expect(revertVersionButton.length).toBe(defaultVersions.length)
          })
          it('should not be possible for a share space without updateVersions graph permission', () => {
            const space = mockDeep<ShareSpaceResource>({
              driveType: 'share',
              graphPermissions: []
            })
            const { wrapper } = getMountedWrapper({ space })
            const revertVersionButton = wrapper.findAll(selectors.revertVersionButton)
            expect(revertVersionButton.length).toBe(0)
          })
          it('should be possible for a project space with updateVersions graph permission', () => {
            const space = mockDeep<ProjectSpaceResource>({
              driveType: 'project',
              graphPermissions: [GraphSharePermission.updateVersions]
            })
            const { wrapper } = getMountedWrapper({ space })
            const revertVersionButton = wrapper.findAll(selectors.revertVersionButton)
            expect(revertVersionButton.length).toBe(defaultVersions.length)
          })
          it('should not be possible for a project space without updateVersions graph permission', () => {
            const space = mockDeep<ProjectSpaceResource>({
              driveType: 'project',
              graphPermissions: [GraphSharePermission.readVersions]
            })
            const { wrapper } = getMountedWrapper({ space })
            const revertVersionButton = wrapper.findAll(selectors.revertVersionButton)
            expect(revertVersionButton.length).toBe(0)
          })
          it('should call UPDATE_RESOURCE_FIELD mutation when revert button is clicked', async () => {
            const { wrapper } = getMountedWrapper()
            const revertVersionButton = wrapper.findAll(selectors.revertVersionButton)
            const { updateResourceField } = useResourcesStore()

            expect(revertVersionButton.length).toBe(defaultVersions.length)
            expect(updateResourceField).not.toHaveBeenCalled()

            await revertVersionButton.at(0).trigger('click')
            await wrapper.vm.$nextTick()

            expect(updateResourceField).toHaveBeenCalledTimes(2)
          })
        })

        it('should call downloadFile method when download version button is clicked', async () => {
          const { wrapper, mocks } = getMountedWrapper()
          const downloadVersionButton = wrapper.findAll(selectors.downloadVersionButton)

          expect(downloadVersionButton.length).toBe(defaultVersions.length)
          expect(mocks.downloadFile).not.toHaveBeenCalled()

          await downloadVersionButton.at(0).trigger('click')

          expect(mocks.downloadFile).toHaveBeenCalledTimes(1)
        })
      })
    })
  })
})

function getMountedWrapper({
  mountType = mount,
  space = undefined,
  versions = defaultVersions,
  resource = mock<Resource>({ id: '1', size: 0, mdate: '' }),
  props = {}
}: {
  mountType?: typeof mount
  space?: SpaceResource
  versions?: Resource[]
  resource?: Resource
  props?: PartialComponentProps<typeof FileVersions>
} = {}) {
  const downloadFile = vi.fn()
  vi.mocked(useDownloadFile).mockReturnValue({ downloadFile })
  const mocks = {
    ...defaultComponentMocks(),
    downloadFile
  }
  mocks.$clientService.webdav.getFileInfo.mockResolvedValue(mock<Resource>({ id: '1' }))

  return {
    wrapper: mountType(FileVersions, {
      props,
      global: {
        mocks,
        renderStubDefaultSlot: true,
        provide: {
          space: computed(() => space),
          resource: computed(() => resource),
          versions: computed(() => versions),
          ...mocks
        },
        stubs: {
          ...defaultStubs,
          'oc-td': true,
          'oc-tr': true,
          'oc-tbody': true,
          'oc-table-simple': true,
          'oc-resource-icon': true,
          OcButton: false
        },
        plugins: [...defaultPlugins()]
      }
    }),
    mocks
  }
}
