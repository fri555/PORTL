export type KnowledgeSpace = 'public' | 'personal'

export type SourceKnowledgeNodeKind = 'folder' | 'file'

export interface SourceKnowledgeNode {
  id: string
  name: string
  kind: SourceKnowledgeNodeKind
  owner: string
  updatedAt: string
  format?: string
  size?: string
  children?: SourceKnowledgeNode[]
}

export interface SourceKnowledgeNavigation {
  kbId: string
  nodeId?: string
  kind: 'kb' | SourceKnowledgeNodeKind
}

export interface SourceKnowledgeBase {
  id: string
  name: string
  owner: string
  createdAt: string
  count?: number
  space: KnowledgeSpace
  nodes?: SourceKnowledgeNode[]
  /** @deprecated Use nodes for hierarchical content. */
  documents?: string[]
}

export type KnowledgeDialogKind = 'create' | 'folder' | 'upload' | 'permission' | 'rename' | 'delete' | null

export interface QaPanelMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  citation?: string
}
