import { defaultPlugins, mount, shallowMount } from '@opencloud-eu/web-test-helpers'
import { AVAILABLE_SIZES, SizeType } from '@opencloud-eu/design-system/helpers'
import ResourceIcon from '../../../../src/components/FilesList/ResourceIcon.vue'
import {
  ResourceIconMapping,
  resourceIconMappingInjectionKey
} from '../../../../src/helpers/resource'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'

const resourceIconMapping: ResourceIconMapping = {
  extension: {
    'not-a-real-extension': {
      name: 'resource-type-madeup-extension'
    }
  },
  mimeType: {
    'not-a-real-mimetype': {
      name: 'resource-type-file'
    },
    'image-icon-mimetype': {
      src: 'https://example.org/logo.png'
    }
  },
  folderExtension: {
    vault: {
      name: 'resource-type-vault'
    }
  }
}

describe('OcResourceIcon', () => {
  ;['file', 'folder'].forEach((type) => {
    match({
      type
    })
  })

  match({ type: 'space' })
  match({ type: 'space', driveType: 'project' }, 'with drive type "project"')

  match(
    {
      type: 'file',
      extension: 'not-a-real-extension'
    },
    'with extension "not-a-real-extension"'
  )

  match(
    {
      type: 'file',
      mimeType: 'not-a-real-mimetype'
    },
    'with mimetype "not-a-real-mimetype"'
  )

  it('renders the folder icon for a folder whose name carries a file extension', () => {
    const { wrapper } = getWrapper({
      resource: { type: 'folder', isFolder: true, extension: 'txt' } as Partial<Resource>,
      size: 'medium'
    })
    expect(wrapper.find('oc-icon-stub').attributes('name')).toBe('resource-type-folder')
  })

  it('renders the folder icon for a folder whose extension an app claims for files', () => {
    const { wrapper } = getWrapper({
      resource: {
        type: 'folder',
        isFolder: true,
        extension: 'not-a-real-extension'
      } as Partial<Resource>,
      size: 'medium'
    })
    expect(wrapper.find('oc-icon-stub').attributes('name')).toBe('resource-type-folder')
  })

  it('renders the app icon for a folder whose extension an app claims for folders', () => {
    const { wrapper } = getWrapper({
      resource: { type: 'folder', isFolder: true, extension: 'vault' } as Partial<Resource>,
      size: 'medium'
    })
    expect(wrapper.find('oc-icon-stub').attributes('name')).toBe('resource-type-vault')
  })

  it('renders the text icon for a file with a text extension', () => {
    const { wrapper } = getWrapper({
      resource: { type: 'file', extension: 'txt' } as Partial<Resource>,
      size: 'medium'
    })
    expect(wrapper.find('oc-icon-stub').attributes('name')).toBe('resource-type-text')
  })

  it('passes the image icon of a file type an app claims on to the icon', () => {
    const { wrapper } = getWrapper({
      resource: { type: 'file', mimeType: 'image-icon-mimetype' } as Partial<Resource>,
      size: 'medium',
      mountType: mount
    })
    expect(wrapper.find('img').attributes('src')).toBe('https://example.org/logo.png')
  })

  it('renders the vault icon for a space that is a vault', () => {
    const { wrapper } = getWrapper({
      resource: { type: 'space', driveType: 'project', isInVault: true } as Partial<Resource>,
      size: 'medium'
    })
    expect(wrapper.find('oc-icon-stub').attributes('name')).toBe('resource-type-space-vault')
  })
})

function match(resource: Partial<Resource | SpaceResource>, additionalText?: string) {
  AVAILABLE_SIZES.forEach((size) => {
    it(`renders OcIcon for resource type ${resource.type}${
      additionalText ? ` ${additionalText}` : ''
    } in size ${size}`, () => {
      const { wrapper } = getWrapper({ resource, size })
      expect(wrapper.html()).toMatchSnapshot()
    })
  })
}

function getWrapper({
  resource,
  size,
  mountType = shallowMount
}: {
  resource: Partial<Resource | SpaceResource>
  size: SizeType
  mountType?: typeof shallowMount
}) {
  return {
    wrapper: mountType(ResourceIcon, {
      global: {
        plugins: [...defaultPlugins()],
        provide: {
          [resourceIconMappingInjectionKey]: resourceIconMapping
        }
      },
      props: {
        resource: resource as Resource,
        size
      }
    })
  }
}
