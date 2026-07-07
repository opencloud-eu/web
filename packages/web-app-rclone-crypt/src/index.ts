import { useGettext } from 'vue3-gettext'
import { ref } from 'vue'
import { ApplicationInformation, defineWebApplication, Extension } from '@opencloud-eu/web-pkg'
import translations from '../l10n/translations.json'
import { folderVaultExtension } from './extensions/folderVault'
import UnlockVault from './views/UnlockVault.vue'

export default defineWebApplication({
  setup() {
    const { $gettext } = useGettext()

    const appId = 'rclone-crypt'

    const appInfo: ApplicationInformation = {
      name: $gettext('Rclone Crypt'),
      id: appId,
      icon: 'folder-lock',
      iconFillType: 'line',
      color: 'var(--oc-role-secondary)',
      extensions: [
        {
          extension: 'vault',
          type: 'folder',
          icon: 'resource-type-vault',
          iconFillType: 'fill',
          newFileMenu: {
            menuTitle() {
              return $gettext('Vault')
            },
            defaultName() {
              return $gettext('New vault')
            }
          }
        }
      ]
    }

    const extensions = ref<Extension[]>([folderVaultExtension])

    const routes = [
      {
        name: 'rclone-crypt-unlock',
        // App routes are mounted under `/<appId>/`, so this resolves to
        // `/rclone-crypt/unlock`.
        path: '/unlock',
        component: UnlockVault,
        meta: {
          // hybrid so the same route works inside public links - the runtime's
          // public-link auth guard runs first and prompts for the link
          // password before we get to the vault passphrase.
          authContext: 'hybrid',
          title: $gettext('Unlock vault')
        }
      }
    ]

    return {
      appInfo,
      translations,
      extensions,
      routes
    }
  }
})
