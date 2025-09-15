<template>
  <div id="files-sidebar-panel-audio" class="rounded-sm p-4 bg-role-surface-container">
    <dl class="details-list grid grid-cols-[auto_minmax(0,1fr)] m-0">
      <dt v-text="$gettext('Title')" />
      <dd data-testid="audio-panel-title" v-text="title" />
      <dt v-text="$gettext('Duration')" />
      <dd data-testid="audio-panel-duration" v-text="duration" />
      <dt v-text="$gettext('Authors')" />
      <dd data-testid="audio-panel-artist" v-text="artist" />
      <dt v-text="$gettext('Album')" />
      <dd data-testid="audio-panel-album" v-text="album" />
      <dt v-text="$gettext('Genre')" />
      <dd data-testid="audio-panel-genre" v-text="genre" />
      <dt v-text="$gettext('Year recorded')" />
      <dd data-testid="audio-panel-year" v-text="year" />
      <dt v-text="$gettext('Track')" />
      <dd data-testid="audio-panel-track" v-text="track" />
      <dt v-text="$gettext('Disc')" />
      <dd data-testid="audio-panel-disc" v-text="disc" />
    </dl>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, inject, Ref, unref } from 'vue'
import { Resource } from '@opencloud-eu/web-client'
import { Duration } from 'luxon'

export default defineComponent({
  name: 'AudioMetaPanel',
  setup() {
    const resource = inject<Ref<Resource>>('resource')

    const album = computed(() => {
      return unref(resource).audio.album || '-'
    })

    const artist = computed(() => {
      return unref(resource).audio.artist || '-'
    })

    const albumArtist = computed(() => {
      return unref(resource).audio.albumArtist || '-'
    })

    const genre = computed(() => {
      return unref(resource).audio.genre || '-'
    })

    const title = computed(() => {
      return unref(resource).audio.title || '-'
    })

    const duration = computed(() => {
      const milliseconds = unref(resource).audio.duration
      if (!milliseconds) {
        return '-'
      }
      const d = Duration.fromMillis(milliseconds)
      if (d.hours > 0) {
        return d.toFormat('hh:mm:ss')
      }
      return d.toFormat('mm:ss')
    })

    const track = computed(() => {
      const audio = unref(resource).audio
      if (audio.track && audio.trackCount) {
        return `${audio.track} / ${audio.trackCount}`
      }
      return audio.track || '-'
    })

    const disc = computed(() => {
      const audio = unref(resource).audio
      if (audio.disc && audio.discCount) {
        return `${audio.disc} / ${audio.discCount}`
      }
      return audio.disc || '-'
    })

    const year = computed(() => {
      return unref(resource).audio.year || '-'
    })

    return {
      album,
      artist,
      albumArtist,
      genre,
      title,
      duration,
      track,
      disc,
      year
    }
  }
})
</script>
