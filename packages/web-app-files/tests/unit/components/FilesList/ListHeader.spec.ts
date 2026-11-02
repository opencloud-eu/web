import ListHeader from '../../../../src/components/FilesList/ListHeader.vue'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { flushPromises } from '@vue/test-utils'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  preloadTextEditor: vi.fn().mockResolvedValue(undefined),
  TextEditorViewer: { name: 'TextEditorViewer', template: '<div />' }
}))

describe('ListHeader', () => {
  it('renders a spinner when loading', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find('oc-spinner-stub').exists()).toBeTruthy()
  })
  it('renders a markdown container when README content is loaded', async () => {
    const { wrapper } = getWrapper()
    await flushPromises()
    expect(wrapper.find('.markdown-container').exists()).toBeTruthy()
  })
  it('gives the README viewer an accessible name', async () => {
    const { wrapper } = getWrapper()
    await flushPromises()
    expect(wrapper.findComponent({ name: 'TextEditorViewer' }).attributes('aria-label')).toBe(
      'README'
    )
  })
  it('reloads the README content when the README file changes', async () => {
    const { wrapper, mocks } = getWrapper()
    await flushPromises()

    mocks.$clientService.webdav.getFileContents.mockResolvedValueOnce({
      body: 'Updated README content'
    })
    await wrapper.setProps({
      readmeFile: mock<Resource>({ id: 'readme-id', path: '/README.md', etag: 'etag-2' })
    })
    await flushPromises()

    expect(mocks.$clientService.webdav.getFileContents).toHaveBeenCalledTimes(2)
    expect(wrapper.findComponent({ name: 'TextEditorViewer' }).attributes('content')).toBe(
      'Updated README content'
    )
  })
  it('keeps the previous README content while reloading', async () => {
    const { wrapper, mocks } = getWrapper()
    await flushPromises()

    let resolveReload: (value: { body: string }) => void
    mocks.$clientService.webdav.getFileContents.mockReturnValueOnce(
      new Promise((resolve) => (resolveReload = resolve))
    )
    await wrapper.setProps({
      readmeFile: mock<Resource>({ id: 'readme-id', path: '/README.md', etag: 'etag-2' })
    })
    await flushPromises()

    expect(wrapper.find('oc-spinner-stub').exists()).toBeFalsy()
    expect(wrapper.findComponent({ name: 'TextEditorViewer' }).attributes('content')).toBe(
      'Sample README content'
    )

    resolveReload({ body: 'Updated README content' })
    await flushPromises()

    expect(wrapper.findComponent({ name: 'TextEditorViewer' }).attributes('content')).toBe(
      'Updated README content'
    )
  })
  it('ignores a stale README response when the README file changed again', async () => {
    const { wrapper, mocks } = getWrapper()
    await flushPromises()

    let resolveStaleResponse: (value: { body: string }) => void
    mocks.$clientService.webdav.getFileContents
      .mockReturnValueOnce(new Promise((resolve) => (resolveStaleResponse = resolve)))
      .mockResolvedValueOnce({ body: 'Latest README content' })
    await wrapper.setProps({
      readmeFile: mock<Resource>({ id: 'readme-id', path: '/README.md', etag: 'etag-2' })
    })
    await wrapper.setProps({
      readmeFile: mock<Resource>({ id: 'readme-id', path: '/README.md', etag: 'etag-3' })
    })
    await flushPromises()
    resolveStaleResponse({ body: 'Stale README content' })
    await flushPromises()

    expect(wrapper.findComponent({ name: 'TextEditorViewer' }).attributes('content')).toBe(
      'Latest README content'
    )
  })
  it('does not reload the README content when the README file did not change', async () => {
    const { wrapper, mocks } = getWrapper()
    await flushPromises()

    await wrapper.setProps({
      space: mock<SpaceResource>(),
      readmeFile: mock<Resource>({
        id: 'readme-id',
        path: '/README.md',
        etag: 'etag-1',
        mdate: 'mdate-1'
      })
    })
    await flushPromises()

    expect(mocks.$clientService.webdav.getFileContents).toHaveBeenCalledTimes(1)
  })
})

function getWrapper() {
  const mocks = {
    ...defaultComponentMocks()
  }

  mocks.$clientService.webdav.getFileContents.mockResolvedValueOnce({
    body: 'Sample README content'
  })

  return {
    mocks,
    wrapper: shallowMount(ListHeader, {
      props: {
        space: mock<SpaceResource>(),
        readmeFile: mock<Resource>({
          id: 'readme-id',
          path: '/README.md',
          etag: 'etag-1',
          mdate: 'mdate-1'
        })
      },
      global: {
        mocks,
        plugins: [...defaultPlugins()],
        provide: mocks
      }
    })
  }
}
