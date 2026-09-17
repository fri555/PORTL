# Design QA — chat/files/permission clone

Date: 2026-08-27
Viewport: 1009 × 864 in the authenticated in-app browser

## Compared states

- Source `/chat` and local `/PORTL/chat`, sidebar collapsed and expanded.
- Source daily session detail and local `/PORTL/chat/daily-auth`.
- Source `/files` and local `/PORTL/files`, collapsed group, expanded group, and HTML preview.
- Source knowledge permission manager and local permission manager, including the add-member picker.
- Source expert-mode selector/list and local expert-mode selector/list.

## Corrections made from the combined comparisons

- Matched the landing vertical rhythm, 690 px working width, 170 px composer, 2-column quick actions at this viewport, and 82 px mascot.
- Replaced stale session names/timestamps with the captured source histories and fixed real asset base paths.
- Matched expert cards to the source category tag + name + description anatomy and moved selected-expert content inside the composer.
- Removed task-file horizontal overflow, corrected generated file names/sizes, and made the preview responsive.
- Increased permission manager list height and verified the source-like nested add-member window.
- Verified share state and logo return using actual browser clicks.

## Automated verification

- 145 tests passing across 21 test files.
- Production typecheck and Vite build passing.
