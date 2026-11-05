import AppTitle from '../../../src/components/AppTitle.vue'
import { mount, RouterLinkStub } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { App } from '../../../src/types'

describe('AppTitle.vue', () => {
  it('shows the full app name as title on the link that covers the item', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.findComponent(RouterLinkStub).attributes('title')).toBe(
      'An app with a very long name'
    )
  })
})

function getWrapper() {
  const app = {
    ...mock<App>({}),
    id: 'app',
    name: 'An app with a very long name',
    mostRecentVersion: { version: '1.0.0' }
  } as App

  return {
    wrapper: mount(AppTitle, {
      props: { app },
      global: { stubs: { RouterLink: RouterLinkStub } }
    })
  }
}
