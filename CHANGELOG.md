# Changelog

## [4.2.0](https://github.com/opencloud-eu/web/releases/tag/v4.2.0) - 2025-10-21

### ❤️ Thanks to all contributors! ❤️

@JammingBen

### 🐛 Bug Fixes

- fix: sidebar messing with tile size [[#1398](https://github.com/opencloud-eu/web/pull/1398)]
- fix: plain view logo UI [[#1396](https://github.com/opencloud-eu/web/pull/1396)]
- fix(external): pixelated rounded corners with Collabora [[#1372](https://github.com/opencloud-eu/web/pull/1372)]

### 📈 Enhancement

- feat: add tiles view to search result page [[#1389](https://github.com/opencloud-eu/web/pull/1389)]
- feat(external): respect light/dark theme in Collabora [[#1376](https://github.com/opencloud-eu/web/pull/1376)]
- feat: show disabled delete button for locked files [[#1366](https://github.com/opencloud-eu/web/pull/1366)]

### 📦️ Dependencies

- chore(deps): update dependency eslint-plugin-unused-imports to v4.3.0 [[#1395](https://github.com/opencloud-eu/web/pull/1395)]
- chore(deps): update dependency happy-dom to v20.0.2 [security] [[#1385](https://github.com/opencloud-eu/web/pull/1385)]
- chore(deps): update dependency eslint-plugin-vue to v10.5.1 [[#1383](https://github.com/opencloud-eu/web/pull/1383)]
- fix(deps): update dependency @sentry/vue to v10.20.0 - autoclosed [[#1384](https://github.com/opencloud-eu/web/pull/1384)]
- fix(deps): update dependency vue-router to v4.6.3 [[#1375](https://github.com/opencloud-eu/web/pull/1375)]
- chore(deps): update pnpm to v10.18.3 [[#1374](https://github.com/opencloud-eu/web/pull/1374)]
- chore(deps): update typescript-eslint monorepo to v8.46.1 [[#1368](https://github.com/opencloud-eu/web/pull/1368)]
- chore(deps): update dependency dompurify to v3.3.0 [[#1367](https://github.com/opencloud-eu/web/pull/1367)]

## [4.1.0](https://github.com/opencloud-eu/web/releases/tag/v4.1.0) - 2025-10-13

### ❤️ Thanks to all contributors! ❤️

@AlexAndBear, @JammingBen, @ScharfViktor, @kulmann, @prashant-gurung899, @saw-jan, @tammi-23

### 🐛 Bug Fixes

- fix: rounded bottom corner on tile preview hover [[#1363](https://github.com/opencloud-eu/web/pull/1363)]
- fix: show previews in trash overview [[#1362](https://github.com/opencloud-eu/web/pull/1362)]
- fix: remove share avatar click handler in files table [[#1349](https://github.com/opencloud-eu/web/pull/1349)]
- fix(design-system): translate default modal action button labels [[#1347](https://github.com/opencloud-eu/web/pull/1347)]
- fix: mobile tiles view right click menu [[#1345](https://github.com/opencloud-eu/web/pull/1345)]
- fix(admin-settings): redirect when accessing /admin-settings [[#1337](https://github.com/opencloud-eu/web/pull/1337)]
- fix: disable echart loading in text editor [[#1332](https://github.com/opencloud-eu/web/pull/1332)]
- fix: sidebar versions loading (performance) [[#1285](https://github.com/opencloud-eu/web/pull/1285)]
- fix: normalize file and folder names to NFC when uploading [[#1327](https://github.com/opencloud-eu/web/pull/1327)]
- fix: prevent uploading the same file again during upload [[#1277](https://github.com/opencloud-eu/web/pull/1277)]
- fix: resolve axe violations (button-name, empty-table-header, spinner) [[#1296](https://github.com/opencloud-eu/web/pull/1296)]
- fix: clean failed uploads when closing upload overlay [[#1300](https://github.com/opencloud-eu/web/pull/1300)]
- fix: user group assignment options, details panel alignment [[#1298](https://github.com/opencloud-eu/web/pull/1298)]
- fix: topbar save icon hover color and thumbnail compression [[#1294](https://github.com/opencloud-eu/web/pull/1294)]
- fix(admin-settings): space list and sidebar issues [[#1286](https://github.com/opencloud-eu/web/pull/1286)]
- fix: sync color role defaults with opencloud theme.json [[#1274](https://github.com/opencloud-eu/web/pull/1274)]
- fix: add missing web-pkg types and fix type errors [[#1266](https://github.com/opencloud-eu/web/pull/1266)]

### 📈 Enhancement

- feat: add tiles view for shared with me view [[#1352](https://github.com/opencloud-eu/web/pull/1352)]
- feat: add tiles view for shared with others view [[#1346](https://github.com/opencloud-eu/web/pull/1346)]
- feat: add tiles view for shared via link view [[#1343](https://github.com/opencloud-eu/web/pull/1343)]
- feat: tiles view for trash [[#1310](https://github.com/opencloud-eu/web/pull/1310)]
- feat: send server url sha256 encoded to update server [[#1311](https://github.com/opencloud-eu/web/pull/1311)]
- feat: add update check for mobile view [[#1323](https://github.com/opencloud-eu/web/pull/1323)]
- feat: set view mode e.G tiles or table view  globally, add condensed view to Spaces view   [[#1306](https://github.com/opencloud-eu/web/pull/1306)]
- feat: add top bar logo for mobile view [[#1281](https://github.com/opencloud-eu/web/pull/1281)]
- feat(extension-sdk): provide default tailwind config  [[#1275](https://github.com/opencloud-eu/web/pull/1275)]
- feat: account page enhancements: remove last table row border, adjust… [[#1272](https://github.com/opencloud-eu/web/pull/1272)]
- feat: load config authenticated [[#1249](https://github.com/opencloud-eu/web/pull/1249)]
- feat(extension-sdk): add tailwind vite plugin to vite config [[#1256](https://github.com/opencloud-eu/web/pull/1256)]
- feat: add shift + mouse scroll for zoom out and zoom in in preview app [[#1248](https://github.com/opencloud-eu/web/pull/1248)]
- feat: add more screen real estate for images in preview app [[#1241](https://github.com/opencloud-eu/web/pull/1241)]
- feat: add dark mode for OcDatePicker [[#1235](https://github.com/opencloud-eu/web/pull/1235)]

### ✅ Tests

- fix (test-e2e): proper use of keycloak admin user [[#1348](https://github.com/opencloud-eu/web/pull/1348)]
- [localization-de] e2e. ensure German localization is correct [[#1193](https://github.com/opencloud-eu/web/pull/1193)]
- fail accessibility tests on any violation [[#1319](https://github.com/opencloud-eu/web/pull/1319)]
- [full-ci][tests-only] Increase playwright timeout [[#1267](https://github.com/opencloud-eu/web/pull/1267)]

### 📦️ Dependencies

- fix(deps): update uppy monorepo [[#1344](https://github.com/opencloud-eu/web/pull/1344)]
- chore(deps): update pnpm to v10.18.2 [[#1353](https://github.com/opencloud-eu/web/pull/1353)]
- chore(deps): update dependency happy-dom to v20 [[#1354](https://github.com/opencloud-eu/web/pull/1354)]
- fix(deps): update dependency @sentry/vue to v10.19.0 [[#1350](https://github.com/opencloud-eu/web/pull/1350)]
- chore(deps): update collabora/code docker tag to v25.04.6.1.1 [[#1109](https://github.com/opencloud-eu/web/pull/1109)]
- fix(deps): update dependency @sentry/vue to v10.18.0 [[#1328](https://github.com/opencloud-eu/web/pull/1328)]
- chore(deps): update dependency @cucumber/messages to v30 [[#1315](https://github.com/opencloud-eu/web/pull/1315)]
- chore(deps): update dependency pino to v10 [[#1314](https://github.com/opencloud-eu/web/pull/1314)]
- fix(deps): update dependency zod to v4.1.12 [[#1321](https://github.com/opencloud-eu/web/pull/1321)]
- chore(deps): update pnpm to v10.18.1 [[#1320](https://github.com/opencloud-eu/web/pull/1320)]
- chore(deps): update typescript-eslint monorepo to v8.46.0 [[#1324](https://github.com/opencloud-eu/web/pull/1324)]
- chore(deps): update dependency @vavt/cm-extension to v1.11.1 [[#1325](https://github.com/opencloud-eu/web/pull/1325)]
- chore(deps): update pnpm to v10.18.0 [[#1312](https://github.com/opencloud-eu/web/pull/1312)]
- chore(deps): update devdependencies (non-major) [[#1313](https://github.com/opencloud-eu/web/pull/1313)]
- chore(deps): update dependency pino to v9.13.0 [[#1305](https://github.com/opencloud-eu/web/pull/1305)]
- chore(deps): update devdependencies (non-major) [[#1303](https://github.com/opencloud-eu/web/pull/1303)]
- chore(deps): update dependency vite to v7.1.8 [[#1302](https://github.com/opencloud-eu/web/pull/1302)]
- chore(deps): update dependency @tailwindcss/vite to v4.1.14 [[#1301](https://github.com/opencloud-eu/web/pull/1301)]
- fix(deps): update dependency p-queue to v9 [[#1295](https://github.com/opencloud-eu/web/pull/1295)]
- chore(deps): update devdependencies (non-major) [[#1290](https://github.com/opencloud-eu/web/pull/1290)]
- fix(deps): update dependency @sentry/vue to v10.17.0 [[#1288](https://github.com/opencloud-eu/web/pull/1288)]
- chore(deps): update dependency happy-dom to v19.0.2 [[#1284](https://github.com/opencloud-eu/web/pull/1284)]
- fix(deps): update dependency @sentry/vue to v10.16.0 [[#1283](https://github.com/opencloud-eu/web/pull/1283)]
- chore(deps): update typescript-eslint monorepo to v8.45.0 [[#1282](https://github.com/opencloud-eu/web/pull/1282)]
- chore(deps): update traefik docker tag to v3.5.3 [[#1271](https://github.com/opencloud-eu/web/pull/1271)]
- chore(deps): update devdependencies (non-major) [[#1254](https://github.com/opencloud-eu/web/pull/1254)]
- chore(deps): update dependency happy-dom to v19 [[#1273](https://github.com/opencloud-eu/web/pull/1273)]
- fix(deps): update dependency @sentry/vue to v10.15.0 [[#1260](https://github.com/opencloud-eu/web/pull/1260)]
- fix(deps): update vue monorepo to v3.5.22 [[#1262](https://github.com/opencloud-eu/web/pull/1262)]
- chore(deps): update node.js to v22.20.0 [[#1258](https://github.com/opencloud-eu/web/pull/1258)]
- chore(design-system): remove sass dependencies [[#1255](https://github.com/opencloud-eu/web/pull/1255)]
- fix(deps): update dependency @sentry/vue to v10.14.0 [[#1253](https://github.com/opencloud-eu/web/pull/1253)]
- chore(deps): update dependency @playwright/test to v1.55.1 [[#1252](https://github.com/opencloud-eu/web/pull/1252)]
- fix(deps): update dependency @sentry/vue to v10.13.0 [[#1243](https://github.com/opencloud-eu/web/pull/1243)]
- chore(deps): update devdependencies (non-major) [[#1246](https://github.com/opencloud-eu/web/pull/1246)]
- fix(deps): update typescript-eslint monorepo to v8.44.1 [[#1247](https://github.com/opencloud-eu/web/pull/1247)]
- chore(deps): update pnpm to v10.17.1 [[#1245](https://github.com/opencloud-eu/web/pull/1245)]
- [full-ci] bump-opencloud-3.5.0. run all tests [[#1240](https://github.com/opencloud-eu/web/pull/1240)]

## [4.0.0](https://github.com/opencloud-eu/web/releases/tag/v4.0.0) - 2025-09-22

### ❤️ Thanks to all contributors! ❤️

@AlexAndBear, @JammingBen, @ScharfViktor, @dschmidt, @individual-it, @kulmann, @tammi-23

### 💥 Breaking changes

- chore!: remove token generation and unnecessary theming options [[#1161](https://github.com/opencloud-eu/web/pull/1161)]
- refactor!: remove scss files [[#1153](https://github.com/opencloud-eu/web/pull/1153)]

### ✨ Features

- feat: add view mode switch to mobile view [[#1157](https://github.com/opencloud-eu/web/pull/1157)]
- feat: hide Login allowed for users [[#1121](https://github.com/opencloud-eu/web/pull/1121)]

### 📚 Documentation

- docs(design-system): add tailwind migration docs [[#1221](https://github.com/opencloud-eu/web/pull/1221)]

### 🐛 Bug Fixes

- fix: authenticated requests in password protected public links [[#1233](https://github.com/opencloud-eu/web/pull/1233)]
- fix: visual glitch when checking checkboxes [[#1230](https://github.com/opencloud-eu/web/pull/1230)]
- fix: adjust space description [[#1206](https://github.com/opencloud-eu/web/pull/1206)]
- App store style fixes [[#1218](https://github.com/opencloud-eu/web/pull/1218)]
- fix: tailwind regressions #3 [[#1216](https://github.com/opencloud-eu/web/pull/1216)]
- fix: line-height of resource name [[#1209](https://github.com/opencloud-eu/web/pull/1209)]
- fix: avatar alignment and z-index [[#1203](https://github.com/opencloud-eu/web/pull/1203)]
- fix: check byte length on name validation instead of character count [[#1187](https://github.com/opencloud-eu/web/pull/1187)]
- fix: tailwind regressions [[#1183](https://github.com/opencloud-eu/web/pull/1183)]
- fix: space edit readme button visible for space members without permissions [[#1180](https://github.com/opencloud-eu/web/pull/1180)]
- fix: file delete batch action appears in the project spaces overview leading to errors [[#1176](https://github.com/opencloud-eu/web/pull/1176)]
- fix: space description doesn't collapse [[#1174](https://github.com/opencloud-eu/web/pull/1174)]
- fix: shortcut links not opening in tiles view [[#1166](https://github.com/opencloud-eu/web/pull/1166)]
- fix: opening image with right sidebar being opened [[#1163](https://github.com/opencloud-eu/web/pull/1163)]
- fix(design-system): docs after tailwind migration [[#1132](https://github.com/opencloud-eu/web/pull/1132)]
- fix: tailwind regressions [[#1126](https://github.com/opencloud-eu/web/pull/1126)]
- fix: font-weight in contextual helpers [[#1101](https://github.com/opencloud-eu/web/pull/1101)]
- fix: tailwind reference [[#1086](https://github.com/opencloud-eu/web/pull/1086)]
- fix: Added advanced Shift-Click-Handling for Files [[#824](https://github.com/opencloud-eu/web/pull/824)]

### 📈 Enhancement

- feat: remove edit space description inline button [[#1219](https://github.com/opencloud-eu/web/pull/1219)]
- fix: adjusted notification area with tailwind [[#1168](https://github.com/opencloud-eu/web/pull/1168)]
- feat: Oc card component [[#1172](https://github.com/opencloud-eu/web/pull/1172)]
- feat: set tiles view as default view option [[#1159](https://github.com/opencloud-eu/web/pull/1159)]
- refactor: migrate z-index to tailwind [[#1156](https://github.com/opencloud-eu/web/pull/1156)]
- refactor: remaining css props to tailwind #2 [[#1152](https://github.com/opencloud-eu/web/pull/1152)]
- refactor: remaining css to tailwind #1 [[#1151](https://github.com/opencloud-eu/web/pull/1151)]
- refactor: migrate grid to tailwind [[#1148](https://github.com/opencloud-eu/web/pull/1148)]
- refactor: remaining flex props, display and fill to tailwind [[#1146](https://github.com/opencloud-eu/web/pull/1146)]
- refactor: box-shadow, opacity, filter and pointer-event to tailwind [[#1142](https://github.com/opencloud-eu/web/pull/1142)]
- refactor: transitions and animations to tailwind [[#1141](https://github.com/opencloud-eu/web/pull/1141)]
- feat: enable feedback link and fix button color [[#1145](https://github.com/opencloud-eu/web/pull/1145)]
- refactor: gaps to tailwind [[#1136](https://github.com/opencloud-eu/web/pull/1136)]
- chore: adjust position css props to tailwind [[#1130](https://github.com/opencloud-eu/web/pull/1130)]
- refactor: overflow to tailwind [[#1131](https://github.com/opencloud-eu/web/pull/1131)]
- refactor: height to tailwind [[#1129](https://github.com/opencloud-eu/web/pull/1129)]
- refactor: width to tailwind [[#1120](https://github.com/opencloud-eu/web/pull/1120)]
- refactor: migrate outlines to tailwind [[#1116](https://github.com/opencloud-eu/web/pull/1116)]
- refactor: borders to tailwind [[#1111](https://github.com/opencloud-eu/web/pull/1111)]
- refactor: colors to tailwind [[#1099](https://github.com/opencloud-eu/web/pull/1099)]
- refactor: word breaks and truncation to tailwind [[#1097](https://github.com/opencloud-eu/web/pull/1097)]
- refactor: text-align and vertical-align to tailwind [[#1094](https://github.com/opencloud-eu/web/pull/1094)]
- refactor: font-weight and text-decoration to tailwind [[#1093](https://github.com/opencloud-eu/web/pull/1093)]
- refactor: migrate font-size and line-height to tailwind [[#1091](https://github.com/opencloud-eu/web/pull/1091)]
- refactor: tailwind spacings [[#1082](https://github.com/opencloud-eu/web/pull/1082)]
- feat: add tailwindcss and replace oc-m/p classes [[#1073](https://github.com/opencloud-eu/web/pull/1073)]

### ✅ Tests

- fix flaky. sharing test [[#1212](https://github.com/opencloud-eu/web/pull/1212)]
- e2e. view mode switch [[#1177](https://github.com/opencloud-eu/web/pull/1177)]
- e2e-tests. remove create odt file from mobile suite [[#1186](https://github.com/opencloud-eu/web/pull/1186)]
- Expand accessibility testing coverage [[#1164](https://github.com/opencloud-eu/web/pull/1164)]
- fix mobile flaky test [[#1173](https://github.com/opencloud-eu/web/pull/1173)]
- fix: remove flaky resourceExists [[#1144](https://github.com/opencloud-eu/web/pull/1144)]
- e2e: flaky after closing text file [[#1139](https://github.com/opencloud-eu/web/pull/1139)]

### 📦️ Dependencies

- fix(deps): update dependency eslint-plugin-vue to v10.5.0 [[#1231](https://github.com/opencloud-eu/web/pull/1231)]
- chore: update md-editor-v3 to v6.0.1 [[#1234](https://github.com/opencloud-eu/web/pull/1234)]
- chore(deps): update dependency vite to v7.1.7 [[#1229](https://github.com/opencloud-eu/web/pull/1229)]
- chore(deps): update devdependencies (non-major) [[#1226](https://github.com/opencloud-eu/web/pull/1226)]
- fix(deps): update dependency zod to v4.1.11 - autoclosed [[#1227](https://github.com/opencloud-eu/web/pull/1227)]
- fix(deps): update dependency filesize to v11.0.13 [[#1225](https://github.com/opencloud-eu/web/pull/1225)]
- chore(deps): update dependency @cucumber/pretty-formatter to v2.3.0 [[#1222](https://github.com/opencloud-eu/web/pull/1222)]
- fix(deps): update dependency eslint-plugin-n to v17.23.1 [[#1220](https://github.com/opencloud-eu/web/pull/1220)]
- chore(deps): update dependency vite to v7 [[#853](https://github.com/opencloud-eu/web/pull/853)]
- fix(deps): update dependency luxon to v3.7.2 [[#1192](https://github.com/opencloud-eu/web/pull/1192)]
- chore(deps): update dependency @noble/hashes to v2 [[#1118](https://github.com/opencloud-eu/web/pull/1118)]
- chore(deps): update dependency jsdom to v27 [[#1205](https://github.com/opencloud-eu/web/pull/1205)]
- fix(deps): update dependency uuid to v13 [[#1208](https://github.com/opencloud-eu/web/pull/1208)]
- fix(deps): update dependency globals to v16.4.0 [[#1201](https://github.com/opencloud-eu/web/pull/1201)]
- chore(deps): update apache/tika docker tag to v3.2.3.0 [[#1198](https://github.com/opencloud-eu/web/pull/1198)]
- chore(deps): update pnpm to v10.17.0 [[#1214](https://github.com/opencloud-eu/web/pull/1214)]
- chore(deps): update dependency pino to v9.10.0 [[#1215](https://github.com/opencloud-eu/web/pull/1215)]
- fix(deps): update dependency dompurify to v3.2.7 [[#1213](https://github.com/opencloud-eu/web/pull/1213)]
- chore(deps): update pnpm to v10.16.1 [[#1197](https://github.com/opencloud-eu/web/pull/1197)]
- chore(deps): update node.js to v22.19.0 [[#1196](https://github.com/opencloud-eu/web/pull/1196)]
- fix(deps): update dependency zod to v4.1.9 [[#1211](https://github.com/opencloud-eu/web/pull/1211)]
- fix(deps): update dependency @sentry/vue to v10.12.0 [[#1210](https://github.com/opencloud-eu/web/pull/1210)]
- fix(deps): update uppy monorepo [[#1100](https://github.com/opencloud-eu/web/pull/1100)]
- chore(deps): update dependency @cucumber/messages to v29 [[#1204](https://github.com/opencloud-eu/web/pull/1204)]
- fix(deps): update dependency eslint-plugin-n to v17.23.0 [[#1199](https://github.com/opencloud-eu/web/pull/1199)]
- fix(deps): update typescript-eslint monorepo to v8.44.0 [[#1202](https://github.com/opencloud-eu/web/pull/1202)]
- chore(deps): update traefik docker tag to v3.5.2 [[#1127](https://github.com/opencloud-eu/web/pull/1127)]
- chore(deps): update devdependencies (non-major) [[#1078](https://github.com/opencloud-eu/web/pull/1078)]
- fix(deps): update dependency p-queue to v8.1.1 [[#1195](https://github.com/opencloud-eu/web/pull/1195)]
- fix(deps): update dependency md-editor-v3 to v5.8.5 [[#1194](https://github.com/opencloud-eu/web/pull/1194)]
- fix(deps): update dependency @babel/eslint-parser to v7.28.4 [[#1189](https://github.com/opencloud-eu/web/pull/1189)]
- fix(deps): update dependency focus-trap-vue to v4.1.0 [[#1076](https://github.com/opencloud-eu/web/pull/1076)]
- fix(deps): update dependency axios to v1.12.2 [[#1190](https://github.com/opencloud-eu/web/pull/1190)]
- fix(deps): update uppy monorepo (major) [[#1110](https://github.com/opencloud-eu/web/pull/1110)]
- fix(deps): update vue monorepo to v3.5.21 [[#1102](https://github.com/opencloud-eu/web/pull/1102)]
- fix(deps): update dependency eslint-plugin-unused-imports to v4.2.0 [[#1088](https://github.com/opencloud-eu/web/pull/1088)]
- fix(deps): update dependency @sentry/vue to v10.11.0 [[#1122](https://github.com/opencloud-eu/web/pull/1122)]
- fix(deps): update dependency @vueuse/core to v13.9.0 [[#1123](https://github.com/opencloud-eu/web/pull/1123)]
- fix(deps): update dependency zod to v4.1.8 [[#1128](https://github.com/opencloud-eu/web/pull/1128)]
- fix(deps): update dependency axios to v1.12.0 [security] [[#1185](https://github.com/opencloud-eu/web/pull/1185)]
- chore(deps): update dependency vite to v6.3.6 [security] [[#1167](https://github.com/opencloud-eu/web/pull/1167)]
- [full-ci] bump-opencloud-3.4.0. run all tests [[#1137](https://github.com/opencloud-eu/web/pull/1137)]
- use bitnamilegacy [[#1133](https://github.com/opencloud-eu/web/pull/1133)]
- chore: adjust display css props to tailwind [[#1114](https://github.com/opencloud-eu/web/pull/1114)]
- fix(deps): update typescript-eslint monorepo to v8.41.0 [[#1117](https://github.com/opencloud-eu/web/pull/1117)]
- chore(deps): update pnpm to v10.15.0 [[#1095](https://github.com/opencloud-eu/web/pull/1095)]
- fix(deps): update dependency @vavt/cm-extension to v1.11.0 [[#1113](https://github.com/opencloud-eu/web/pull/1113)]
- fix(deps): update dependency @vueuse/core to v13.7.0 [[#1087](https://github.com/opencloud-eu/web/pull/1087)]
- fix(deps): update dependency zod to v4.1.3 [[#1070](https://github.com/opencloud-eu/web/pull/1070)]
- fix(deps): update dependency @sentry/vue to v10.5.0 [[#1068](https://github.com/opencloud-eu/web/pull/1068)]
- fix(deps): update typescript-eslint monorepo to v8.40.0 [[#1075](https://github.com/opencloud-eu/web/pull/1075)]
- chore(deps): update apache/tika docker tag to v3.2.2.0 [[#1066](https://github.com/opencloud-eu/web/pull/1066)]
- chore(deps): update dependency vite-plugin-static-copy to v3.1.2 [security] [[#1106](https://github.com/opencloud-eu/web/pull/1106)]
- [full-ci] bump-opencloud-3.3.0. run all tests [[#1074](https://github.com/opencloud-eu/web/pull/1074)]

## [3.3.0](https://github.com/opencloud-eu/web/releases/tag/v3.3.0) - 2025-08-11

### ❤️ Thanks to all contributors! ❤️

@AlexAndBear, @JammingBen, @ScharfViktor, @individual-it, @kulmann, @prashant-gurung899

### ✨ Features

- Add bottom drawer for mobile devices [[#985](https://github.com/opencloud-eu/web/pull/985)]

### 🐛 Bug Fixes

- fix: incoming group share name in sidebar [[#1060](https://github.com/opencloud-eu/web/pull/1060)]
- fix: dynamic viewport height on mobile devices [[#1058](https://github.com/opencloud-eu/web/pull/1058)]
- fix: crippled search after leaving public link [[#1053](https://github.com/opencloud-eu/web/pull/1053)]
- fix extension registry stable order [[#1046](https://github.com/opencloud-eu/web/pull/1046)]
- fix: resource deselect when clicking esc in a modal [[#1051](https://github.com/opencloud-eu/web/pull/1051)]
- fix: pasting files from local clipboard [[#1047](https://github.com/opencloud-eu/web/pull/1047)]
- fix: search preview design [[#1008](https://github.com/opencloud-eu/web/pull/1008)]
- fix: sidebar actions panel design [[#1005](https://github.com/opencloud-eu/web/pull/1005)]
- fix: show explicit error message, when trying to upload space image but quota is exceeded [[#1003](https://github.com/opencloud-eu/web/pull/1003)]

### 📈 Enhancement

- feat: change bottom drawer to less technical context menu label [[#1063](https://github.com/opencloud-eu/web/pull/1063)]
- feat: add drilldown menu for sub menus on mobile devices [[#1017](https://github.com/opencloud-eu/web/pull/1017)]
- feat(preview): add webp as supported mimetype [[#1062](https://github.com/opencloud-eu/web/pull/1062)]
- feat: preserve empty folders on upload [[#1018](https://github.com/opencloud-eu/web/pull/1018)]
- feat: dispatch pathchange event for external integrations [[#1033](https://github.com/opencloud-eu/web/pull/1033)]
- feat: only request thumnail if server support is guaranteed [[#874](https://github.com/opencloud-eu/web/pull/874)]
- feat: improve tile sort menu drop and drawer design [[#1004](https://github.com/opencloud-eu/web/pull/1004)]
- feat: improve and align drop and drawer design [[#997](https://github.com/opencloud-eu/web/pull/997)]
- feat: make web installable as PWA [[#980](https://github.com/opencloud-eu/web/pull/980)]

### ✅ Tests

- test: fix unit test warnings [[#1067](https://github.com/opencloud-eu/web/pull/1067)]
- enable upload tests for webkit [[#1057](https://github.com/opencloud-eu/web/pull/1057)]
- upload image from clipboard test [[#1049](https://github.com/opencloud-eu/web/pull/1049)]
- Mobile view tests [[#1006](https://github.com/opencloud-eu/web/pull/1006)]
- fix keycloak flaky test [[#1021](https://github.com/opencloud-eu/web/pull/1021)]
- fix flaky close viewer after download [[#1010](https://github.com/opencloud-eu/web/pull/1010)]
- e2e-test. fix share with multiple user test [[#1013](https://github.com/opencloud-eu/web/pull/1013)]
- change browser in the script [[#998](https://github.com/opencloud-eu/web/pull/998)]
- cross browser testing [[#954](https://github.com/opencloud-eu/web/pull/954)]
- [full-ci] add pipeline to send CI notifications to matrix-channel [[#960](https://github.com/opencloud-eu/web/pull/960)]
- clear input for md and odt files [[#987](https://github.com/opencloud-eu/web/pull/987)]
- e2e-tests. clear input before fill name [[#982](https://github.com/opencloud-eu/web/pull/982)]

### 📦️ Dependencies

- chore(deps): update dependency eslint to v9.33.0 [[#1069](https://github.com/opencloud-eu/web/pull/1069)]
- chore(deps): update dependency pino to v9.8.0 [[#1065](https://github.com/opencloud-eu/web/pull/1065)]
- fix(deps): update dependency @sentry/vue to v10.2.0 [[#1059](https://github.com/opencloud-eu/web/pull/1059)]
- fix(deps): update uppy monorepo [[#1028](https://github.com/opencloud-eu/web/pull/1028)]
- chore(deps): update devdependencies (non-major) [[#1054](https://github.com/opencloud-eu/web/pull/1054)]
- fix(deps): update dependency zod to v4.0.15 [[#1055](https://github.com/opencloud-eu/web/pull/1055)]
- fix(deps): update dependency @sentry/vue to v10.1.0 [[#1041](https://github.com/opencloud-eu/web/pull/1041)]
- fix(deps): update typescript-eslint monorepo to v8.39.0 [[#1048](https://github.com/opencloud-eu/web/pull/1048)]
- chore(deps): update dependency vue-tsc to v3.0.5 [[#1045](https://github.com/opencloud-eu/web/pull/1045)]
- chore(deps): update collabora/code docker tag to v25.04.4.2.1 [[#1035](https://github.com/opencloud-eu/web/pull/1035)]
- fix(deps): update dependency md-editor-v3 to v5.8.4 [[#1044](https://github.com/opencloud-eu/web/pull/1044)]
- fix(deps): update dependency @sentry/vue to v10 [[#1043](https://github.com/opencloud-eu/web/pull/1043)]
- chore(deps): update node.js to v22.18.0 [[#1040](https://github.com/opencloud-eu/web/pull/1040)]
- chore(deps): update pnpm to v10.14.0 [[#1039](https://github.com/opencloud-eu/web/pull/1039)]
- chore(deps): update devdependencies (non-major) [[#1038](https://github.com/opencloud-eu/web/pull/1038)]
- chore(deps): update dependency pino-pretty to v13.1.1 [[#1032](https://github.com/opencloud-eu/web/pull/1032)]
- fix(deps): update dependency eslint-plugin-vue to v10.4.0 [[#1036](https://github.com/opencloud-eu/web/pull/1036)]
- chore(deps): bump pbkdf2 to 3.1.3 to fix CVE [[#993](https://github.com/opencloud-eu/web/pull/993)]
- fix(deps): update dependency zod to v4.0.14 [[#1031](https://github.com/opencloud-eu/web/pull/1031)]
- fix(deps): update dependency zod to v4.0.13 [[#1026](https://github.com/opencloud-eu/web/pull/1026)]
- fix(deps): update dependency @sentry/vue to v9.43.0 [[#1027](https://github.com/opencloud-eu/web/pull/1027)]
- fix(deps): update dependency md-editor-v3 to v5.8.3 [[#1025](https://github.com/opencloud-eu/web/pull/1025)]
- chore(deps): update dependency @types/luxon to v3.7.1 [[#1029](https://github.com/opencloud-eu/web/pull/1029)]
- chore(deps): update dependency @types/luxon to v3.7.0 [[#1023](https://github.com/opencloud-eu/web/pull/1023)]
- fix(deps): update dependency eslint-plugin-n to v17.21.3 [[#1015](https://github.com/opencloud-eu/web/pull/1015)]
- fix(deps): update dependency @vueuse/core to v13.6.0 [[#1019](https://github.com/opencloud-eu/web/pull/1019)]
- fix(deps): update dependency @sentry/vue to v9.42.1 [[#1020](https://github.com/opencloud-eu/web/pull/1020)]
- fix(deps): update dependency zod to v4.0.11 [[#1024](https://github.com/opencloud-eu/web/pull/1024)]
- chore(deps): update devdependencies (non-major) [[#1014](https://github.com/opencloud-eu/web/pull/1014)]
- fix(deps): update dependency @sentry/vue to v9.42.0 [[#1012](https://github.com/opencloud-eu/web/pull/1012)]
- chore(deps): update dependency vue-tsc to v3.0.4 [[#989](https://github.com/opencloud-eu/web/pull/989)]
- chore(deps): update traefik docker tag to v3.5.0 - autoclosed [[#1002](https://github.com/opencloud-eu/web/pull/1002)]
- fix(deps): update dependency zod to v4.0.10 [[#1007](https://github.com/opencloud-eu/web/pull/1007)]
- fix(deps): update dependency @sentry/vue to v9.41.0 [[#1009](https://github.com/opencloud-eu/web/pull/1009)]
- fix(deps): update dependency zod to v4.0.8 [[#1000](https://github.com/opencloud-eu/web/pull/1000)]
- fix(deps): update vue monorepo to v3.5.18 [[#990](https://github.com/opencloud-eu/web/pull/990)]
- fix(deps): update dependency axios to v1.11.0 [[#991](https://github.com/opencloud-eu/web/pull/991)]
- chore(deps): update dependency @cucumber/messages to v28.1.0 [[#984](https://github.com/opencloud-eu/web/pull/984)]
- fix(deps): update typescript-eslint monorepo to v8.38.0 [[#986](https://github.com/opencloud-eu/web/pull/986)]
- [full-ci] bump-opencloud-3.2.0. run all tests [[#983](https://github.com/opencloud-eu/web/pull/983)]
- fix(deps): update dependency md-editor-v3 to v5.8.2 [[#972](https://github.com/opencloud-eu/web/pull/972)]
- chore(deps): update dependency @cucumber/pretty-formatter to v2 [[#973](https://github.com/opencloud-eu/web/pull/973)]
- chore(deps): update devdependencies (non-major) [[#974](https://github.com/opencloud-eu/web/pull/974)]
- fix(deps): update dependency eslint-config-prettier to v10.1.8 [[#975](https://github.com/opencloud-eu/web/pull/975)]

## [3.2.0](https://github.com/opencloud-eu/web/releases/tag/v3.2.0) - 2025-07-21

### ❤️ Thanks to all contributors! ❤️

@AlexAndBear, @JammingBen, @ScharfViktor, @fschade, @individual-it, @kulmann, @openclouders, @prashant-gurung899

### 🐛 Bug Fixes

- fix: markdown editor, adjust word break [[#976](https://github.com/opencloud-eu/web/pull/976)]
- fix: add missing quotes to modal titles [[#967](https://github.com/opencloud-eu/web/pull/967)]
- fix: show more details in trash overview filter when filtering is active [[#949](https://github.com/opencloud-eu/web/pull/949)]
- test: get rid of unit test warnings [Vue warn]: Component is missing … [[#950](https://github.com/opencloud-eu/web/pull/950)]
- fix: release branch fails due to prettier incompatible with auto gene… [[#946](https://github.com/opencloud-eu/web/pull/946)]
- chore(ci): use corepack for translation sync [[#945](https://github.com/opencloud-eu/web/pull/945)]
- fix(design-system): default colors for some of the icons [[#908](https://github.com/opencloud-eu/web/pull/908)]

### ✅ Tests

- e2e test. Empty trashbin using quick action [[#953](https://github.com/opencloud-eu/web/pull/953)]
- [full-ci] e2e tests. fix app-provider flaky test. Disable welcome popup [[#917](https://github.com/opencloud-eu/web/pull/917)]
- e2e tests. set space image using context menu [[#916](https://github.com/opencloud-eu/web/pull/916)]
- update keycloak tests [[#906](https://github.com/opencloud-eu/web/pull/906)]
- enable a11y tests in CI [[#886](https://github.com/opencloud-eu/web/pull/886)]
- [full-ci] flush all the build cache [[#838](https://github.com/opencloud-eu/web/pull/838)]

### 📈 Enhancement

- feat: consistent entity names in continuous text [[#919](https://github.com/opencloud-eu/web/pull/919)]
- Improve Trashbin  [[#905](https://github.com/opencloud-eu/web/pull/905)]
- feat: revert material design color hacks [[#912](https://github.com/opencloud-eu/web/pull/912)]
- feat: add context actions to trash [[#887](https://github.com/opencloud-eu/web/pull/887)]
- feat: improve visual representation on file name input errors [[#876](https://github.com/opencloud-eu/web/pull/876)]

### 📦️ Dependencies

- chore(deps): update collabora/code docker tag to v25.04.4.1.1 [[#965](https://github.com/opencloud-eu/web/pull/965)]
- chore(deps): update dependency vue-tsc to v3.0.2 [[#963](https://github.com/opencloud-eu/web/pull/963)]
- fix(deps): update dependency @sentry/vue to v9.40.0 [[#964](https://github.com/opencloud-eu/web/pull/964)]
- fix(deps): update dependency filesize to v11.0.2 [[#961](https://github.com/opencloud-eu/web/pull/961)]
- fix(deps): update dependency md-editor-v3 to v5.8.1 [[#957](https://github.com/opencloud-eu/web/pull/957)]
- chore(deps): update node.js to v22.17.1 [[#959](https://github.com/opencloud-eu/web/pull/959)]
- fix(deps): update dependency @sentry/vue to v9.39.0 [[#958](https://github.com/opencloud-eu/web/pull/958)]
- fix(deps): update typescript-eslint monorepo to v8.37.0 [[#955](https://github.com/opencloud-eu/web/pull/955)]
- fix(deps): update dependency filesize to v11 [[#939](https://github.com/opencloud-eu/web/pull/939)]
- chore(deps): update apache/tika docker tag to v3.2.1.0 [[#927](https://github.com/opencloud-eu/web/pull/927)]
- chore(deps): update traefik docker tag to v3.4.4 [[#947](https://github.com/opencloud-eu/web/pull/947)]
- fix(deps): update dependency md-editor-v3 to v5.8.0 [[#952](https://github.com/opencloud-eu/web/pull/952)]
- chore(deps): update devdependencies (non-major) [[#941](https://github.com/opencloud-eu/web/pull/941)]
- chore(deps): update dependency @cucumber/cucumber to v12 [[#951](https://github.com/opencloud-eu/web/pull/951)]
- fix(deps): update dependency @sentry/vue to v9.38.0 [[#938](https://github.com/opencloud-eu/web/pull/938)]
- chore(deps): update pnpm to v10.13.1 [[#921](https://github.com/opencloud-eu/web/pull/921)]
- fix(deps): update dependency @sentry/vue to v9.37.0 [[#922](https://github.com/opencloud-eu/web/pull/922)]
- chore(deps): update dependency @playwright/test to v1.54.0 [[#932](https://github.com/opencloud-eu/web/pull/932)]
- fix(deps): update dependency zod to v4 [[#926](https://github.com/opencloud-eu/web/pull/926)]
- fix(deps): update dependency luxon to v3.7.1 [[#925](https://github.com/opencloud-eu/web/pull/925)]
- fix(deps): update typescript-eslint monorepo to v8.36.0 [[#914](https://github.com/opencloud-eu/web/pull/914)]
- chore(deps): update dependency @cucumber/messages to v28 - autoclosed [[#913](https://github.com/opencloud-eu/web/pull/913)]
- chore(deps): update collabora/code docker tag to v25.04.3.2.1 [[#909](https://github.com/opencloud-eu/web/pull/909)]
- fix(deps): update dependency oidc-client-ts to v3.3.0 [[#901](https://github.com/opencloud-eu/web/pull/901)]
- chore(deps): update devdependencies (non-major) [[#888](https://github.com/opencloud-eu/web/pull/888)]
- fix(deps): update dependency @babel/eslint-parser to v7.28.0 [[#894](https://github.com/opencloud-eu/web/pull/894)]
- fix(deps): update dependency md-editor-v3 to v5.7.1 [[#900](https://github.com/opencloud-eu/web/pull/900)]
- fix(deps): update dependency @vavt/cm-extension to v1.10.1 [[#896](https://github.com/opencloud-eu/web/pull/896)]
- fix(deps): update dependency eslint-plugin-n to v17.21.0 [[#897](https://github.com/opencloud-eu/web/pull/897)]
- fix(deps): update dependency eslint-plugin-vue to v10.3.0 [[#898](https://github.com/opencloud-eu/web/pull/898)]
- fix(deps): update dependency zod to v3.25.75 [[#895](https://github.com/opencloud-eu/web/pull/895)]
- fix(deps): update dependency @sentry/vue to v9.35.0 [[#910](https://github.com/opencloud-eu/web/pull/910)]
- fix(deps): update dependency globals to v16.3.0 [[#899](https://github.com/opencloud-eu/web/pull/899)]
- fix(deps): update typescript-eslint monorepo to v8.35.1 [[#902](https://github.com/opencloud-eu/web/pull/902)]
- fix(deps): update dependency @pinia/testing to v1.0.2 [[#893](https://github.com/opencloud-eu/web/pull/893)]
- chore(deps): update dependency vue-tsc to v3 [[#883](https://github.com/opencloud-eu/web/pull/883)]
- chore(deps): update devdependencies (non-major) [[#884](https://github.com/opencloud-eu/web/pull/884)]
- fix(deps): update dependency @vueuse/core to v13.5.0 [[#885](https://github.com/opencloud-eu/web/pull/885)]
- fix(deps): update dependency @sentry/vue to v9.34.0 [[#882](https://github.com/opencloud-eu/web/pull/882)]
- chore(deps): update dependency style-dictionary to v5 [[#701](https://github.com/opencloud-eu/web/pull/701)]
- chore(deps): update collabora/code docker tag to v25.04.3.1.1 [[#775](https://github.com/opencloud-eu/web/pull/775)]
- fix(deps): update dependency @uppy/core to v4.4.7 [[#880](https://github.com/opencloud-eu/web/pull/880)]
- fix(deps): update dependency @sentry/vue to v9.33.0 [[#872](https://github.com/opencloud-eu/web/pull/872)]
- chore(deps): update pnpm to v10.12.4 [[#868](https://github.com/opencloud-eu/web/pull/868)]
- chore(deps): update traefik docker tag to v3.4.3 [[#869](https://github.com/opencloud-eu/web/pull/869)]
- chore(deps): update devdependencies (non-major) [[#867](https://github.com/opencloud-eu/web/pull/867)]
- [full-ci] bump-opencloud-3.1.0. run all tests [[#877](https://github.com/opencloud-eu/web/pull/877)]

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
