import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { load, destroyEditors } from './helpers'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

describe('markdown list roundtrip', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  afterEach(() => {
    destroyEditors()
  })

  describe('list items', () => {
    it('parses many lists starting with an empty item in linear time', () => {
      // warm up so one-time editor setup isn't measured
      load('- \n- x\n')

      const start = performance.now()
      load('- \n- x\n# h\n'.repeat(30) + '- \n- x\n\n1. \n2. y\n\n'.repeat(30))

      // takes a few ms, super-linear parsing never finishes. Generous because CI runners are slow
      expect(performance.now() - start).toBeLessThan(3000)
    })
  })
})
