# Knowledge Center Design QA

- Reference states: default list, row menu, create, upload, folder, Q&A panel, open sidebar, empty detail, rename, permission.
- Reference viewport coverage: 1440×900 desktop screenshot; 768×900 measured tablet layout; 390×844 measured mobile layout.
- Prototype states: all reference interactions are implemented with local state and covered by `KnowledgeBaseView.spec.ts` plus the application smoke suite.
- Responsive geometry verified in CSS: desktop/tablet toolbar and table offsets; 280px sidebar; mobile header, 12px gutters, toolbar at y=116, table at y=156; mobile Q&A full-width panel.
- Asset verification: source Tianma logo/avatar retained; source knowledge-book SVG extracted from the authenticated page; existing empty-state artwork reused.
- Functional result: passed — 139/139 tests and production build.
- Visual comparison input: source screenshots are saved under `design-qa-assets/source/`. Automated local screenshot capture in the selected in-app browser is blocked by its local/private URL navigation policy, so the source/local side-by-side visual gate still requires the local preview to be opened by the user in that browser.
- Open issues: visual-only P0/P1/P2 status is ungraded until that browser-side local screenshot is available.
- Final result: blocked on browser-local visual comparison; not marked passed.
