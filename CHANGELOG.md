# Changelog

## [3.1.0](https://github.com/opencloud-eu/web/releases/tag/v3.1.0) - 2025-06-27

### ❤️ Thanks to all contributors! ❤️

@AlexAndBear, @JammingBen, @ScharfViktor, @individual-it, @kulmann

### ✨ Features

- feat: Collabora Save As and Export [[#859](https://github.com/opencloud-eu/web/pull/859)]
- feat: add open with context menu item [[#820](https://github.com/opencloud-eu/web/pull/820)]

### ✅ Tests

- setup opencloud-keycloak-ldap setup. fix test after changing space template image [[#851](https://github.com/opencloud-eu/web/pull/851)]
- [full-ci] detect and delete unused steps [[#840](https://github.com/opencloud-eu/web/pull/840)]
- [full-ci] fix app-provider tests [[#843](https://github.com/opencloud-eu/web/pull/843)]
- delete logo steps [[#834](https://github.com/opencloud-eu/web/pull/834)]
- open file using context menu [[#835](https://github.com/opencloud-eu/web/pull/835)]
- A11y tests [[#819](https://github.com/opencloud-eu/web/pull/819)]
- test: add unit tests for context menu drop [[#826](https://github.com/opencloud-eu/web/pull/826)]

### 🐛 Bug Fixes

- fix: upload space image broken [[#866](https://github.com/opencloud-eu/web/pull/866)]
- fix: context actions types [[#856](https://github.com/opencloud-eu/web/pull/856)]
- fix: open with context menu initial state [[#844](https://github.com/opencloud-eu/web/pull/844)]
- fix: tiles view accidentatly show space status indicators [[#828](https://github.com/opencloud-eu/web/pull/828)]
- fix: exclude public links from space member count [[#815](https://github.com/opencloud-eu/web/pull/815)]
- fix: space member count in space header component [[#812](https://github.com/opencloud-eu/web/pull/812)]

### 📈 Enhancement

- feat: add accessibility config link to user menu footer section [[#861](https://github.com/opencloud-eu/web/pull/861)]
- feat: add context menu action to remove space image [[#829](https://github.com/opencloud-eu/web/pull/829)]
- feat: brand color default space image [[#849](https://github.com/opencloud-eu/web/pull/849)]
- feat: add more supported formats to text editor [[#848](https://github.com/opencloud-eu/web/pull/848)]
- feat: add required mark to input fields that require a value to be set [[#798](https://github.com/opencloud-eu/web/pull/798)]

### 📦️ Dependencies

- fix(deps): update dependency @sentry/vue to v9.32.0 [[#860](https://github.com/opencloud-eu/web/pull/860)]
- fix(deps): update dependency @vitejs/plugin-vue to v6 [[#854](https://github.com/opencloud-eu/web/pull/854)]
- chore(deps): update dependency vite-plugin-static-copy to v3.1.0 [[#862](https://github.com/opencloud-eu/web/pull/862)]
- chore(deps): update node.js to v22.17.0 [[#857](https://github.com/opencloud-eu/web/pull/857)]
- chore(deps): update pnpm to v10.12.3 [[#855](https://github.com/opencloud-eu/web/pull/855)]
- fix(deps): update dependency @sentry/vue to v9.31.0 [[#850](https://github.com/opencloud-eu/web/pull/850)]
- fix(deps): update uppy monorepo [[#720](https://github.com/opencloud-eu/web/pull/720)]
- chore(deps): update devdependencies (non-major) [[#768](https://github.com/opencloud-eu/web/pull/768)]
- fix(deps): update vue monorepo to v3.5.17 [[#836](https://github.com/opencloud-eu/web/pull/836)]
- fix(deps): update dependency @sentry/vue to v9.30.0 [[#818](https://github.com/opencloud-eu/web/pull/818)]
- fix(deps): update dependency zod to v3.25.67 [[#823](https://github.com/opencloud-eu/web/pull/823)]
- fix(deps): update dependency @vueuse/core to v13.4.0 [[#837](https://github.com/opencloud-eu/web/pull/837)]
- chore(deps): update pnpm to v10.12.2 - autoclosed [[#842](https://github.com/opencloud-eu/web/pull/842)]
- fix(deps): update dependency axios to v1.10.0 [[#831](https://github.com/opencloud-eu/web/pull/831)]
- fix(deps): update dependency zod to v3.25.61 [[#817](https://github.com/opencloud-eu/web/pull/817)]
- fix(deps): update dependency @sentry/vue to v9.28.0 [[#766](https://github.com/opencloud-eu/web/pull/766)]
- chore(deps): update pnpm to v10.12.1 [[#809](https://github.com/opencloud-eu/web/pull/809)]
- fix(deps): update dependency pinia to v3.0.3 [[#797](https://github.com/opencloud-eu/web/pull/797)]
- fix(deps): update dependency zod to v3.25.59 [[#769](https://github.com/opencloud-eu/web/pull/769)]
- chore(deps): update dependency happy-dom to v18 [[#816](https://github.com/opencloud-eu/web/pull/816)]
- fix(deps): update vue monorepo to v3.5.16 [[#770](https://github.com/opencloud-eu/web/pull/770)]
- [full-ci]bump-opencloud-3.0.0 [[#814](https://github.com/opencloud-eu/web/pull/814)]

## [3.0.0](https://github.com/opencloud-eu/web/releases/tag/v3.0.0) - 2025-06-10

### ❤️ Thanks to all contributors! ❤️

@AlexAndBear, @JammingBen, @ScharfViktor, @fschade, @kulmann, @tammi-23

### 💥 Breaking changes

- perf!: space permission loading [[#752](https://github.com/opencloud-eu/web/pull/752)]

### ✨ Features

- feat: show avatars across the webui [[#757](https://github.com/opencloud-eu/web/pull/757)]
- feat: extract first frame from gif, so space image cropping works fla… [[#747](https://github.com/opencloud-eu/web/pull/747)]
- feat: add profile pictures [[#626](https://github.com/opencloud-eu/web/pull/626)]
- feat: Added CalDAV URL to the Accountpage [[#693](https://github.com/opencloud-eu/web/pull/693)]
- feat: add cropping to space images [[#722](https://github.com/opencloud-eu/web/pull/722)]
- feat: polish account page design [[#707](https://github.com/opencloud-eu/web/pull/707)]

### 🐛 Bug Fixes

- fix: status column appears multiple times [[#806](https://github.com/opencloud-eu/web/pull/806)]
- fix: modal window doesn't close on browser navigation [[#783](https://github.com/opencloud-eu/web/pull/783)]
- fix: space quota not initial set [[#779](https://github.com/opencloud-eu/web/pull/779)]
- fix: avatar initials not shown in shares table [[#784](https://github.com/opencloud-eu/web/pull/784)]
- fix(admin-settings): broken update user space quota for users with sp… [[#774](https://github.com/opencloud-eu/web/pull/774)]
- fix: add resource name length check [[#776](https://github.com/opencloud-eu/web/pull/776)]
- fix: SpaceImageModal import [[#734](https://github.com/opencloud-eu/web/pull/734)]

### 📈 Enhancement

- feat: add keyboard support for space image and user avatar cropping [[#805](https://github.com/opencloud-eu/web/pull/805)]
- feat: adjust appreance of the group avatars in the admin settings [[#799](https://github.com/opencloud-eu/web/pull/799)]
- feat: change visual representation of stacked avatars [[#793](https://github.com/opencloud-eu/web/pull/793)]
- feat: show avatars in shares view [[#767](https://github.com/opencloud-eu/web/pull/767)]
- feat: polish account page followup [[#738](https://github.com/opencloud-eu/web/pull/738)]
- feat: remove space membership info in file list [[#721](https://github.com/opencloud-eu/web/pull/721)]

### ✅ Tests

- [full-ci] delete unused files for upload [[#795](https://github.com/opencloud-eu/web/pull/795)]
- e2e-tests. Check avatar tests in shares view [[#792](https://github.com/opencloud-eu/web/pull/792)]
- e2e tests. user profile photo [[#742](https://github.com/opencloud-eu/web/pull/742)]
- chore: add avatar upload tests [[#743](https://github.com/opencloud-eu/web/pull/743)]
- check ratio after cropping space image [[#731](https://github.com/opencloud-eu/web/pull/731)]
- disable write buffer for activity tests [[#727](https://github.com/opencloud-eu/web/pull/727)]

### 📦️ Dependencies

- Revert "fix(deps): update dependency eslint-plugin-n to v17.19.0" [[#810](https://github.com/opencloud-eu/web/pull/810)]
- chore(deps): update apache/tika docker tag to v3.2.0.0 [[#780](https://github.com/opencloud-eu/web/pull/780)]
- fix(deps): update dependency eslint-plugin-n to v17.19.0 [[#781](https://github.com/opencloud-eu/web/pull/781)]
- chore(deps): update pnpm to v10.11.1 [[#786](https://github.com/opencloud-eu/web/pull/786)]
- chore(deps): update dependency rollup-plugin-visualizer to v6 [[#746](https://github.com/opencloud-eu/web/pull/746)]
- fix(deps): update dependency focus-trap to v7.6.5 [[#763](https://github.com/opencloud-eu/web/pull/763)]
- chore(deps): update traefik docker tag to v3.4.1 [[#760](https://github.com/opencloud-eu/web/pull/760)]
- chore(deps): update dependency happy-dom to v17.5.6 [[#759](https://github.com/opencloud-eu/web/pull/759)]
- fix(deps): update dependency zod to v3.25.32 [[#764](https://github.com/opencloud-eu/web/pull/764)]
- fix(deps): update typescript-eslint monorepo to v8.33.0 [[#765](https://github.com/opencloud-eu/web/pull/765)]
- fix(deps): update dependency zod to v3.25.30 [[#739](https://github.com/opencloud-eu/web/pull/739)]
- fix(deps): update dependency @vueuse/core to v13.3.0 [[#758](https://github.com/opencloud-eu/web/pull/758)]
- chore(deps): update dependency @babel/core to v7.27.3 [[#754](https://github.com/opencloud-eu/web/pull/754)]
- fix(deps): update vue monorepo to v3.5.15 [[#755](https://github.com/opencloud-eu/web/pull/755)]
- chore(deps): update collabora/code docker tag to v25.04.2.1.1 [[#619](https://github.com/opencloud-eu/web/pull/619)]
- fix(deps): update dependency semver to v7.7.2 [[#680](https://github.com/opencloud-eu/web/pull/680)]
- chore(deps): update node.js to v22.16.0 [[#732](https://github.com/opencloud-eu/web/pull/732)]
- fix(deps): update dependency zod to v3.25.20 [[#733](https://github.com/opencloud-eu/web/pull/733)]
- fix(deps): update dependency md-editor-v3 to v5.6.0 [[#730](https://github.com/opencloud-eu/web/pull/730)]
- fix(deps): update dependency zod to v3.25.17 [[#729](https://github.com/opencloud-eu/web/pull/729)]
- fix(deps): update dependency zod to v3.25.13 [[#725](https://github.com/opencloud-eu/web/pull/725)]
- fix(deps): update dependency @sentry/vue to v9.22.0 [[#723](https://github.com/opencloud-eu/web/pull/723)]
- fix(deps): update dependency @sentry/vue to v9.20.0 [[#719](https://github.com/opencloud-eu/web/pull/719)]
- fix(deps): update uppy monorepo [[#703](https://github.com/opencloud-eu/web/pull/703)]
- chore(deps): update dependency commander to v14 [[#702](https://github.com/opencloud-eu/web/pull/702)]
- [full-ci] opencloud bump v 2.3.0. run all tests [[#714](https://github.com/opencloud-eu/web/pull/714)]
- fix(deps): update dependency @sentry/vue to v9.20.0 [[#710](https://github.com/opencloud-eu/web/pull/710)]
- fix(deps): update dependency dompurify to v3.2.6 - autoclosed [[#716](https://github.com/opencloud-eu/web/pull/716)]
- fix(deps): update dependency zod to v3.25.7 [[#712](https://github.com/opencloud-eu/web/pull/712)]
- chore(deps): update devdependencies (non-major) to v3.1.4 [[#715](https://github.com/opencloud-eu/web/pull/715)]

## [2.4.0](https://github.com/opencloud-eu/web/releases/tag/v2.4.0) - 2025-05-19

### ❤️ Thanks to all contributors! ❤️

@AlexAndBear, @JammingBen, @ScharfViktor, @kulmann, @tammi-23

### ✨ Features

- feat(design-system): add required mark to text input component [[#675](https://github.com/opencloud-eu/web/pull/675)]
- feat: delete file from within preview app [[#616](https://github.com/opencloud-eu/web/pull/616)]
- feat: allow delete file within app [[#610](https://github.com/opencloud-eu/web/pull/610)]

### 🐛 Bug Fixes

- fix(design-system): text input error message icon position [[#691](https://github.com/opencloud-eu/web/pull/691)]
- Added better shift-click handling for files and folders [[#618](https://github.com/opencloud-eu/web/pull/618)]
- fix: minor design system issues and styling [[#686](https://github.com/opencloud-eu/web/pull/686)]
- fix(design-system): filled a button hover [[#682](https://github.com/opencloud-eu/web/pull/682)]
- fix(design-system): adjust primary and onPrimary color roles [[#669](https://github.com/opencloud-eu/web/pull/669)]
- fix: add missing icon for otp [[#667](https://github.com/opencloud-eu/web/pull/667)]
- fix: bring back the left top rounded corner in the app bar [[#647](https://github.com/opencloud-eu/web/pull/647)]
- fix: add fallback font [[#645](https://github.com/opencloud-eu/web/pull/645)]
- fix: preview user cannot delete file in the shared with me page (followup) [[#640](https://github.com/opencloud-eu/web/pull/640)]
- fix: opening previews in share spaces [[#639](https://github.com/opencloud-eu/web/pull/639)]
- fix: delete button in preview app media controls visible, even if permissions missions aren't granted [[#630](https://github.com/opencloud-eu/web/pull/630)]
- fix: preview user cannot delete file in the shared with me page [[#633](https://github.com/opencloud-eu/web/pull/633)]
- fix: embed mode allows to choose locations that are not accessible [[#621](https://github.com/opencloud-eu/web/pull/621)]
- fix: space description has a grey background [[#623](https://github.com/opencloud-eu/web/pull/623)]
- fix:open in app action is available inside an app [[#622](https://github.com/opencloud-eu/web/pull/622)]
- fix: chrome oh snap errors [[#578](https://github.com/opencloud-eu/web/pull/578)]
- fix: show remaining quota as unrestricted if quota is unrestricted [[#607](https://github.com/opencloud-eu/web/pull/607)]

### 📈 Enhancement

- feat(design-system): add OcColorInput component [[#684](https://github.com/opencloud-eu/web/pull/684)]
- feat(design-system): add file input component [[#678](https://github.com/opencloud-eu/web/pull/678)]
- feat(design-system): add option for icon url prefix [[#664](https://github.com/opencloud-eu/web/pull/664)]
- feat(design-system): make component types available for lib usage [[#654](https://github.com/opencloud-eu/web/pull/654)]

### 📚 Documentation

- docs(design-system): type install options [[#665](https://github.com/opencloud-eu/web/pull/665)]

### ✅ Tests

- upload folder via dragAndDrop [[#649](https://github.com/opencloud-eu/web/pull/649)]

### 📦️ Dependencies

- chore(deps): update devdependencies (non-major) [[#697](https://github.com/opencloud-eu/web/pull/697)]
- fix(deps): update dependency @vueuse/core to v13.2.0 [[#689](https://github.com/opencloud-eu/web/pull/689)]
- chore(deps): update pnpm to v10.11.0 [[#688](https://github.com/opencloud-eu/web/pull/688)]
- fix(deps): update dependency @sentry/vue to v9.19.0 [[#692](https://github.com/opencloud-eu/web/pull/692)]
- chore(deps): update node.js to v22.15.1 [[#695](https://github.com/opencloud-eu/web/pull/695)]
- chore(deps): update devdependencies (non-major) [[#694](https://github.com/opencloud-eu/web/pull/694)]
- fix(deps): update vue monorepo to v3.5.14 [[#696](https://github.com/opencloud-eu/web/pull/696)]
- fix(deps): update dependency @sentry/vue to v9.18.0 [[#683](https://github.com/opencloud-eu/web/pull/683)]
- fix(deps): update typescript-eslint monorepo to v8.32.1 [[#681](https://github.com/opencloud-eu/web/pull/681)]
- chore(deps): update dependency vite-plugin-static-copy to v3 [[#666](https://github.com/opencloud-eu/web/pull/666)]
- fix(deps): update dependency @sentry/vue to v9.17.0 [[#657](https://github.com/opencloud-eu/web/pull/657)]
- fix(deps): update dependency eslint-config-prettier to v10.1.5 - autoclosed [[#659](https://github.com/opencloud-eu/web/pull/659)]
- chore(deps): update devdependencies (non-major) [[#662](https://github.com/opencloud-eu/web/pull/662)]
- fix(deps): update dependency @sentry/vue to v9.16.1 [[#650](https://github.com/opencloud-eu/web/pull/650)]
- fix(deps): update dependency globals to v16.1.0 [[#644](https://github.com/opencloud-eu/web/pull/644)]
- fix(deps): update dependency eslint-config-prettier to v10.1.3 [[#643](https://github.com/opencloud-eu/web/pull/643)]
- chore(deps): update dependency @babel/preset-env to v7.27.2 [[#641](https://github.com/opencloud-eu/web/pull/641)]
- fix(deps): update typescript-eslint monorepo to v8.32.0 [[#604](https://github.com/opencloud-eu/web/pull/604)]
- chore(deps): update devdependencies (non-major) [[#632](https://github.com/opencloud-eu/web/pull/632)]
- chore(deps): update traefik docker tag to v3.4.0 [[#637](https://github.com/opencloud-eu/web/pull/637)]
- fix(deps): update dependency zod to v3.24.4 [[#627](https://github.com/opencloud-eu/web/pull/627)]
- chore(deps): update devdependencies (non-major) [[#620](https://github.com/opencloud-eu/web/pull/620)]
- fix(deps): update dependency @sentry/vue to v9.15.0 [[#585](https://github.com/opencloud-eu/web/pull/585)]
- chore(deps): update devdependencies (non-major) [[#584](https://github.com/opencloud-eu/web/pull/584)]

## [2.3.0](https://github.com/opencloud-eu/web/releases/tag/v2.3.0) - 2025-04-28

### ❤️ Thanks to all contributors! ❤️

@AlexAndBear, @JammingBen, @ScharfViktor, @amrita-shrestha, @individual-it, @tammi-23

### ✨ Features

- feat: adjust sidebar preview in the spaces view, so they look equal as the tiles [[#512](https://github.com/opencloud-eu/web/pull/512)]

### 🐛 Bug Fixes

- fix: remove outline on markdown editor and make input and preview are… [[#586](https://github.com/opencloud-eu/web/pull/586)]
- fix: added oc-text-truncate to avoid line overflows in search preview [[#553](https://github.com/opencloud-eu/web/pull/553)]
- fix: removed unnecessary oc-text-truncate to avoid a cut off [[#551](https://github.com/opencloud-eu/web/pull/551)]
- fix: added avatar styling and truncated user name to avoid compressed… [[#550](https://github.com/opencloud-eu/web/pull/550)]
- fix: added padding to readonly-text-editor [[#549](https://github.com/opencloud-eu/web/pull/549)]
- fix: introduce web applications link [[#543](https://github.com/opencloud-eu/web/pull/543)]
- fix: reintroduce ct helper read more links [[#536](https://github.com/opencloud-eu/web/pull/536)]
- fix: use native fetch for downloading archives [[#520](https://github.com/opencloud-eu/web/pull/520)]
- fix: copy permanent link available in trash [[#509](https://github.com/opencloud-eu/web/pull/509)]

### 📈 Enhancement

- feat: disabled preview for txt files [[#555](https://github.com/opencloud-eu/web/pull/555)]

### 📚 Documentation

- docs: fix 404 links in readme [[#538](https://github.com/opencloud-eu/web/pull/538)]
- chore: remove dev docs, since added to opencloud-eu/opencloud repo [[#523](https://github.com/opencloud-eu/web/pull/523)]

### ✅ Tests

- download big archive [[#532](https://github.com/opencloud-eu/web/pull/532)]
- test for #453 [[#505](https://github.com/opencloud-eu/web/pull/505)]

### 📦️ Dependencies

- chore(deps): update pnpm to v10.10.0 [[#597](https://github.com/opencloud-eu/web/pull/597)]
- fix(deps): update dependency vue-router to v4.5.1 [[#595](https://github.com/opencloud-eu/web/pull/595)]
- fix(deps): update dependency axios to v1.9.0 [[#589](https://github.com/opencloud-eu/web/pull/589)]
- chore(deps): update node.js to v22.15.0 [[#583](https://github.com/opencloud-eu/web/pull/583)]
- chore(deps): update dependency vue-tsc to v2.2.10 [[#581](https://github.com/opencloud-eu/web/pull/581)]
- chore(deps): update dependency yaml to v2.7.1 [[#579](https://github.com/opencloud-eu/web/pull/579)]
- fix(deps): update dependency @vavt/cm-extension to v1.9.1 [[#571](https://github.com/opencloud-eu/web/pull/571)]
- fix(deps): update dependency dompurify to v3.2.5 [[#572](https://github.com/opencloud-eu/web/pull/572)]
- chore(deps): update pnpm to v10.9.0 [[#577](https://github.com/opencloud-eu/web/pull/577)]
- fix(deps): update dependency @pinia/testing to v1.0.1 [[#570](https://github.com/opencloud-eu/web/pull/570)]
- chore(deps): update devdependencies (non-major) [[#567](https://github.com/opencloud-eu/web/pull/567)]
- chore(deps): update traefik docker tag to v3.3.6 [[#569](https://github.com/opencloud-eu/web/pull/569)]
- fix(deps): update dependency eslint-config-prettier to v10.1.2 [[#573](https://github.com/opencloud-eu/web/pull/573)]
- fix(deps): update typescript-eslint monorepo to v8.31.0 [[#575](https://github.com/opencloud-eu/web/pull/575)]
- chore(deps): update devdependencies (non-major) [[#563](https://github.com/opencloud-eu/web/pull/563)]
- fix(deps): update dependency @sentry/vue to v9.13.0 [[#560](https://github.com/opencloud-eu/web/pull/560)]
- fix(deps): update dependency zod to v3.24.3 [[#562](https://github.com/opencloud-eu/web/pull/562)]
- chore(deps): update devdependencies (non-major) [[#557](https://github.com/opencloud-eu/web/pull/557)]
- fix(deps): update uppy monorepo [[#521](https://github.com/opencloud-eu/web/pull/521)]
- chore(deps): update devdependencies (non-major) [[#552](https://github.com/opencloud-eu/web/pull/552)]
- chore(deps): update collabora/code docker tag to v24.04.13.3.1 [[#542](https://github.com/opencloud-eu/web/pull/542)]
- chore(deps): update pnpm to v10.8.1 [[#547](https://github.com/opencloud-eu/web/pull/547)]
- chore(deps): update devdependencies (non-major) [[#544](https://github.com/opencloud-eu/web/pull/544)]
- chore(deps): update devdependencies (non-major) [[#529](https://github.com/opencloud-eu/web/pull/529)]
- fix(deps): update dependency @sentry/vue to v9.12.0 [[#522](https://github.com/opencloud-eu/web/pull/522)]
- fix(deps): update dependency pinia to v3.0.2 [[#531](https://github.com/opencloud-eu/web/pull/531)]
- fix(deps): update dependency @vueuse/core to v13.1.0 [[#519](https://github.com/opencloud-eu/web/pull/519)]
- chore(deps): update pnpm to v10.8.0 [[#517](https://github.com/opencloud-eu/web/pull/517)]
- chore(deps): update devdependencies (non-major) [[#506](https://github.com/opencloud-eu/web/pull/506)]

## [2.2.0](https://github.com/opencloud-eu/web/releases/tag/v2.2.0) - 2025-04-04

### ❤️ Thanks to all contributors! ❤️

@AlexAndBear, @JammingBen, @ScharfViktor, @amrita-shrestha, @individual-it, @kulmann

### 🐛 Bug Fixes

- fix(design-system): design system live doc blocks [[#493](https://github.com/opencloud-eu/web/pull/493)]
- fix(files): truncation on long link names [[#481](https://github.com/opencloud-eu/web/pull/481)]
- fix: remove zoom indicator to avoid confusion [[#482](https://github.com/opencloud-eu/web/pull/482)]
- fix: spaces overview item count [[#480](https://github.com/opencloud-eu/web/pull/480)]
- fix: hide request-id when it's undefined [[#469](https://github.com/opencloud-eu/web/pull/469)]
- fix: web doesn't return to correct page (pagination) after closing app [[#466](https://github.com/opencloud-eu/web/pull/466)]
- fix: archive download with archives >2GB [[#465](https://github.com/opencloud-eu/web/pull/465)]
- fix: post-processing indicator not updating [[#444](https://github.com/opencloud-eu/web/pull/444)]
- fix: Don't show backend edition when not set [[#442](https://github.com/opencloud-eu/web/pull/442)]

### ✅ Tests

- [full-ci]use Playwright api instead of node fetch [[#486](https://github.com/opencloud-eu/web/pull/486)]

### 📈 Enhancement

- feat: add hint for tag searching [[#475](https://github.com/opencloud-eu/web/pull/475)]
- feat: make meta data panels more appealing [[#472](https://github.com/opencloud-eu/web/pull/472)]
- feat: replace reset icon in preview app [[#468](https://github.com/opencloud-eu/web/pull/468)]
- feat: change plain view button color [[#455](https://github.com/opencloud-eu/web/pull/455)]

### 📦️ Dependencies

- fix(deps): update dependency @sentry/vue to v9.11.0 [[#496](https://github.com/opencloud-eu/web/pull/496)]
- chore(deps): update devdependencies (non-major) [[#498](https://github.com/opencloud-eu/web/pull/498)]
- chore(deps): update devdependencies (non-major) [[#495](https://github.com/opencloud-eu/web/pull/495)]
- chore(deps): update devdependencies (non-major) [[#491](https://github.com/opencloud-eu/web/pull/491)]
- chore(deps): bump @babel/runtime to v7.27.0 [[#477](https://github.com/opencloud-eu/web/pull/477)]
- chore(deps): update pnpm to v10.7.1 [[#476](https://github.com/opencloud-eu/web/pull/476)]
- chore(deps): update devdependencies (non-major) [[#474](https://github.com/opencloud-eu/web/pull/474)]
- chore(deps): update devdependencies (non-major) [[#451](https://github.com/opencloud-eu/web/pull/451)]
- fix(deps): update dependency @sentry/vue to v9.10.1 [[#450](https://github.com/opencloud-eu/web/pull/450)]
- fix(deps): update dependency @vavt/cm-extension to v1.9.0 [[#447](https://github.com/opencloud-eu/web/pull/447)]
- fix(deps): update dependency luxon to v3.6.1 [[#463](https://github.com/opencloud-eu/web/pull/463)]
- chore(deps): update dependency vite to v6.2.4 [security] [[#461](https://github.com/opencloud-eu/web/pull/461)]
- chore(deps): update traefik docker tag to v3.3.5 [[#462](https://github.com/opencloud-eu/web/pull/462)]
- fix(deps): update typescript-eslint monorepo to v8.29.0 [[#464](https://github.com/opencloud-eu/web/pull/464)]
- fix(deps): update dependency @sentry/vue to v9.10.0 [[#446](https://github.com/opencloud-eu/web/pull/446)]
- chore(deps): update dependency @types/semver to v7.7.0 [[#439](https://github.com/opencloud-eu/web/pull/439)]

## [2.1.0](https://github.com/opencloud-eu/web/releases/tag/v2.1.0) - 2025-03-26

### ❤️ Thanks to all contributors! ❤️

@AlexAndBear, @JammingBen, @PrajwolAmatya, @ScharfViktor, @aduffeck, @individual-it, @kulmann, @micbar, @prashant-gurung899

### 📈 Enhancement

- feat(admin-settings): remove appearance section from General page [[#432](https://github.com/opencloud-eu/web/pull/432)]
- feat: space readme loading indicator [[#408](https://github.com/opencloud-eu/web/pull/408)]
- feat: space image loading indicator [[#398](https://github.com/opencloud-eu/web/pull/398)]
- feat: Make app token "label" field available to users [[#393](https://github.com/opencloud-eu/web/pull/393)]
- feat(runtime): enhance app token modal copy view styling [[#386](https://github.com/opencloud-eu/web/pull/386)]
- feat: Use oc-timeline for activities and versions panel [[#366](https://github.com/opencloud-eu/web/pull/366)]
- feat: show 'Personal' instead of username in right side bar [[#346](https://github.com/opencloud-eu/web/pull/346)]

### 📚 Documentation

- fix: remove invalid doc links [[#430](https://github.com/opencloud-eu/web/pull/430)]

### 🐛 Bug Fixes

- fix(design-system): align disabled select appearance with other inputs [[#425](https://github.com/opencloud-eu/web/pull/425)]
- fix(files): hide 'Paste here' label with limited screen space [[#421](https://github.com/opencloud-eu/web/pull/421)]
- fix(external): shared files opening with secure view [[#418](https://github.com/opencloud-eu/web/pull/418)]
- fix: various hovers and small visual glitches [[#395](https://github.com/opencloud-eu/web/pull/395)]
- fix(pkg): space quota background color [[#390](https://github.com/opencloud-eu/web/pull/390)]
- fix(pkg): add missing delete queue to tiles view [[#389](https://github.com/opencloud-eu/web/pull/389)]
- fix(files): copy pasting items into current folder [[#381](https://github.com/opencloud-eu/web/pull/381)]
- fix: select all checkbox in spaces tiles view [[#363](https://github.com/opencloud-eu/web/pull/363)]
- fix: table header overflows content [[#384](https://github.com/opencloud-eu/web/pull/384)]
- fix(admin-settings): outline on space member filter input [[#383](https://github.com/opencloud-eu/web/pull/383)]
- fix(pkg): pixelated previews after searching [[#379](https://github.com/opencloud-eu/web/pull/379)]
- fix(design-system): jumpyness when focusing password input [[#377](https://github.com/opencloud-eu/web/pull/377)]
- fix(files): outline on space member filter input [[#368](https://github.com/opencloud-eu/web/pull/368)]
- fix: Show disabled spaces switch in wrong order [[#367](https://github.com/opencloud-eu/web/pull/367)]
- fix: prevent app tokens from showing in public link settings [[#365](https://github.com/opencloud-eu/web/pull/365)]
- fix: file, folder and space count in right sidebar [[#360](https://github.com/opencloud-eu/web/pull/360)]
- fix(files): deletion date in file details [[#358](https://github.com/opencloud-eu/web/pull/358)]

### ✅ Tests

- test: delete unused uuids [[#378](https://github.com/opencloud-eu/web/pull/378)]
- test: Be less strict when waiting for the "change quota" responses [[#364](https://github.com/opencloud-eu/web/pull/364)]

### 📦️ Dependencies

- chore(deps): update pnpm to v10.7.0 [[#436](https://github.com/opencloud-eu/web/pull/436)]
- fix(deps): update dependency luxon to v3.6.0 [[#427](https://github.com/opencloud-eu/web/pull/427)]
- fix(deps): update dependency eslint-plugin-n to v17.17.0 [[#428](https://github.com/opencloud-eu/web/pull/428)]
- chore(deps): update collabora/code docker tag to v24.04.13.2.1 [[#267](https://github.com/opencloud-eu/web/pull/267)]
- fix(deps): update dependency @sentry/vue to v9.9.0 [[#410](https://github.com/opencloud-eu/web/pull/410)]
- fix(deps): update dependency md-editor-v3 to v5.4.5 [[#417](https://github.com/opencloud-eu/web/pull/417)]
- fix(deps): update dependency @babel/eslint-parser to v7.27.0 [[#409](https://github.com/opencloud-eu/web/pull/409)]
- fix(deps): update typescript-eslint monorepo to v8.28.0 [[#411](https://github.com/opencloud-eu/web/pull/411)]
- fix(deps): update dependency md-editor-v3 to v5.4.4 [[#394](https://github.com/opencloud-eu/web/pull/394)]
- chore(deps): update dependency vite to v6.2.3 [[#405](https://github.com/opencloud-eu/web/pull/405)]
- fix(deps): update dependency @sentry/vue to v9.8.0 [[#391](https://github.com/opencloud-eu/web/pull/391)]
- chore(deps): update dependency eslint to v9.23.0 [[#401](https://github.com/opencloud-eu/web/pull/401)]
- fix(deps): update dependency oidc-client-ts to v3.2.0 [[#316](https://github.com/opencloud-eu/web/pull/316)]
- fix(deps): update dependency @sentry/vue to v9.6.1 [[#362](https://github.com/opencloud-eu/web/pull/362)]
- fix(deps): update dependency axios to v1.8.4 [[#373](https://github.com/opencloud-eu/web/pull/373)]
- fix(deps): update typescript-eslint monorepo to v8.27.0 [[#375](https://github.com/opencloud-eu/web/pull/375)]
- chore(deps): update pnpm to v10.6.5 [[#369](https://github.com/opencloud-eu/web/pull/369)]
- fix(deps): update dependency @uppy/core to v4.4.3 [[#320](https://github.com/opencloud-eu/web/pull/320)]
- fix(deps): update dependency md-editor-v3 to v5.4.2 [[#325](https://github.com/opencloud-eu/web/pull/325)]
- chore(deps): update devdependencies (non-major) [[#342](https://github.com/opencloud-eu/web/pull/342)]
- fix(deps): update dependency @sentry/vue to v9.6.0 - autoclosed [[#338](https://github.com/opencloud-eu/web/pull/338)]
- chore(deps): update pnpm to v10.6.4 [[#323](https://github.com/opencloud-eu/web/pull/323)]

## [2.0.0](https://github.com/opencloud-eu/web/releases/tag/v2.0.0) - 2025-03-18

### ❤️ Thanks to all contributors! ❤️

@AlexAndBear, @JammingBen, @ScharfViktor, @individual-it, @kulmann, @micbar

### 💥 Breaking changes

- Material design [[#291](https://github.com/opencloud-eu/web/pull/291)]

### 📚 Documentation

- feat: add ready release go [[#333](https://github.com/opencloud-eu/web/pull/333)]
- [design-system]: Add docs for component api [[#205](https://github.com/opencloud-eu/web/pull/205)]

### ✅ Tests

- [e2e] Fix flaky collaboration sharing e2e test [[#329](https://github.com/opencloud-eu/web/pull/329)]
- [e2e] Fix e2e tests for CI [[#322](https://github.com/opencloud-eu/web/pull/322)]
- [e2e] Fix e2e tests for CI [[#321](https://github.com/opencloud-eu/web/pull/321)]
- [e2e] Allow space activities to be checked by regex [[#319](https://github.com/opencloud-eu/web/pull/319)]
- [e2e] Fix username in e2e test [[#318](https://github.com/opencloud-eu/web/pull/318)]
- [e2e] Fix typo in env variable [[#317](https://github.com/opencloud-eu/web/pull/317)]
- Fix unit tests for upload info [[#314](https://github.com/opencloud-eu/web/pull/314)]
- Fix test when admin creates spaces in parallel [[#281](https://github.com/opencloud-eu/web/pull/281)]
- Fix useLoadPreview unit tests [[#279](https://github.com/opencloud-eu/web/pull/279)]
- Add unit test: allow email address as user name in user creation form [[#272](https://github.com/opencloud-eu/web/pull/272)]

### 🐛 Bug Fixes

- Minor style fixes [[#326](https://github.com/opencloud-eu/web/pull/326)]
- Fix jumpyness between login and plain view [[#313](https://github.com/opencloud-eu/web/pull/313)]
- Fix mark highlight does not work while searching users [[#309](https://github.com/opencloud-eu/web/pull/309)]
- Fix: auto focus on text editor not present [[#305](https://github.com/opencloud-eu/web/pull/305)]
- Fix: edit space icon not centered [[#304](https://github.com/opencloud-eu/web/pull/304)]
- Fix typo [[#283](https://github.com/opencloud-eu/web/pull/283)]
- Add publicLinkType to public space resource [[#277](https://github.com/opencloud-eu/web/pull/277)]
- Fix empty public link or OCM share page title [[#270](https://github.com/opencloud-eu/web/pull/270)]
- Fix: regex does not allow email addresses as username [[#268](https://github.com/opencloud-eu/web/pull/268)]
- Fix space icon sizing with fallback image [[#252](https://github.com/opencloud-eu/web/pull/252)]
- Fix sorting in spaces view may crash the application [[#255](https://github.com/opencloud-eu/web/pull/255)]
- Fix empty file list [[#254](https://github.com/opencloud-eu/web/pull/254)]
- Fix pwa icon [[#241](https://github.com/opencloud-eu/web/pull/241)]

### 📈 Enhancement

- Increase copied to clipboard timeout [[#312](https://github.com/opencloud-eu/web/pull/312)]
- Fix right sidebar snapping in app wrapper [[#311](https://github.com/opencloud-eu/web/pull/311)]
- Enhance string when upload completed [[#310](https://github.com/opencloud-eu/web/pull/310)]
- Add toolbar with undo and next to text editor [[#306](https://github.com/opencloud-eu/web/pull/306)]
- Don't show password while using generate password method [[#300](https://github.com/opencloud-eu/web/pull/300)]
- Redesign tooltips [[#296](https://github.com/opencloud-eu/web/pull/296)]
- Optimize sidebar behaviour on mobile devices [[#251](https://github.com/opencloud-eu/web/pull/251)]
- Tiles view, replace sort select with less visual obstrutive filter-chip [[#245](https://github.com/opencloud-eu/web/pull/245)]
- Replace oc-select chevron icon and align vertical [[#236](https://github.com/opencloud-eu/web/pull/236)]
- Move include disabled spaces to table settings [[#235](https://github.com/opencloud-eu/web/pull/235)]
- Cut off long urls (including b64 images) [[#229](https://github.com/opencloud-eu/web/pull/229)]
- Enable b64 image upload support [[#225](https://github.com/opencloud-eu/web/pull/225)]

### 📦️ Dependencies

- fix(deps): update babel monorepo to v7.26.10 [[#307](https://github.com/opencloud-eu/web/pull/307)]
- fix(deps): update dependency axios to v1.8.3 [[#293](https://github.com/opencloud-eu/web/pull/293)]
- chore(deps): update dependency happy-dom to v17.4.4 [[#308](https://github.com/opencloud-eu/web/pull/308)]
- fix(deps): update dependency prismjs to v1.30.0 [security] - autoclosed [[#303](https://github.com/opencloud-eu/web/pull/303)]
- fix(deps): update typescript-eslint monorepo to v8.26.1 [[#301](https://github.com/opencloud-eu/web/pull/301)]
- fix(deps): update dependency @sentry/vue to v9.5.0 [[#288](https://github.com/opencloud-eu/web/pull/288)]
- chore(deps): update dependency @playwright/test to v1.51.0 [[#286](https://github.com/opencloud-eu/web/pull/286)]
- fix(deps): update dependency @vueuse/core to v13 [[#298](https://github.com/opencloud-eu/web/pull/298)]
- chore(deps): update dependency vite to v6.2.1 [[#289](https://github.com/opencloud-eu/web/pull/289)]
- chore(deps): update dependency eslint to v9.22.0 [[#297](https://github.com/opencloud-eu/web/pull/297)]
- chore(deps): update vitest monorepo to v3.0.8 [[#285](https://github.com/opencloud-eu/web/pull/285)]
- fix(deps): update dependency axios to v1.8.2 [security] [[#299](https://github.com/opencloud-eu/web/pull/299)]
- chore(deps): update pnpm to v10.6.2 [[#287](https://github.com/opencloud-eu/web/pull/287)]
- fix(deps): update dependency eslint-config-prettier to v10.1.1 [[#290](https://github.com/opencloud-eu/web/pull/290)]
- chore(deps): update dependency happy-dom to v17.4.3 [[#220](https://github.com/opencloud-eu/web/pull/220)]
- chore(deps): update dependency stylelint to v16.15.0 [[#258](https://github.com/opencloud-eu/web/pull/258)]
- fix(deps): update dependency @vueuse/core to v12.8.2 [[#280](https://github.com/opencloud-eu/web/pull/280)]
- fix(deps): update dependency @sentry/vue to v9.4.0 [[#282](https://github.com/opencloud-eu/web/pull/282)]
- fix(deps): update dependency @sentry/vue to v9.3.0 [[#257](https://github.com/opencloud-eu/web/pull/257)]
- chore(deps): update dependency vite-plugin-static-copy to v2.3.0 [[#256](https://github.com/opencloud-eu/web/pull/256)]
- fix(deps): update dependency eslint-plugin-n to v17.16.2 [[#274](https://github.com/opencloud-eu/web/pull/274)]
- chore(deps): update dependency vue-tsc to v2.2.8 [[#261](https://github.com/opencloud-eu/web/pull/261)]
- fix(deps): update dependency eslint-plugin-vue to v10 [[#276](https://github.com/opencloud-eu/web/pull/276)]
- chore(deps): update dependency vite-plugin-dts to v4.5.3 [[#264](https://github.com/opencloud-eu/web/pull/264)]
- chore(deps): update dependency typescript to v5.8.2 [[#259](https://github.com/opencloud-eu/web/pull/259)]
- fix(deps): update dependency eslint-plugin-n to v17.16.1 [[#263](https://github.com/opencloud-eu/web/pull/263)]
- fix(deps): update dependency prettier to v3.5.3 [[#265](https://github.com/opencloud-eu/web/pull/265)]
- fix(deps): update typescript-eslint monorepo to v8.26.0 [[#271](https://github.com/opencloud-eu/web/pull/271)]
- chore(deps): update dependency vite-plugin-dts to v4.5.1 [[#253](https://github.com/opencloud-eu/web/pull/253)]
- chore(deps): update pnpm to v10 [[#130](https://github.com/opencloud-eu/web/pull/130)]
- fix(deps): update dependency vue-router to v4.5.0 [[#119](https://github.com/opencloud-eu/web/pull/119)]
- chore(deps): update dependency vite-plugin-dts to v4.5.0 [[#96](https://github.com/opencloud-eu/web/pull/96)]
- fix(deps): update dependency axios to v1.8.1 [[#246](https://github.com/opencloud-eu/web/pull/246)]
- fix(deps): update dependency eslint-config-prettier to v10.0.2 [[#247](https://github.com/opencloud-eu/web/pull/247)]
- chore(deps): update dependency sass to v1.85.1 [[#233](https://github.com/opencloud-eu/web/pull/233)]
- fix(deps): update dependency @uppy/xhr-upload to v4.3.3 [[#237](https://github.com/opencloud-eu/web/pull/237)]
- chore(deps): update vitest monorepo to v3.0.7 [[#230](https://github.com/opencloud-eu/web/pull/230)]
- fix(deps): update dependency axios to v1.8.0 [[#243](https://github.com/opencloud-eu/web/pull/243)]
- fix(deps): update dependency @sentry/vue to v9.2.0 [[#231](https://github.com/opencloud-eu/web/pull/231)]
- fix(deps): update typescript-eslint monorepo to v8.25.0 [[#232](https://github.com/opencloud-eu/web/pull/232)]
- chore(deps): update dependency vite to v6.2.0 [[#234](https://github.com/opencloud-eu/web/pull/234)]
- chore(deps): update collabora/code docker tag to v24.04.12.4.1 [[#240](https://github.com/opencloud-eu/web/pull/240)]
- chore(deps): update traefik docker tag to v3.3.4 [[#242](https://github.com/opencloud-eu/web/pull/242)]
- chore(deps): update pnpm to v9.15.6 [[#227](https://github.com/opencloud-eu/web/pull/227)]
- fix(deps): update dependency prettier to v3.5.2 [[#222](https://github.com/opencloud-eu/web/pull/222)]
