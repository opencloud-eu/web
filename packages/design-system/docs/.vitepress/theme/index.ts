import './tailwind.css'
import DefaultTheme from 'vitepress/theme-without-fonts'
import PortalVue from 'portal-vue'
import './../../../src/styles/layers.css'
import { createGettext } from 'vue3-gettext'
import { createPinia } from 'pinia'
import * as components from './../../../src/components'
import * as directives from './../../../src/directives'
import './custom.scss'
import LiveCodeBlock from '../components/LiveCodeBlock.vue'
import ComponentApi from '../components/ComponentApi.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    const gettext = createGettext()
    const pinia = createPinia()
    app.use(gettext)
    app.use(pinia)
    app.use(PortalVue)

    app.component('LiveCodeBlock', LiveCodeBlock)
    app.component('ComponentApi', ComponentApi)
    Object.values(components).forEach((c) => app.component(c.__name, c))
    Object.values(directives).forEach((d) => app.directive(d.name, d))
  }
}
