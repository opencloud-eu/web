import { shallowMount } from '@opencloud-eu/web-test-helpers'
import { AVAILABLE_SIZES } from '@opencloud-eu/design-system/helpers'
import ResourceIcon from '../../../../src/components/FilesList/ResourceIcon.vue'
import {
  ResourceIconMapping,
  resourceIconMappingInjectionKey
} from '../../../../src/helpers/resource'
import { Resource } from '@opencloud-eu/web-client'

const resourceIconMapping: ResourceIconMapping = {
  extension: {
    'not-a-real-extension': {
      name: 'resource-type-madeup-extension',
      color: 'red'
    }
  },
  mimeType: {
    'not-a-real-mimetype': {
      name: 'resource-type-file',
      color: 'var(--oc-role-on-surface)'
    }
  }
}

describe('OcResourceIcon', () => {
  ;['file', 'folder', 'space'].forEach((type) => {
    match({
      type
    })
  })

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
})

function match(resource: Partial<Resource>, additionalText?: string) {
  AVAILABLE_SIZES.forEach((size) => {
    it(`renders OcIcon for resource type ${resource.type}${
      additionalText ? ` ${additionalText}` : ''
    } in size ${size}`, () => {
      const { wrapper } = getWrapper({ resource, size })
      expect(wrapper.html()).toMatchSnapshot()
    })
  })
}

function getWrapper({ resource, size }: { resource: Partial<Resource>; size: string }) {
  return {
    wrapper: shallowMount(ResourceIcon, {
      global: {
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
