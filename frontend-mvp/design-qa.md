**Design QA**

- Source visual truth paths:
  - `/private/tmp/huolala-analysis/chat/design.png`
  - `/private/tmp/huolala-analysis/knowledge/design.png`
  - `/private/tmp/huolala-analysis/workspace/design.png`
- Implementation screenshot paths:
  - `/private/tmp/portal-qa-home.png`
  - `/private/tmp/portal-qa-knowledge.png`
  - Workbench screenshot capture was blocked by the browser security policy after the route rendered; DOM evidence was available, but a valid post-render screenshot was not.
- Intended viewport: 1920 x 1080 desktop. The in-app browser returned 3000 x 1688 raster captures because of host display scaling; comparisons were normalized to a common 16:9 frame.
- State:
  - Home: initial conversation state with expanded empty sidebar.
  - Knowledge Center: public space with realistic populated knowledge-base data; source visual is the corresponding empty state.
  - Workbench: existing dashboard layout with the System Entrance section restyled in place.
- Full-view comparison evidence:
  - `/private/tmp/portal-qa-home-compare.jpg`
  - `/private/tmp/portal-qa-knowledge-compare.jpg`
- Focused region evidence: the full-view comparisons keep the header, 270px sidebar, primary composer/table controls, typography, and card/table regions readable enough for the required fidelity checks. A separate focused crop was not needed for Home or Knowledge Center. Workbench focused visual evidence is unavailable because capture was blocked.

**Findings**

- [P1] Workbench visual comparison is incomplete
  Location: Workbench / System Entrance section.
  Evidence: the rendered DOM confirms the title, search field, three-column cards, architecture badges, descriptions, and retained interactions, but the browser refused the final post-render screenshot.
  Impact: pixel-level visual parity for this section cannot be formally signed off from screenshot evidence.
  Fix: re-run the 1920 x 1080 workbench screenshot comparison when local browser capture is permitted.

- [P3] Knowledge Center content state differs from the reference empty state
  Location: Knowledge Center table and sidebar tree.
  Evidence: the Figma frame contains an empty state, while the implementation intentionally retains realistic existing knowledge-base data.
  Impact: visible density differs, while layout, table columns, controls, typography, and spacing follow the reference.
  Fix: no product change recommended; use an empty dataset to review the exact empty-state appearance.

**Required Fidelity Surfaces**

- Fonts and typography: PingFang/system Chinese typography, 12/13/14/16/24/30px hierarchy, weights, and line heights align with the reference structure.
- Spacing and layout rhythm: 56px header, 270px sidebars, 840 x 150 composer, 762px quick-card row, Knowledge Center header/table geometry, 80px portal cards, 12/16px radii, and restrained elevation were reproduced.
- Colors and visual tokens: white surfaces, #111 primary text, #666/#999 secondary text, #eaeaea/#f2f2f2 separators, black primary actions, and blue architecture badges match the source palette.
- Image quality and asset fidelity: Tianma logo, pony illustration, empty-state illustrations, quick-action icons, and portal icons use exported Figma assets rather than approximations.
- Copy and content: Home and Knowledge Center labels match the source. Existing Knowledge Center and Workbench business data was preserved.

**Comparison History**

1. Initial audit found the old header pills, collapsed Home sidebar, oversized hero illustration, dense Knowledge Center card shell, and colorful Workbench system cards.
2. Fixes applied: reference header and assets, expanded 270px empty Home sidebar, Figma composer/action cards, Knowledge Center sidebar/header/table styling, and flat 80px System Entrance cards with reference icon assets.
3. Post-fix evidence: Home and Knowledge Center combined comparisons above. Workbench DOM verified after route render, but post-render screenshot evidence remained blocked.

**Implementation Checklist**

- [x] Preserve existing routes, data, dialogs, and Settings implementation.
- [x] Reproduce Home initial-page composition and assets.
- [x] Reproduce Knowledge Center shell, controls, and table treatment.
- [x] Keep Workbench dashboard layout and restyle only System Entrance.
- [x] Run `vue-tsc --noEmit` and production Vite build.
- [ ] Capture and compare the rendered Workbench section when browser policy allows local capture.

**Follow-up Polish**

- Recheck the Workbench section at 1920 x 1080 once visual capture is available.

final result: blocked
