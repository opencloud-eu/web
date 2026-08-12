import { flushPromises } from '@vue/test-utils'
import { mock } from 'vitest-mock-extended'
import { FolderVaultEngine, useFolderVaultStore } from '@opencloud-eu/web-pkg'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import UnlockVault from '../../../src/views/UnlockVault.vue'
import { probeVaultNeedsSetup, unlockVault } from '../../../src/unlock'

vi.mock('../../../src/unlock', () => ({
  probeVaultNeedsSetup: vi.fn(),
  unlockVault: vi.fn()
}))

const spaceId = 'space-1'
const vaultRoot = '/my.vault'
const passphrase = 'foobar'

type Space = { id: string; driveType?: string; driveAlias?: string; name?: string }

function mountUnlockVault({
  needsSetup = false,
  spaces = [{ id: spaceId, driveType: 'personal', driveAlias: 'personal/admin', name: 'Admin' }],
  query = { spaceId, vaultRoot }
}: { needsSetup?: boolean; spaces?: Space[]; query?: Record<string, string> } = {}) {
  vi.mocked(probeVaultNeedsSetup).mockResolvedValue(needsSetup)
  vi.mocked(unlockVault).mockResolvedValue({
    status: 'unlocked',
    engine: mock<FolderVaultEngine>()
  })

  const mocks = defaultComponentMocks({
    currentRoute: { query, path: '/', meta: {} } as never
  })

  const wrapper = shallowMount(UnlockVault, {
    global: {
      plugins: [
        ...defaultPlugins({
          piniaOptions: { spacesState: { spaces: spaces as never } }
        })
      ],
      mocks,
      provide: mocks,
      stubs: { OcCard: false }
    }
  })

  return { wrapper, mocks, vaultStore: useFolderVaultStore() }
}

type Wrapper = ReturnType<typeof mountUnlockVault>

/** Mount and let the onMounted probe settle so `needsSetup` reflects the server. */
async function mountProbed(options?: Parameters<typeof mountUnlockVault>[0]) {
  const result = mountUnlockVault(options)
  await flushPromises()
  return result
}

async function submit(wrapper: Wrapper['wrapper'], password = passphrase) {
  const vm = wrapper.vm as any
  vm.password = password
  await vm.onSubmit()
}

describe('UnlockVault', () => {
  describe('wording', () => {
    it('asks to set up a vault that has no passphrase committed yet', async () => {
      const { wrapper } = await mountProbed({ needsSetup: true })
      const vm = wrapper.vm as any

      expect(vm.needsSetup).toBe(true)
      expect(vm.cardTitle).toBe('Set up encrypted folder')
      expect(vm.submitLabel).toBe('Set password')
    })

    it('asks to unlock a vault whose passphrase is already committed', async () => {
      const { wrapper } = await mountProbed()
      const vm = wrapper.vm as any

      expect(vm.needsSetup).toBe(false)
      expect(vm.cardTitle).toBe('Unlock folder')
      expect(vm.submitLabel).toBe('Unlock')
    })

    it('falls back to unlock wording when the vault cannot be probed', async () => {
      vi.mocked(probeVaultNeedsSetup).mockRejectedValue(new Error('network'))
      const { wrapper } = await mountProbed()

      expect((wrapper.vm as any).needsSetup).toBe(false)
    })

    it('does not probe a vault it cannot address', async () => {
      const { wrapper } = await mountProbed({ spaces: [] })

      expect(probeVaultNeedsSetup).not.toHaveBeenCalled()
      expect(wrapper.find('no-content-message-stub').exists()).toBe(true)
    })

    it('shows neither panel until the probe answered', async () => {
      const { wrapper } = mountUnlockVault({ needsSetup: true })

      expect(wrapper.find('oc-spinner-stub').exists()).toBe(true)
      expect(wrapper.find('form').exists()).toBe(false)

      await flushPromises()

      expect(wrapper.find('oc-spinner-stub').exists()).toBe(false)
      expect(wrapper.find('vault-setup-stub').exists()).toBe(true)
    })

    it('shows the cleartext folder name rather than the whole path', async () => {
      const { wrapper } = await mountProbed({
        query: { spaceId, vaultRoot: '/some/where/my.vault' }
      })

      expect((wrapper.vm as any).vaultName).toBe('my.vault')
    })
  })

  describe('submitting', () => {
    it('stashes the engine for the session and leaves the unlock page', async () => {
      const { wrapper, mocks, vaultStore } = await mountProbed()
      await submit(wrapper)

      expect((wrapper.vm as any).errorMessage).toBeNull()
      expect(vaultStore.setEngine).toHaveBeenCalledWith(spaceId, vaultRoot, expect.anything())
      expect(mocks.$router.push).toHaveBeenCalledWith(`/files/spaces${vaultRoot}`)
    })

    it('returns to where the user was sent from', async () => {
      const redirectUrl = '/files/spaces/personal/admin/my.vault/sub'
      const { wrapper, mocks } = await mountProbed({ query: { spaceId, vaultRoot, redirectUrl } })
      await submit(wrapper)

      expect(mocks.$router.push).toHaveBeenCalledWith(redirectUrl)
    })

    it('blames the passphrase only when it is cryptographically ruled out', async () => {
      const { wrapper, mocks, vaultStore } = await mountProbed()
      vi.mocked(unlockVault).mockResolvedValue({ status: 'wrong-passphrase' })
      await submit(wrapper)

      expect((wrapper.vm as any).errorMessage).toBe('Incorrect password.')
      expect(vaultStore.setEngine).not.toHaveBeenCalled()
      expect(mocks.$router.push).not.toHaveBeenCalled()
    })

    it('offers a retry when unlocking fails for any other reason', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { wrapper, mocks, vaultStore } = await mountProbed()
      vi.mocked(unlockVault).mockRejectedValue(new Error('network'))
      await submit(wrapper)

      expect((wrapper.vm as any).errorMessage).toBe('Unlocking failed. Please try again')
      expect(vaultStore.setEngine).not.toHaveBeenCalled()
      expect(mocks.$router.push).not.toHaveBeenCalled()
    })

    it('keeps the submit button disabled until a password is entered', async () => {
      const { wrapper } = await mountProbed()
      const vm = wrapper.vm as any

      expect(vm.submitDisabled).toBe(true)

      vm.password = passphrase
      await flushPromises()
      expect(vm.submitDisabled).toBe(false)
    })
  })

  describe('cancelling', () => {
    it('lands the user in the folder above the vault', async () => {
      // Not inside the vault itself - clicking it would just kick them back here.
      const { wrapper, mocks } = await mountProbed({
        query: { spaceId, vaultRoot: '/some/where/my.vault' }
      })
      await (wrapper.vm as any).onCancel()

      expect(mocks.$router.push).toHaveBeenCalledWith({
        path: '/files/spaces/personal/admin/some/where'
      })
    })

    it('keeps the share id when leaving a shared vault', async () => {
      const { wrapper, mocks } = await mountProbed({
        spaces: [{ id: spaceId, driveType: 'share', driveAlias: 'shares/my.vault' }],
        query: { spaceId, vaultRoot: '/sub/my.vault' }
      })
      await (wrapper.vm as any).onCancel()

      expect(mocks.$router.push).toHaveBeenCalledWith({
        path: '/files/spaces/shares/my.vault/sub',
        query: { shareId: spaceId }
      })
    })

    it('falls back to the shares overview for a directly shared vault', async () => {
      // A share space whose root *is* the vault has no parent folder to return to.
      const { wrapper, mocks } = await mountProbed({
        spaces: [{ id: spaceId, driveType: 'share', driveAlias: 'shares/my.vault' }],
        query: { spaceId, vaultRoot: '/' }
      })
      await (wrapper.vm as any).onCancel()

      expect(mocks.$router.push).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'files-shares-with-me' })
      )
    })

    it('falls back to the personal space when the space is unknown', async () => {
      const { wrapper, mocks } = await mountProbed({ spaces: [] })
      await (wrapper.vm as any).onCancel()

      expect(mocks.$router.push).toHaveBeenCalledWith('/files/spaces/personal')
    })
  })
})
