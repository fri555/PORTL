# Design QA — 上线版全站对齐（工作台除外）

## Scope

- Source: signed-in `https://aiwork.tianmagroup.com/`
- Prototype: `frontend-mvp`
- Included: global header, 天马智擎首页、仪表盘权限态、知识中心、设置/智能体管理
- Excluded: `/portals` 工作台内容
- New requirement: knowledge-base and intelligent-agent permission configuration

## Source captures

- Home states: `design-qa-assets/reclone/source-chat-desktop-1440.png`, `source-chat-default-1280x720.png`, `source-chat-mode-open-1440x900.png`, `source-account-menu-1440x900.png`
- Knowledge: `source-knowledge-default-1440x900.png`, `source-knowledge-menu-1280x720.png`
- Agents: `source-agents-default-1280x720.png`, `source-agents-menu-1440x900.png`

## Final prototype captures

- Home expanded-history state: `local-final-chat-history-open-1440x900.png`
- Knowledge menu and permission dialog: `local-final-knowledge-menu-1280x720.png`, `local-final-knowledge-permission-1280x720.png`
- Agent menu and permission dialog: `local-final-agents-menu-1280x720.png`, `local-final-agents-permission-1280x720.png`

## Visual alignment results

- Global header: matched responsive desktop gutters, production logo size, navigation spacing, feedback control, account avatar/name, and the single-item logout menu.
- Home: matched the 270 px history panel, history density, main-content shift, 800 × 172 composer, exact 776 × 100 textarea, control coordinates, 246 × 74 quick cards, production slogan/mascot, and two-option mode menu.
- Knowledge: matched the production header controls, fixed action sizes, table column coordinates, 57 px row density, names, owners, and timestamps. Added `权限设置` beside `重命名` and `删除`.
- Agents: matched the 32 px search/filter controls, list density, production avatars, pagination, and operation-menu styling. Added `权限设置` beside `编辑` and `删除`.
- Dashboard: retained the production-observed signed-in `无访问权限` state.

## Permission behavior verified

- Knowledge and agent row menus both open the resource permission dialog.
- Member list shows a locked system administrator, departments, people, fixed `查看` permission, and row removal.
- Add-member view supports department/person tabs, name or employee-number search, automatic duplicate suppression, and a 30-item single-add limit.
- Department grants explicitly retain automatic synchronization for hire, departure, and transfer changes.
- Changes remain a draft until `保存设置`; save performs full-list validation and emits the complete member list.
- Knowledge saves display the RAG retrieval-filtering effect; agent permissions do not show the knowledge-only RAG copy.
- Personal-space knowledge bases suppress the permission entry through the `space === 'personal'` rule.

## Verification

- Browser interaction: knowledge menu → permission dialog → add department/person → confirm → save passed.
- Browser interaction: agent menu → permission dialog passed.
- Same-input visual comparison performed for the production and final 1440 × 900 home history state.
- Full tests: 20 files, 138 tests passed.
- Production build: `vue-tsc --noEmit && vite build` passed.
