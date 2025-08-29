import './tailwind.css'
import DefaultTheme from 'vitepress/theme-without-fonts'
import './../../../src/styles/layers.css'
import { createGettext } from 'vue3-gettext'
import * as components from './../../../src/components'
import * as directives from './../../../src/directives'
import './custom.scss'
import LiveCodeBlock from '../components/LiveCodeBlock.vue'
import ComponentApi from '../components/ComponentApi.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    const gettext = createGettext()
    app.use(gettext)

    app.component('LiveCodeBlock', LiveCodeBlock)
    app.component('ComponentApi', ComponentApi)
    Object.values(components).forEach((c) => app.component(c.__name, c))
    Object.values(directives).forEach((d) => app.directive(d.name, d))
  }
}
