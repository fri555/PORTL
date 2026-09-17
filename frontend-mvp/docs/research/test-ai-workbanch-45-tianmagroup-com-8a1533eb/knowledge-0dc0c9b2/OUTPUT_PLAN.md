# Knowledge Center Clone Output Plan

- Source URL: `https://test-ai-workbanch-45.tianmagroup.com/knowledge`
- App root: `D:/工作/portal/frontend-mvp`
- Existing destination route: `/knowledge` (the user explicitly requested updating this local route)
- Site key: `test-ai-workbanch-45-tianmagroup-com-8a1533eb`
- Page key: `knowledge-0dc0c9b2`
- Research root: `docs/research/test-ai-workbanch-45-tianmagroup-com-8a1533eb/knowledge-0dc0c9b2`
- Screenshot root: `design-qa-assets/source`
- Component root: `src/components/knowledge/source-clone`
- Asset root: `public/assets/knowledge-source`

The project is an existing Vue 3/Vite application rather than the template's Next.js scaffold. Route preservation therefore means keeping every existing Vue route and replacing only the `/knowledge` view requested by the user. Shared header assets and navigation remain in the existing app shell.

No production API, authentication, or remote mutation is included. All create, rename, upload, permission, delete, Q&A, and task-center actions use realistic local state.
