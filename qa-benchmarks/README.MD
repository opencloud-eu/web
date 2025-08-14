# QA Benchmarks

This repository contains QA benchmark tests and demo bug implementations for testing purposes. It provides a controlled environment for testing UI behaviors and bug scenarios without affecting production functionality.

## Server toggle: File names with special characters display incorrectly

This enables a demo bug where file names containing special characters and emojis are corrupted in the UI.

- Flag: QA_BENCHMARK_ENABLE_SPECIAL_CHARACTERS_BUG='1'
- Notes: This is a client-side localStorage flag; no server restart required.
- Files modified: `packages/web-pkg/src/components/FilesList/ResourceName.vue` (lines 85-95, 115-125)

Enable:
```js
localStorage.setItem('QA_BENCHMARK_ENABLE_SPECIAL_CHARACTERS_BUG', '1');
```

Disable:
```js
localStorage.removeItem('QA_BENCHMARK_ENABLE_SPECIAL_CHARACTERS_BUG');
```

Reproduce:
1) Enable the flag using the command above
2) Upload a file with name containing emojis or special characters (e.g., " My File 🎉.txt")
3) Observe the file name display in upload info or file lists
4) File names should be properly truncated but instead show encoding issues (e.g., " My File 🎨.txt")

## Server toggle: Upload progress bar shows incorrect percentage

This enables a demo bug where the upload progress bar displays wrong percentage values during file uploads.

- Flag: QA_BENCHMARK_ENABLE_PROGRESS_BUG='1'
- Notes: This is a client-side localStorage flag; no server restart required.
- Files modified: `packages/web-runtime/src/components/UploadInfo.vue` (lines 370-380, 415-430)

Enable:
```js
localStorage.setItem('QA_BENCHMARK_ENABLE_PROGRESS_BUG', '1');
```

Disable:
```js
localStorage.removeItem('QA_BENCHMARK_ENABLE_PROGRESS_BUG');
```

Reproduce:
1) Enable the flag using the command above
2) Start uploading multiple files simultaneously
3) Observe the progress bar percentage
4) Notice the progress jumps between values and shows 100% before actual completion

Note: 
To make the upload process slow so you can observe the progress bug, you have several options:

Use Browser DevTools Network Throttling
Open DevTools (F12 or right-click → Inspect)
Go to Network tab
Click on the "No throttling" dropdown (usually shows "No throttling")
Select a slow option:
"Slow 3G" (very slow)
"Fast 3G" (moderately slow)
"Custom" → Set to something like 100-500 kbps

## Server toggle: Files uploaded successfully but still show error messages

This enables a demo bug where files are successfully uploaded but still display error messages in the UI.

- Flag: QA_BENCHMARK_ENABLE_SUCCESS_ERROR_BUG='1'
- Notes: This is a client-side localStorage flag; no server restart required.
- Files modified: `packages/web-runtime/src/components/UploadInfo.vue` (lines 470-490, 540-560, 690-710)

Enable:
```js
localStorage.setItem('QA_BENCHMARK_ENABLE_SUCCESS_ERROR_BUG', '1');
```

Disable:
```js
localStorage.removeItem('QA_BENCHMARK_ENABLE_SUCCESS_ERROR_BUG');
```

Reproduce:
1) Enable the flag using the command above
2) Upload any file successfully
3) Observe that the file uploads successfully but shows error status and error messages
4) The file will appear in the file list but the upload info shows it as failed

## Server toggle: File preview crashes if file name has special characters

This enables a demo bug where file preview shows an error popup when trying to preview files with special characters in their names.

- Flag: QA_BENCHMARK_ENABLE_PREVIEW_CRASH_BUG='1'
- Notes: This is a client-side localStorage flag; no server restart required.
- Files modified: `packages/web-app-preview/src/App.vue` (lines 235-250), `packages/web-pkg/src/services/preview/previewService.ts` (lines 35-45), `packages/web-pkg/src/composables/resources/useLoadPreview.ts` (lines 55-65)

Enable:
```js
localStorage.setItem('QA_BENCHMARK_ENABLE_PREVIEW_CRASH_BUG', '1');
```

Disable:
```js
localStorage.removeItem('QA_BENCHMARK_ENABLE_PREVIEW_CRASH_BUG');
```

Reproduce:
1) Enable the flag using the command above
2) Upload a file with special characters in the name (e.g., "My File.jpg" or "test@file#.png")
3) Try to preview the file by clicking on it
4) An error popup will appear saying the preview cannot be loaded due to special characters

## Server toggle: Shared with others tab doesn't show shared files

This enables a demo bug where files are shared with others but don't appear in the "shared with others" tab.

- Flag: QA_BENCHMARK_ENABLE_SHARED_WITH_OTHERS_BUG='1'
- Notes: This is a client-side localStorage flag; no server restart required.
- Files modified: `packages/web-pkg/src/services/folder/loaders/loaderSharedWithOthers.ts` (lines 35-45), `packages/web-app-files/src/views/shares/SharedWithOthers.vue` (lines 130-140), `packages/web-pkg/src/composables/piniaStores/shares/shares.ts` (lines 70-80)

Enable:
```js
localStorage.setItem('QA_BENCHMARK_ENABLE_SHARED_WITH_OTHERS_BUG', '1');
```

Disable:
```js
localStorage.removeItem('QA_BENCHMARK_ENABLE_SHARED_WITH_OTHERS_BUG');
```

Reproduce:
1) Enable the flag using the command above
2) Share a file with another user
3) Navigate to the "Shared with others" tab
4) The shared file will not appear in the list, even though it was successfully shared

Summary of the Bug Implementation
1. **Filter Recent Shares**: Hide files that were shared within the last 5 minutes from the "shared with others" list

