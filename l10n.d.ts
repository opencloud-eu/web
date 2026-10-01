// virtual modules served by dev/vite-plugins/l10nChunks.ts
// only the loader maps (virtual:l10n/<pkg>) are meant to be imported, the per-language modules
// (virtual:l10n/<pkg>/<lang>) are internal to the generated loaders.
// the type mirrors ApplicationTranslationLoaders from web-pkg.
declare module 'virtual:l10n/*' {
  const loaders: Record<string, () => Promise<Record<string, string | string[]>>>
  export default loaders
}
