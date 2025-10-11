import DesignSystem from '@opencloud-eu/design-system'
import { createGettext } from 'vue3-gettext'
import { App, Plugin, defineComponent, h } from 'vue'
import { abilitiesPlugin } from '@casl/vue'
import { createMongoAbility } from '@casl/ability'
import { AbilityRule } from '@opencloud-eu/web-client'
import { PiniaMockOptions, createMockStore } from './mocks'

export interface DefaultPluginsOptions {
  abilities?: AbilityRule[]
  designSystem?: boolean
  gettext?: boolean
  pinia?: boolean
  piniaOptions?: PiniaMockOptions
}

export const defaultPlugins = ({
  abilities = [],
  designSystem = true,
  gettext = true,
  pinia = true,
  piniaOptions = {}
}: DefaultPluginsOptions = {}): Plugin[] => {
  const plugins: Plugin[] = []

  plugins.push({
    install(app: App) {
      app.use(abilitiesPlugin, createMongoAbility(abilities))
    }
  })

  if (designSystem) {
    plugins.push(DesignSystem as unknown as Plugin)
  }

  if (gettext) {
    plugins.push(createGettext({ translations: {}, silent: true }))
  } else {
    plugins.push({
      install(app: App) {
        // mock `v-translate` directive
        app.directive('translate', {
          mounted: () => undefined
        })
      }
    })
  }

  if (pinia) {
    plugins.push(createMockStore(piniaOptions))
  }

  plugins.push({
    install(app: App) {
      app.component(
        'RouterLink',
        defineComponent({
          name: 'RouterLink',
          props: {
            tag: { type: String, default: 'a' },
            to: { type: [String, Object], default: '' }
          },
          setup(props) {
            const to = props.to
            let path: string

            if (!!to && typeof to !== 'string') {
              path = to.path || to.name

              if (to.params) {
                path += '/' + Object.values(to.params).join('/')
              }

              if (to.query) {
                path += '?' + Object.values(to.query).join('&')
              }
            }

            return () => h(props.tag, { attrs: { href: path || to } })
          }
        })
      )
    }
  } as Plugin)

  return plugins
}
