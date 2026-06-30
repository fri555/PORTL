export interface KnowledgeBase {
  id: string
  name: string
  departmentId: string
  departmentName: string
  description: string
  visibility: 'all' | 'department' | 'specific'
  visibleDepartments: string[]
  totalDocuments: number
  totalChunks: number
  embeddingModel: string
  vectorStore: string
  retrievalConfig: {
    similarityThreshold: number
    topK: number
    showCitation: boolean
  }
  createdAt: string
  updatedAt: string
}

export interface KnowledgeDocument {
  id: string
  knowledgeBaseId: string
  name: string
  format: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'txt'
  size: string
  status: 'processing' | 'indexed' | 'failed'
  uploadedBy: string
  uploadedAt: string
  updatedAt: string
}

export interface SemanticEntity {
  id: string
  knowledgeBaseId: string
  entityType: string
  entityName: string
  properties: Record<string, string | number>
  relations: { targetEntityId: string; relation: string }[]
}
