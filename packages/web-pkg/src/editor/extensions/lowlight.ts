import { common, createLowlight } from 'lowlight'

/**
 * One registry for the whole editor. Registering the common grammars is not
 * free, and both the code block and the frontmatter block highlight against it.
 */
export const lowlight = createLowlight(common)
