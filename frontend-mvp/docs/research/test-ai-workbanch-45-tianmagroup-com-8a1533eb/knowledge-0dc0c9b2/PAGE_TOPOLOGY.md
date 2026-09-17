# Knowledge Center Page Topology

1. Existing 56px application header, fixed visual shell shared with other routes.
2. Knowledge page grid occupying `calc(100vh - 56px)`.
3. Left knowledge tree, 280px when open and 0px when collapsed; at 390px it becomes a fixed overlay drawer.
4. Main pane with a wrapping top bar, action buttons, and a flex-height table.
5. Optional 360px right Q&A panel with a resize handle.
6. Floating 32px task-center button at bottom right.
7. Portaled overlays: create knowledge base, create folder, upload, rename sheet, permission manager, and delete confirmation.

Interaction models:

- Header: click navigation; mobile burger appears below the source breakpoint.
- Sidebar: click-driven expand/collapse, public/personal tabs, search overlay, expandable tree nodes.
- Table: click-driven row selection, sort toggle, hover highlight, row action menu.
- Dialogs: click-driven with disabled primary buttons until required fields are valid.
- Q&A: click-driven right panel with seeded conversation, input, send, copy, and citation controls.
- Task center: click-driven floating drawer.
- Scroll: native nested scroll containers; no Lenis, Locomotive Scroll, scroll snap, or page-scroll animation was detected.
