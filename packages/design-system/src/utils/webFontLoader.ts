/**
 * Web Font Loader takes care of OpenCloud Design System’s font loading.
 * For full documentation, see: https://github.com/typekit/webfontloader
 */

// @ts-ignore
import WebFont from 'webfontloader'

WebFont.load({
  custom: {
    families: ['OpenCloud', 'Inter'],
    urls: ['/fonts/opencloud.css', 'fonts/inter.css']
  }
})
