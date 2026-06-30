"""会话与消息 Schema"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ---- Conversation ----
class ConversationCreate(BaseModel):
    title: Optional[str] = "新会话"
    agent_key: Optional[str] = "plan_supervisor"

class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None

class ConversationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    agent_key: str
    status: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    model_config = {"from_attributes": True}


# ---- Message ----
class MessageCreate(BaseModel):
    content: str
    role: str = "user"

class ThinkingStep(BaseModel):
    id: str
    label: str
    detail: str
    status: str
    icon: str
    elapsed: Optional[float] = None
    error_msg: Optional[str] = None

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    thinking_steps: Optional[list[ThinkingStep]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ---- File ----
class FileUploadResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    file_size: int
    parse_status: str


# ---- Artifact ----
class ArtifactResponse(BaseModel):
    id: str
    artifact_type: str
    title: str
    url: Optional[str] = None
    status: str

    model_config = {"from_attributes": True}


# ---- Citation ----
class CitationResponse(BaseModel):
    id: str
    asset_id: Optional[str] = None
    snippet: Optional[str] = None
    summary: Optional[str] = None
    score: float = 0.0

    model_config = {"from_attributes": True}


# ---- Knowledge Gap ----
class KnowledgeGapCreate(BaseModel):
    question: str
    reason: Optional[str] = None
    priority: str = "medium"

class KnowledgeGapUpdate(BaseModel):
    status: Optional[str] = None
    owner_id: Optional[str] = None
    priority: Optional[str] = None

class KnowledgeGapResponse(BaseModel):
    id: str
    question: str
    reason: Optional[str] = None
    priority: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
