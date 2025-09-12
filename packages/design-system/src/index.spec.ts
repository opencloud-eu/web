import { createApp, defineComponent } from 'vue'
import DesignSystem from './index'
import { InstallOptions } from './helpers'

const options: InstallOptions = {
  tokens: {
    roles: {
      primary: '#715289',
      onPrimary: '#FFFFFF',
      surfaceContainer: '#dadada',
      onSurface: '#000000'
    },
    fontFamily: 'Arial, sans-serif'
  }
}

describe('Depending on what gets passed into the theming options', () => {
  it('Sets correct custom CSS props from theming options', () => {
    const app = createApp(
      defineComponent({
        template: '<div/>'
      })
    )
    app.config.compilerOptions.whitespace = 'preserve'
    app.use(DesignSystem, options)
    app.mount('body')

    const docStyle = document.documentElement.style
    const { primary, onPrimary } = options.tokens.roles
    expect(docStyle.getPropertyValue('--oc-role-primary')).toMatch(primary)
    expect(docStyle.getPropertyValue('--oc-role-on-primary')).toMatch(onPrimary)
    expect(docStyle.getPropertyValue('--oc-font-family')).toMatch(options.tokens.fontFamily)
  })
})
