import CreateShortcutModal from '../../../src/components/CreateShortcutModal.vue'
import ShortcutTargetInput from '../../../src/components/ShortcutTargetInput.vue'
import { OcTextInput } from '@opencloud-eu/design-system/components'
import {
  defaultComponentMocks,
  defaultPlugins,
  RouteLocation,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { FileResource, SpaceResource } from '@opencloud-eu/web-client'
import { mock } from 'vitest-mock-extended'
import { useMessages, useResourcesStore } from '../../../src/composables/piniaStores'

describe('CreateShortcutModal', () => {
  it('disables confirmation initially', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.emitted('update:confirmDisabled')).toEqual([[true]])
  })

  it.each([
    { url: '  example.org  ', name: 'example.org' },
    { url: 'https://example.org/path?q=value#fragment', name: 'example.org' },
    { url: 'localhost:8080/foo', name: 'localhost:8080' }
  ])('suggests the hostname as the name for "$url"', async ({ url, name }) => {
    const { input, filename } = getWrapper()
    await input(url)
    expect(filename.props('modelValue')).toBe(name)
  })

  it('avoids filename errors while typing a protocol and autofills once a host is entered', async () => {
    const { wrapper, input, filename } = getWrapper()
    const url = 'https://example.org/path?q=value'
    for (let length = 1; length <= url.length; length++) {
      await input(url.slice(0, length))
      expect(filename.props('errorMessage')).toBe('')
      expect(filename.props('modelValue')).not.toContain('/')
      if (url.slice(0, length) === 'https:/') {
        expect(filename.props('modelValue')).toBe('')
        expect(wrapper.emitted('update:confirmDisabled').at(-1)).toEqual([true])
      }
    }
    expect(filename.props('modelValue')).toBe('example.org')
    expect(wrapper.emitted('update:confirmDisabled').at(-1)).toEqual([false])
  })

  it('resolves duplicate names for typed URLs without selecting a suggestion', async () => {
    const { input, filename } = getWrapper({ names: ['example.org.url', 'example.org (1).url'] })
    await input('https://example.org/path')
    expect(filename.props('modelValue')).toBe('example.org (2)')
  })

  it('clears an automatic name when the URL is cleared', async () => {
    const { wrapper, input, filename } = getWrapper()
    await input('https://example.org')
    await input('')
    expect(filename.props('modelValue')).toBe('')
    expect(wrapper.emitted('update:confirmDisabled').at(-1)).toEqual([true])
  })

  it('preserves a custom name when editing the URL or selecting another target', async () => {
    const { wrapper, input, rename, target, filename } = getWrapper()
    await input('https://example.org')
    await rename('My shortcut')
    await input('https://another.example/path')
    expect(filename.props('modelValue')).toBe('My shortcut')
    target.vm.$emit('select', 'https://example.org/f/resource-id', 'report.pdf')
    await wrapper.vm.$nextTick()
    expect(filename.props('modelValue')).toBe('My shortcut')
  })

  it('keeps an intentionally cleared name visible and requires the user to fill it', async () => {
    const { wrapper, input, rename, target, filename } = getWrapper()
    await input('https://example.org')
    await rename('')
    await input('https://another.example/path')
    target.vm.$emit('select', 'https://example.org/', 'example.org')
    await wrapper.vm.$nextTick()
    expect(filename.props('modelValue')).toBe('')
    expect(filename.isVisible()).toBe(true)
    expect(wrapper.emitted('update:confirmDisabled').at(-1)).toEqual([true])
  })

  it.each(['example.org', 'localhost:8080/foo', 'http://example.org'])(
    'enables confirmation for "%s" with a valid name',
    async (url) => {
      const { wrapper, input, rename } = getWrapper()
      await input(url)
      await rename('shortcut')
      expect(wrapper.emitted('update:confirmDisabled').at(-1)).toEqual([false])
    }
  )

  it.each(['', 'invalid/name', 'invalid\\name'])(
    'prevents saving with the invalid filename "%s"',
    async (name) => {
      const { wrapper, mocks, input, rename } = getWrapper()
      await input('example.org')
      await rename(name)
      await wrapper.vm.onConfirm()
      expect(wrapper.emitted('update:confirmDisabled').at(-1)).toEqual([true])
      expect(mocks.$clientService.webdav.putFileContents).not.toHaveBeenCalled()
    }
  )

  it('shows filename errors and rejects manually entered duplicate names', async () => {
    const { wrapper, input, rename, filename } = getWrapper({ names: ['existing.url'] })
    await input('example.org')
    await rename('invalid\\name')
    expect(filename.props('errorMessage')).toBe('The name cannot contain "\\"')
    await rename('existing')
    expect(filename.props('errorMessage')).toBe('The name »existing.url« is already taken')
    expect(wrapper.emitted('update:confirmDisabled').at(-1)).toEqual([true])
  })

  it.each(['example.org', 'report.pdf'])(
    'resolves duplicate names when selecting "%s"',
    async (name) => {
      const { wrapper, target, filename } = getWrapper({
        names: [`${name}.url`, `${name} (1).url`]
      })
      target.vm.$emit('select', 'https://example.org/', name)
      await wrapper.vm.$nextTick()
      expect(filename.props('modelValue')).toBe(`${name} (2)`)
      expect(target.props('modelValue')).toBe('https://example.org/')
      expect(wrapper.emitted('update:confirmDisabled').at(-1)).toEqual([false])
    }
  )

  it('keeps an available selected name unchanged and allows renaming it', async () => {
    const { wrapper, target, filename, rename, mocks } = getWrapper()
    target.vm.$emit('select', 'https://example.org/', 'example.org')
    await wrapper.vm.$nextTick()
    expect(filename.props('modelValue')).toBe('example.org')
    await rename('custom name')
    await wrapper.vm.onConfirm()
    expect(mocks.$clientService.webdav.putFileContents).toHaveBeenCalledWith(expect.anything(), {
      path: '/folder/custom name.url',
      content: '[InternetShortcut]\nURL=https://example.org/'
    })
  })

  describe('saving', () => {
    it('stores a normalized URL without HTML escaping', async () => {
      const { wrapper, mocks, input, rename } = getWrapper()
      await input('https://example.com/search?q=x<2&lang=de#<b>')
      await rename('shortcut')
      await wrapper.vm.onConfirm()
      expect(mocks.$clientService.webdav.putFileContents).toHaveBeenCalledWith(expect.anything(), {
        path: '/folder/shortcut.url',
        content: '[InternetShortcut]\nURL=https://example.com/search?q=x%3C2&lang=de#%3Cb%3E'
      })
    })

    it.each(['HTTPS://example.com', 'Https://example.com'])(
      'stores "%s" without adding a second protocol',
      async (url) => {
        const { wrapper, mocks, input, rename } = getWrapper()
        await input(url)
        await rename('shortcut')
        await wrapper.vm.onConfirm()
        expect(mocks.$clientService.webdav.putFileContents).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ content: '[InternetShortcut]\nURL=https://example.com/' })
        )
      }
    )

    it.each([
      'javascript:alert(1)',
      'java\nscript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'file:///etc/passwd'
    ])('does not create a shortcut for the unsafe URL "%s"', async (url) => {
      const { wrapper, mocks, input, rename } = getWrapper()
      await input(url)
      await rename('shortcut')
      await wrapper.vm.onConfirm()
      expect(wrapper.emitted('update:confirmDisabled').at(-1)).toEqual([true])
      expect(mocks.$clientService.webdav.putFileContents).not.toHaveBeenCalled()
    })

    it.each(['\n', '\r\n', '\u2028', '\u2029'])(
      'stores only one URL entry when the input contains a line separator',
      async (separator) => {
        const { wrapper, mocks, input, rename } = getWrapper()
        await input(`https://example.org/${separator}URL=javascript:alert(1)`)
        await rename('shortcut')
        await wrapper.vm.onConfirm()
        const content = mocks.$clientService.webdav.putFileContents.mock.calls[0][1].content
        expect(content).toMatch(
          /^\[InternetShortcut\]\nURL=https:\/\/example\.org\/[^\r\n\u2028\u2029]+$/
        )
      }
    )

    it('updates the file list and shows a success message', async () => {
      const { wrapper, input } = getWrapper()
      await input('example.org')
      await wrapper.vm.onConfirm()
      expect(useResourcesStore().upsertResource).toHaveBeenCalled()
      expect(useMessages().showMessage).toHaveBeenCalledWith({
        title: 'Shortcut was created successfully'
      })
    })

    it('shows an error when saving fails', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { wrapper, input, mocks } = getWrapper()
      const error = new Error('Upload failed')
      mocks.$clientService.webdav.putFileContents.mockRejectedValue(error)
      await input('example.org')
      await wrapper.vm.onConfirm()
      expect(useResourcesStore().upsertResource).not.toHaveBeenCalled()
      expect(useMessages().showErrorMessage).toHaveBeenCalledWith({
        title: 'Failed to create shortcut',
        errors: [error]
      })
      consoleError.mockRestore()
    })
  })
})

function getWrapper({ names = [] }: { names?: string[] } = {}) {
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: 'files-spaces-generic' })
  })
  mocks.$clientService.webdav.putFileContents.mockResolvedValue(mock<FileResource>())
  const wrapper = shallowMount(CreateShortcutModal, {
    props: { space: mock<SpaceResource>(), modal: undefined },
    global: {
      plugins: defaultPlugins({
        piniaOptions: {
          resourcesStore: {
            currentFolder: mock<FileResource>({ path: '/folder' }),
            resources: names.map((name) => mock<FileResource>({ name, path: `/folder/${name}` }))
          }
        }
      }),
      mocks,
      provide: mocks
    }
  })
  const target = wrapper.getComponent(ShortcutTargetInput)
  const filename = wrapper.getComponent(OcTextInput)

  async function input(value: string) {
    target.vm.$emit('update:modelValue', value)
    await wrapper.vm.$nextTick()
  }

  async function rename(value: string) {
    filename.vm.$emit('update:modelValue', value)
    await wrapper.vm.$nextTick()
  }

  return { wrapper, mocks, target, filename, input, rename }
}
