import { mock } from 'vitest-mock-extended'
import { unref } from 'vue'
import {
  defaultComponentMocks,
  getComposableWrapper,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { ApplicationFileExtension, useAppsStore } from '@opencloud-eu/web-pkg'
import { useUploadActions } from '../../../../src/composables/extensions/useUploadActions'

describe('useUploadActions', () => {
  it('contains the new folder and new shortcut actions', () => {
    getWrapper({
      setup: (uploadActions) => {
        const ids = unref(uploadActions).map(({ id }) => id)
        expect(ids).toEqual([
          'com.github.opencloud-eu.web.files.upload-action.new-folder',
          'com.github.opencloud-eu.web.files.upload-action.new-shortcut'
        ])
      }
    })
  })

  it('includes new file actions of file extensions registered after setup', () => {
    getWrapper({
      setup: (uploadActions) => {
        const appsStore = useAppsStore()
        appsStore.fileExtensions = [
          mock<ApplicationFileExtension>({
            app: 'text-editor',
            extension: 'txt',
            newFileMenu: { menuTitle: vi.fn() }
          })
        ]

        const ids = unref(uploadActions).map(({ id }) => id)
        expect(ids).toContain('com.github.opencloud-eu.web.files.upload-action.new-file.txt')
      }
    })
  })
})

function getWrapper({ setup }: { setup: (instance: ReturnType<typeof useUploadActions>) => void }) {
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: 'files-spaces-generic' })
  })

  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useUploadActions()
        setup(instance)
      },
      { mocks, provide: mocks }
    )
  }
}
