import { CompilerOptions } from '@vue/compiler-sfc'

export const compilerOptions: CompilerOptions = {
  whitespace: 'preserve'
}

/** probe images of the preview app, vite doesn't know these as assets */
export const assetsInclude = ['**/*.heic', '**/*.tif']
