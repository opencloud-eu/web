import App from '../../src/App.vue'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { flushPromises } from '@vue/test-utils'
import { mockDeep } from 'vitest-mock-extended'
import { ClientService } from '@opencloud-eu/web-pkg'

type Font = { file: string; family: string }

type AppVm = {
  previewUrls: Record<string, string>
  loadPreviewsTask: { perform: (fonts: Font[]) => Promise<void>; last: Promise<unknown> }
  deleteFont: (font: Font) => Promise<void>
}

const font = (file: string): Font => ({ file, family: file.replace(/\.[^.]+$/, '') })

describe('App', () => {
  beforeEach(() => {
    // the font list is delayed by a timer to prevent flickering
    vi.useFakeTimers()
    let created = 0
    global.URL.createObjectURL = vi.fn(() => `blob:${++created}`)
    global.URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads a preview per font and encodes the file name', async () => {
    const { vm, clientService } = getWrapper([font('regular.ttf'), font('weird#name.ttf')])

    await vi.advanceTimersByTimeAsync(500)
    await vm.loadPreviewsTask.last

    expect(clientService.httpAuthenticated.get).toHaveBeenCalledWith(
      '/collaboration/fonts/preview/regular.ttf',
      expect.anything()
    )
    expect(clientService.httpAuthenticated.get).toHaveBeenCalledWith(
      '/collaboration/fonts/preview/weird%23name.ttf',
      expect.anything()
    )
    expect(Object.keys(vm.previewUrls)).toEqual(['regular.ttf', 'weird#name.ttf'])
  })

  it('keeps the previews of the other fonts when one preview fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { vm, clientService } = getWrapper([font('ok.ttf'), font('broken.ttf')])
    clientService.httpAuthenticated.get.mockImplementation(((url: string) => {
      if (url.includes('broken.ttf')) {
        return Promise.reject(new Error('boom'))
      }
      return Promise.resolve({ data: new Blob() })
    }) as never)

    await vm.loadPreviewsTask.perform([font('ok.ttf'), font('broken.ttf')])

    expect(Object.keys(vm.previewUrls)).toEqual(['ok.ttf'])
  })

  it('discards the result of a superseded run', async () => {
    const { vm, clientService } = getWrapper([])
    let resolveOutdated: (value: unknown) => void
    clientService.httpAuthenticated.get.mockImplementation(((url: string) => {
      if (url.includes('outdated.ttf')) {
        return new Promise((resolve) => (resolveOutdated = resolve))
      }
      return Promise.resolve({ data: new Blob() })
    }) as never)

    vm.loadPreviewsTask.perform([font('outdated.ttf')])
    await vm.loadPreviewsTask.perform([font('current.ttf')])

    resolveOutdated({ data: new Blob() })
    await flushPromises()

    expect(Object.keys(vm.previewUrls)).toEqual(['current.ttf'])
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
  })

  it('revokes the object URLs on a new run and on unmount', async () => {
    const { vm, wrapper } = getWrapper([])

    await vm.loadPreviewsTask.perform([font('first.ttf')])
    await vm.loadPreviewsTask.perform([font('second.ttf')])

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1')

    wrapper.unmount()

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:2')
  })

  it('encodes the file name when deleting a font', async () => {
    const { vm, clientService } = getWrapper([])

    const deleted = vm.deleteFont(font('weird#name.ttf'))
    await flushPromises()

    expect(clientService.httpAuthenticated.delete).toHaveBeenCalledWith(
      '/collaboration/fonts/manage/weird%23name.ttf'
    )

    // the font list refresh is delayed by the anti-flicker timer
    await vi.advanceTimersByTimeAsync(500)
    await deleted
  })
})

function getWrapper(fonts: Font[]) {
  const clientService = mockDeep<ClientService>()
  clientService.httpAuthenticated.get.mockImplementation(((url: string) => {
    if (url === '/collaboration/fonts') {
      return Promise.resolve({ data: { fonts } })
    }
    return Promise.resolve({ data: new Blob() })
  }) as never)

  const mocks = { ...defaultComponentMocks(), $clientService: clientService }

  const wrapper = shallowMount(App, {
    global: {
      plugins: [...defaultPlugins()],
      mocks,
      provide: mocks
    }
  })

  return { clientService, wrapper, vm: wrapper.vm as unknown as AppVm }
}
