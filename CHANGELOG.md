# Changelog

## [2.1.2](https://github.com/opencloud-eu/web/releases/tag/v2.1.2) - 2025-09-16

### ❤️ Thanks to all contributors! ❤️

@AlexAndBear, @JammingBen, @ScharfViktor, @kulmann

### 🐛 Bug Fixes

- [stable-2.1] fix: add missing icon for otp [[#670](https://github.com/opencloud-eu/web/pull/670)]
- fix: bring back the left top rounded corner in the app bar [[#651](https://github.com/opencloud-eu/web/pull/651)]
- fix: chrome oh snap errors [[#642](https://github.com/opencloud-eu/web/pull/642)]

### 📦️ Dependencies

- chore(deps): bump pbkdf2 to 3.1.3 to fix CVE (backport) [[#1034](https://github.com/opencloud-eu/web/pull/1034)]
- [full-ci] bump-opencloud-2.0.3 [[#933](https://github.com/opencloud-eu/web/pull/933)]

## [2.1.1](https://github.com/opencloud-eu/web/releases/tag/v2.1.1) - 2025-04-09

### ❤️ Thanks to all contributors! ❤️

@AlexAndBear, @JammingBen, @kulmann

### 🐛 Bug Fixes

- fix: use native fetch for downloading archives [[#525](https://github.com/opencloud-eu/web/pull/525)]
- fix: hide request-id when it's undefined [[#470](https://github.com/opencloud-eu/web/pull/470)]
- fix(files): truncation on long link names [[#489](https://github.com/opencloud-eu/web/pull/489)]
- fix: archive download with archives >2GB [[#467](https://github.com/opencloud-eu/web/pull/467)]
- Don't show backend edition when not set [[#443](https://github.com/opencloud-eu/web/pull/443)]

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
