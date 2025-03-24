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
  ]
}
