export function RenderPlugin(md, options = {}) {
  const defaultImage = md.renderer.rules.image

  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const src = tokens[idx].attrGet('src')

    if (!src.startsWith('data')) {
      tokens[idx].attrSet('src', 'https://host.docker.internal:9200/images/default-space-icon.png')
    }

    return defaultImage
      ? defaultImage(tokens, idx, options, env, self)
      : self.renderToken(tokens, idx, options)
  }
}
