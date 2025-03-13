import { createApp, defineComponent } from 'vue'
import DesignSystem from './index'

const options = {
  tokens: {
    breakpoints: {
      'xsmall-max': '50px'
    },
    roles: {
      primary: '#715289',
      onPrimary: '#FFFFFF',
      surfaceContainer: '#dadada',
      onSurface: '#000000'
    },
    fontSizes: {
      default: '1.358rem'
    },
    sizes: {
      'icon-default': '12pt'
    },
    spacing: {
      small: '20px'
    }
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

    expect(document.documentElement.style.getPropertyValue('--oc-breakpoint-xsmall-max')).toMatch(
      '50px'
    )
    expect(document.documentElement.style.getPropertyValue('--oc-font-size-default')).toMatch(
      '1.358rem'
    )
    expect(document.documentElement.style.getPropertyValue('--oc-size-icon-default')).toMatch(
      '12pt'
    )
    expect(document.documentElement.style.getPropertyValue('--oc-space-small')).toMatch('20px')
  })
})
