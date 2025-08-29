<template>
  <div
    id="files-list-not-found-message"
    class="text-center items-center flex justify-center flex-col h-[75vh]"
  >
    <oc-icon name="cloud" type="div" size="xxlarge" />
    <div class="text-role-on-surface-variant text-xl">
      <span v-translate>Resource not found</span>
    </div>
    <div class="text-role-on-surface-variant">
      <span v-translate>
        We went looking everywhere, but were unable to find the selected resource.
      </span>
    </div>
    <div class="mt-2">
      <oc-button
        v-if="showSpacesButton"
        id="space-not-found-button-go-spaces"
        type="router-link"
        appearance="raw"
        :to="spacesRoute"
      >
        <span v-translate>Go to »Spaces Overview«</span>
      </oc-button>
      <oc-button
        v-if="showHomeButton"
        id="files-list-not-found-button-go-home"
        type="router-link"
        appearance="raw"
        :to="homeRoute"
      >
        <span v-translate>Go to »Personal« page</span>
      </oc-button>
      <oc-button
        v-if="showPublicLinkButton"
        id="files-list-not-found-button-reload-link"
        type="router-link"
        appearance="raw"
        :to="publicLinkRoute"
      >
        <span v-translate>Reload public link</span>
      </oc-button>
    </div>
  </div>
</template>

<script lang="ts">
import {
  createLocationPublic,
  createLocationSpaces,
  isLocationPublicActive,
  isLocationSpacesActive
} from '@opencloud-eu/web-pkg'

import { useRouter } from '@opencloud-eu/web-pkg'
import { defineComponent, PropType } from 'vue'
import { SpaceResource } from '@opencloud-eu/web-client'
import { createFileRouteOptions } from '@opencloud-eu/web-pkg'

export default defineComponent({
  name: 'NotFoundMessage',
  props: {
    space: {
      type: Object as PropType<SpaceResource>,
      required: false,
      default: null
    }
  },
  setup(props) {
    const router = useRouter()
    const isProjectSpace = props.space?.driveType === 'project'
    return {
      showPublicLinkButton: isLocationPublicActive(router, 'files-public-link'),
      showHomeButton: isLocationSpacesActive(router, 'files-spaces-generic') && !isProjectSpace,
      showSpacesButton: isLocationSpacesActive(router, 'files-spaces-generic') && isProjectSpace,
      homeRoute: createLocationSpaces('files-spaces-generic', {
        params: {
          driveAliasAndItem: 'personal'
        }
      }),
      publicLinkRoute: createLocationPublic(
        'files-public-link',
        createFileRouteOptions(props.space, {})
      ),
      spacesRoute: createLocationSpaces('files-spaces-projects')
    }
  }
})
</script>
