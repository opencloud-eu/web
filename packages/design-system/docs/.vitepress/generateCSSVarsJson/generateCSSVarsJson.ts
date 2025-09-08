import { Plugin, searchForWorkspaceRoot } from 'vite'
import fs from 'fs'
import path from 'path'

const projectRootDir = searchForWorkspaceRoot(process.cwd())

const createOutputDirectory = (dir: string) => {
  const propsOutputDir = path.resolve(projectRootDir, dir)
  if (!fs.existsSync(propsOutputDir)) {
    fs.mkdirSync(propsOutputDir, { recursive: true })
  }
  return propsOutputDir
}

const generateFile = () => {
  const destinationDir = createOutputDirectory('packages/design-system/docs/public')
  const filePath = path.resolve(projectRootDir, 'packages/design-system/src/styles/defaults.css')
  const cssContent = fs.readFileSync(filePath, 'utf8')

  // match all --oc-* variables and their values
  const varRegex = /--([\w-]+):\s*([^;]+);/g
  const matches = [...cssContent.matchAll(varRegex)]
  const variables = matches.map((match) => ({
    name: match[1],
    value: match[2].trim()
  }))

  const outputPath = path.join(destinationDir, 'cssDefaultVars.json')
  fs.writeFileSync(outputPath, JSON.stringify(variables, null, 2), 'utf8')
}

// plugin to parse default css values and generate json files that can be loaded by the docs
const plugins = (): Plugin[] => [
  {
    name: '@opencloud-eu/generate-css-vars-json',
    buildStart() {
      generateFile()
    }
  }
]

export default plugins
