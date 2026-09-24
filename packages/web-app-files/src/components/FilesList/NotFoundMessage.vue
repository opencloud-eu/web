<template>
  <no-content-message id="files-list-not-found-message" img-src="images/empty-states/404.svg">
    <template #message>
      <span v-text="$gettext('Resource not found')" />
    </template>
    <template #callToAction>
      <p
        class="mt-0 mb-2"
        v-text="
          $gettext('We went looking everywhere, but were unable to find the selected resource.')
        "
      />
      <oc-button
        v-if="showSpacesButton"
        id="space-not-found-button-go-spaces"
        type="router-link"
        appearance="raw"
        :to="spacesRoute"
      >
        <span v-text="$gettext('Go to »Spaces Overview«')" />
      </oc-button>
      <oc-button
        v-if="showHomeButton"
        id="files-list-not-found-button-go-home"
        type="router-link"
        appearance="raw"
        :to="homeRoute"
      >
        <span v-text="$gettext('Go to »Personal« page')" />
      </oc-button>
      <oc-button
        v-if="showPublicLinkButton"
        id="files-list-not-found-button-reload-link"
        type="router-link"
        appearance="raw"
        :to="publicLinkRoute"
      >
        <span v-text="$gettext('Reload public link')" />
      </oc-button>
    </template>
  </no-content-message>
</template>

<script setup lang="ts">
import {
  NoContentMessage,
  createLocationPublic,
  createLocationSpaces,
  isLocationPublicActive,
  isLocationSpacesActive
} from '@opencloud-eu/web-pkg'

import { useRouter } from '@opencloud-eu/web-pkg'
import { SpaceResource } from '@opencloud-eu/web-client'
import { createFileRouteOptions } from '@opencloud-eu/web-pkg'

const { space = null } = defineProps<{
  space?: SpaceResource | null
}>()

const router = useRouter()
const isProjectSpace = space?.driveType === 'project'

const showPublicLinkButton = isLocationPublicActive(router, 'files-public-link')
const showHomeButton = isLocationSpacesActive(router, 'files-spaces-generic') && !isProjectSpace
const showSpacesButton = isLocationSpacesActive(router, 'files-spaces-generic') && isProjectSpace
const homeRoute = createLocationSpaces('files-spaces-generic', {
  params: {
    driveAliasAndItem: 'personal'
  }
})
const publicLinkRoute = createLocationPublic('files-public-link', createFileRouteOptions(space, {}))
const spacesRoute = createLocationSpaces('files-spaces-projects')
</script>
