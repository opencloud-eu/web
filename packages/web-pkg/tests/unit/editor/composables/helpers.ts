import { createApp, defineComponent, h } from 'vue'

export function withSetup<T>(composable: () => T): { result: T } {
  let result!: T
  const app = createApp(
    defineComponent({
      setup() {
        result = composable()
        return () => h('div')
      }
    })
  )
  app.mount(document.createElement('div'))
  return { result }
}
