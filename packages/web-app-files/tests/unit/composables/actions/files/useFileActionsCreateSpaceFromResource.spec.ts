import { mock } from 'vitest-mock-extended'
import { unref } from 'vue'
import { FolderResource, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import {
  useCreateSpace,
  useMessages,
  useModals,
  useResourcesStore,
  useSpacesStore
} from '@opencloud-eu/web-pkg'
import { useFileActionsCreateSpaceFromResource } from '../../../../../src/composables/actions/files'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useCreateSpace: vi.fn()
}))

describe('useFileActionsCreateSpaceFromResource', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a success message when the space was created and all files were copied', async () => {
    const resources = [mock<Resource>({ name: 'a.txt' }), mock<Resource>({ name: 'b.txt' })]
    const { confirm, mocks, createdSpace } = getWrapper({ resources })

    await confirm('New space')

    expect(mocks.$clientService.webdav.copyFiles).toHaveBeenCalledTimes(2)
    expect(mocks.$clientService.webdav.copyFiles).toHaveBeenCalledWith(
      expect.anything(),
      resources[0],
      createdSpace,
      { path: 'a.txt' }
    )
    const { showMessage, showErrorMessage } = useMessages()
    expect(showMessage).toHaveBeenCalledWith({ title: 'Space was created successfully' })
    expect(showErrorMessage).not.toHaveBeenCalled()
    const { resetSelection } = useResourcesStore()
    expect(resetSelection).toHaveBeenCalled()
  })

  it('reports a failed creation when the space could not be created', async () => {
    const error = new Error('create failed')
    const resources = [mock<Resource>({ name: 'a.txt' })]
    const { confirm, mocks } = getWrapper({ resources, createSpaceError: error })

    await confirm('New space')

    expect(mocks.$clientService.webdav.copyFiles).not.toHaveBeenCalled()
    const { upsertSpace } = useSpacesStore()
    expect(upsertSpace).not.toHaveBeenCalled()
    const { showMessage, showErrorMessage } = useMessages()
    expect(showMessage).not.toHaveBeenCalled()
    expect(showErrorMessage).toHaveBeenCalledWith({
      title: 'Creating space failed…',
      errors: [error]
    })
    const { resetSelection } = useResourcesStore()
    expect(resetSelection).not.toHaveBeenCalled()
  })

  it('reports the created space with all copy errors when only some files could not be copied', async () => {
    const resources = [
      mock<Resource>({ name: 'a.txt' }),
      mock<Resource>({ name: 'b.txt' }),
      mock<Resource>({ name: 'c.txt' })
    ]
    const errorB = new Error('copy b failed')
    const errorC = Object.assign(new Error('copy c failed'), { statusCode: 425 })
    const { confirm, mocks, createdSpace } = getWrapper({
      resources,
      copyErrors: { 'b.txt': errorB, 'c.txt': errorC }
    })

    await confirm('New space')

    expect(mocks.$clientService.webdav.copyFiles).toHaveBeenCalledTimes(3)
    const { upsertSpace } = useSpacesStore()
    expect(upsertSpace).toHaveBeenCalledWith(createdSpace)
    const { showMessage, showErrorMessage } = useMessages()
    expect(showMessage).not.toHaveBeenCalled()
    expect(showErrorMessage).toHaveBeenCalledWith({
      title: 'Space was created',
      desc: 'Not all files could be copied.',
      status: 'warning',
      errors: [errorB, errorC]
    })
    const { resetSelection } = useResourcesStore()
    expect(resetSelection).toHaveBeenCalled()
  })

  it('copies the content of a single selected folder to the space root', async () => {
    const folder = mock<FolderResource>({ name: 'folder', path: '/folder', isFolder: true })
    const children = [mock<Resource>({ name: 'a.txt' }), mock<Resource>({ name: 'b.txt' })]
    const { confirm, mocks, space, createdSpace } = getWrapper({
      resources: [folder],
      folderChildren: children
    })

    await confirm('New space')

    expect(mocks.$clientService.webdav.listFiles).toHaveBeenCalledWith(space, { path: '/folder' })
    expect(mocks.$clientService.webdav.copyFiles).toHaveBeenCalledTimes(2)
    expect(mocks.$clientService.webdav.copyFiles).toHaveBeenCalledWith(
      space,
      children[0],
      createdSpace,
      { path: 'a.txt' }
    )
    expect(mocks.$clientService.webdav.copyFiles).toHaveBeenCalledWith(
      space,
      children[1],
      createdSpace,
      { path: 'b.txt' }
    )
    const { showMessage } = useMessages()
    expect(showMessage).toHaveBeenCalledWith({ title: 'Space was created successfully' })
  })

  it('does not create the space when the content of a single selected folder could not be listed', async () => {
    const error = new Error('list failed')
    const resources = [mock<FolderResource>({ name: 'folder', path: '/folder', isFolder: true })]
    const { confirm, mocks, createSpace } = getWrapper({ resources, listFilesError: error })

    await confirm('New space')

    expect(createSpace).not.toHaveBeenCalled()
    expect(mocks.$clientService.webdav.copyFiles).not.toHaveBeenCalled()
    const { showMessage, showErrorMessage } = useMessages()
    expect(showMessage).not.toHaveBeenCalled()
    expect(showErrorMessage).toHaveBeenCalledWith({
      title: 'Creating space failed…',
      errors: [error]
    })
  })
})

function getWrapper({
  resources,
  createSpaceError,
  copyErrors = {},
  folderChildren = [],
  listFilesError
}: {
  resources: Resource[]
  createSpaceError?: Error
  copyErrors?: Record<string, Error>
  folderChildren?: Resource[]
  listFilesError?: Error
}) {
  const space = mock<SpaceResource>({ id: 'personal', driveType: 'personal' })
  const createdSpace = mock<SpaceResource>({ id: 'new-space' })
  const createSpace = vi.fn()
  if (createSpaceError) {
    createSpace.mockRejectedValue(createSpaceError)
  } else {
    createSpace.mockResolvedValue(createdSpace)
  }
  vi.mocked(useCreateSpace).mockReturnValue(
    mock<ReturnType<typeof useCreateSpace>>({ createSpace })
  )

  const mocks = defaultComponentMocks()
  mocks.$clientService.webdav.copyFiles.mockImplementation(
    (_space, _resource, _target, { path }) => {
      const error = copyErrors[path]
      return error ? Promise.reject(error) : Promise.resolve(undefined)
    }
  )
  if (listFilesError) {
    mocks.$clientService.webdav.listFiles.mockRejectedValue(listFilesError)
  } else {
    mocks.$clientService.webdav.listFiles.mockResolvedValue(
      mock<Awaited<ReturnType<typeof mocks.$clientService.webdav.listFiles>>>({
        children: folderChildren
      })
    )
  }

  let instance: ReturnType<typeof useFileActionsCreateSpaceFromResource>
  getComposableWrapper(
    () => {
      instance = useFileActionsCreateSpaceFromResource()
    },
    { mocks, provide: mocks }
  )

  async function confirm(spaceName: string) {
    unref(instance.actions)[0].handler({ space, resources })
    const { dispatchModal } = useModals()
    const { onConfirm } = vi.mocked(dispatchModal).mock.calls[0][0]
    await onConfirm(spaceName)
  }

  return { confirm, mocks, space, createdSpace, createSpace }
}
