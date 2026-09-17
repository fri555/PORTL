# Behaviors

- Logo and new-conversation actions navigate to `/chat` and clear transient chat state.
- Clicking a history row navigates to its stable `/chat/:sessionId` detail route.
- Session more menu opens on click and closes on outside click; rename, share, and delete are distinct actions.
- Share opens the source-style bottom action bar without losing the conversation.
- Composer mode first opens a two-option popover. Expert mode then replaces quick actions with a selectable expert grid.
- Selecting an expert adds a dark expert chip, expert-specific placeholder, and related shortcut buttons.
- Task-file groups expand independently. Clicking a child file opens a preview drawer; close and download remain available.
- Permission manager is populated. `可查看` opens a remove popover. `添加成员` opens the department/person picker and preserves selections when confirmed.
- Every icon-only button has a `title` and an `aria-label`; disabled send explains `请输入内容`.
