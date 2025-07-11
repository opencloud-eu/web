import { App, AppVersion } from '../../../src/types'
import AppVersions from '../../../src/components/AppVersions.vue'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'

const version1: AppVersion = {
  url: 'https://wololo.com/download-1.0.0.zip',
  version: '1.0.0'
}
const version2: AppVersion = {
  url: 'https://wololo.com/download-1.1.0.zip',
  version: '1.1.0',
  minOpenCloud: '6.5.0'
}
const version3: AppVersion = {
  url: 'https://wololo.com/download-1.1.1.zip',
  version: '1.1.1',
  minOpenCloud: '6.5.0'
}
const version4: AppVersion = {
  url: 'wololo',
  version: '1.2.0'
}
const version5: AppVersion = {
  version: '',
  url: 'https://wololo.com/download-1.3.0.zip',
  minOpenCloud: '6.5.0'
}
const validVersions = [version1, version2, version3]
const versions = [...validVersions, version4, version5]
const mostRecentVersion = version2

const selectors = {
  versionRow: 'tbody tr',
  tableCellVersion: '.oc-table-data-cell-version',
  tableCellMinOpenCloud: '.oc-table-data-cell-minOpenCloud',
  tableCellActions: '.oc-table-data-cell-actions',
  downloadButton: '[data-testid="action-handler"]'
}

describe('AppVersions.vue', () => {
  it('renders only versions which have at least a version and a valid URL', () => {
    const { wrapper } = getWrapper()
    const rows = wrapper.findAll(selectors.versionRow)
    expect(rows).toHaveLength(validVersions.length)
    rows.forEach((row, index) => {
      const versionCell = row.find(selectors.tableCellVersion)
      expect(versionCell.exists()).toBeTruthy()
      expect(versionCell.text().startsWith(`v${versions[index].version}`)).toBeTruthy()
    })
  })
  it('adds a "most recent" tag only to the latest version', () => {
    const { wrapper } = getWrapper()
    const rows = wrapper.findAll(selectors.versionRow)
    rows.forEach((row, index) => {
      const versionCell = row.find(selectors.tableCellVersion)
      expect(versionCell.exists()).toBeTruthy()
      if (versions[index].version === mostRecentVersion.version) {
        expect(versionCell.text().startsWith(`v${versions[index].version}`)).toBeTruthy()
        expect(versionCell.text().endsWith('most recent')).toBeTruthy()
      } else {
        expect(versionCell.text()).toBe(`v${versions[index].version}`)
      }
    })
  })
  it('renders the minimum required OpenCloud version if present or "-" if not', () => {
    const { wrapper } = getWrapper()
    const rows = wrapper.findAll(selectors.versionRow)
    rows.forEach((row, index) => {
      const minOpenCloudCell = row.find(selectors.tableCellMinOpenCloud)
      expect(minOpenCloudCell.exists()).toBeTruthy()
      if (versions[index].minOpenCloud) {
        expect(minOpenCloudCell.text()).toBe(`v${versions[index].minOpenCloud}`)
      } else {
        expect(minOpenCloudCell.text()).toBe('-')
      }
    })
  })
  it('renders a download button', async () => {
    const { wrapper } = getWrapper()
    const rows = wrapper.findAll(selectors.versionRow)
    for (let i = 0; i < rows.length; i++) {
      const actionsCell = rows[i].find(selectors.tableCellActions)
      expect(actionsCell.exists()).toBeTruthy()
      const downloadButton = actionsCell.find(selectors.downloadButton)
      expect(downloadButton.exists()).toBeTruthy()
      expect(downloadButton.text()).toBe('Download')
      await downloadButton.trigger('click')
      expect(wrapper.emitted('click')).toBeTruthy()
      expect(window.location.href).toBe(versions[i].url)
    }
  })
})

const getWrapper = () => {
  const app: App = { ...mock<App>({}), versions, mostRecentVersion }
  return {
    wrapper: mount(AppVersions, {
      props: { app },
      global: {
        plugins: [...defaultPlugins()]
      }
    })
  }
}
