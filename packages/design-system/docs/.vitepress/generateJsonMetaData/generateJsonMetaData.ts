import { Plugin, searchForWorkspaceRoot } from 'vite'
import fs from 'fs'
import path from 'path'
import * as ts from 'typescript'
import { Emit, Prop, Slot } from './types'

const projectRootDir = searchForWorkspaceRoot(process.cwd())

const getAllVueFiles = (dir: string) => {
  let results: string[] = []
  const list = fs.readdirSync(dir)
  list.forEach((file) => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    if (stat?.isDirectory()) {
      results = results.concat(getAllVueFiles(filePath))
    } else if (file.endsWith('.vue')) {
      results.push(filePath)
    }
  })
  return results
}

const createOutputDirectory = (dir: string) => {
  const propsOutputDir = path.resolve(projectRootDir, dir)
  if (!fs.existsSync(propsOutputDir)) {
    fs.mkdirSync(propsOutputDir, { recursive: true })
  }
  return propsOutputDir
}

const getDocBlockByType = (member: ts.Node, type: string) => {
  const nodes = ts.getAllJSDocTags(member, (tag): tag is ts.JSDocTag => {
    return tag.tagName.getText() === type
  })
  return nodes.map((tag) => tag.comment).join(' ')
}

const createJsonFiles = (componentFiles: string[]) => {
  const propsDir = createOutputDirectory('packages/design-system/docs/public/props')
  const emitsDir = createOutputDirectory('packages/design-system/docs/public/emits')
  const slotsDir = createOutputDirectory('packages/design-system/docs/public/slots')

  componentFiles.forEach((filePath) => {
    const scriptContent = fs.readFileSync(filePath, 'utf8')
    const sourceFile = ts.createSourceFile('temp.ts', scriptContent, ts.ScriptTarget.ESNext, true)

    const emits: Emit[] = []
    const props: Prop[] = []
    const slots: Slot[] = []

    sourceFile.forEachChild((node) => {
      // props
      if (ts.isInterfaceDeclaration(node) && node.name.text === 'Props') {
        node.members.forEach((member) => {
          if (ts.isPropertySignature(member)) {
            props.push({
              name: member.name.getText() || '',
              required: member.questionToken === undefined,
              description: getDocBlockByType(member, 'docs'),
              default: getDocBlockByType(member, 'default'),
              type: member.type?.getText() || ''
            })
          }
        })
      }

      // emits
      if (ts.isInterfaceDeclaration(node) && node.name.text === 'Emits') {
        node.members.forEach((member) => {
          if (ts.isCallSignatureDeclaration(member) && member.parameters.length > 0) {
            const firstParam = member.parameters[0]

            if (
              firstParam.type &&
              ts.isLiteralTypeNode(firstParam.type) &&
              ts.isStringLiteral(firstParam.type.literal)
            ) {
              emits.push({
                name: firstParam.type.literal.text,
                description: getDocBlockByType(member, 'docs'),
                type: member.getText()
              })
            }
          }
        })
      }

      // slots
      if (ts.isInterfaceDeclaration(node) && node.name.text === 'Slots') {
        node.members.forEach((member) => {
          if (ts.isPropertySignature(member)) {
            slots.push({
              name: member.name.getText() || '',
              description: getDocBlockByType(member, 'docs'),
              type: member.type?.getText() || ''
            })
          }
        })
      }
    })

    if (props.length) {
      const outputFilePath = path.join(propsDir, `${path.basename(filePath, '.vue')}.json`)
      fs.writeFileSync(outputFilePath, JSON.stringify(props, null, 2))
    }

    if (emits.length) {
      const outputFilePath = path.join(emitsDir, `${path.basename(filePath, '.vue')}.json`)
      fs.writeFileSync(outputFilePath, JSON.stringify(emits, null, 2))
    }

    if (slots.length) {
      const outputFilePath = path.join(slotsDir, `${path.basename(filePath, '.vue')}.json`)
      fs.writeFileSync(outputFilePath, JSON.stringify(slots, null, 2))
    }
  })
}

const generateFiles = () => {
  const componentsDir = path.resolve(projectRootDir, 'packages/design-system/src/components')
  const componentFiles = getAllVueFiles(componentsDir)
  createJsonFiles(componentFiles)
}

// plugin to parse emits, props and slots of all components and generate json files that can be loaded by the docs
const plugins = (): Plugin[] => [
  {
    name: '@opencloud-eu/generate-json-meta-data:build',
    apply: 'build',
    buildStart() {
      generateFiles()
    }
  },
  {
    name: '@opencloud-eu/generate-json-meta-data:serve',
    apply: 'serve',
    configureServer() {
      // dev server needs this timeout for some reason, otherwise assets will not be found
      setTimeout(generateFiles, 1000)
    }
  }
]

export default plugins
