import translationsJson from '../l10n/translations'
import App from './App.vue'

const routes = [
  {
    name: 'draw-io-edit',
    path: '/edit/:filePath',
    components: {
      fullscreen: App
    },
    meta: { hideHeadbar: true }
  }
]

const appInfo = {
  name: 'Draw.io',
  id: 'draw-io',
  icon: 'grid_on',
  extensions: [
    {
      extension: 'drawio',
      newTab: true,
      routeName: 'draw-io-edit',
      newFileMenu: {
        menuTitle($gettext) {
          return $gettext('New draw.io document…')
        }
      },
      routes: [
        'files-list',
        'files-favorites',
        'files-shared-with-others',
        'files-shared-with-me',
        'public-files'
      ]
    },
    {
      extension: 'vsdx',
      newTab: true,
      routeName: 'draw-io-edit'
    }
  ]
}

const translations = translationsJson
export default {
  appInfo,
  routes,
  translations
}
