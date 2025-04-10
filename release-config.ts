export default {
  changeTypes: [
    {
      title: '💥 Breaking changes',
      labels: ['breaking', 'Type:Breaking-Change'],
      bump: 'major',
      weight: 3
    },
    {
      title: '🔒 Security',
      labels: ['security', 'Type:Security'],
      bump: 'patch',
      weight: 2
    },
    {
      title: '✨ Features',
      labels: ['feature', 'Type:Feature'],
      bump: 'minor',
      weight: 1
    },
    {
      title: '📈 Enhancement',
      labels: ['enhancement', 'refactor', 'Type:Enhancement'],
      bump: 'minor'
    },
    {
      title: '🐛 Bug Fixes',
      labels: ['bug', 'Type:Bug'],
      bump: 'patch'
    },
    {
      title: '📚 Documentation',
      labels: ['docs', 'documentation', 'Type:Documentation'],
      bump: 'patch'
    },
    {
      title: '✅ Tests',
      labels: ['test', 'tests', 'Type:Test'],
      bump: 'patch'
    },
    {
      title: '📦️ Dependencies',
      labels: ['dependency', 'dependencies', 'Type:Dependencies'],
      bump: 'patch',
      weight: -1
    }
  ],
  useVersionPrefixV: true,
  getNextVersion: ({ exec }) => {
    const branch = exec('git rev-parse --abbrev-ref HEAD', {
      silent: true
    }).stdout.trim()

    if (!branch.startsWith('stable-')) {
      throw new Error('Branch name must start with "stable-"')
    }

    const [_, majorAndMinor] = branch.split('-')

    exec('git fetch --tags', { silent: true })
    const tagsOutput = exec('git tag', { silent: true }).stdout.trim()
    const tags: string[] = tagsOutput ? tagsOutput.split('\n') : []
    const matchingTags = tags.filter((tag) => tag.startsWith(`v${majorAndMinor}`))

    if (!matchingTags.length) {
      return `${majorAndMinor}.1`
    }

    const sortedTags = matchingTags.sort(compareVersions)
    const latestTag = sortedTags.pop() || ''
    return bumpPatchVersion(latestTag)
  },
  useLatestRelease: ({ nextVersion, latestVersion }) => {
    return compareVersions(latestVersion, nextVersion) === -1
  }
}

const parseVersion = (tag: string) => {
  const version = tag.startsWith('v') ? tag.slice(1) : tag
  const [main, pre] = version.split('-')
  const [major, minor, patch] = main.split('.').map(Number)
  return { major, minor, patch, pre }
}

const compareVersions = (a: string, b: string) => {
  const va = parseVersion(a)
  const vb = parseVersion(b)

  if (va.major !== vb.major) return va.major - vb.major
  if (va.minor !== vb.minor) return va.minor - vb.minor
  if (va.patch !== vb.patch) return va.patch - vb.patch

  if (va.pre && !vb.pre) return -1
  if (!va.pre && vb.pre) return 1

  if (va.pre && vb.pre) return va.pre.localeCompare(vb.pre)

  return 0
}

const bumpPatchVersion = (tag: string) => {
  const version = tag.startsWith('v') ? tag.slice(1) : tag
  const [main] = version.split('-')
  const [major, minor, patch] = main.split('.').map(Number)

  const newPatch = patch + 1
  return `${major}.${minor}.${newPatch}`
}
