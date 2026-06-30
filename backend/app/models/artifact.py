"""产物与引用模型"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class MessageArtifact(Base):
    __tablename__ = "message_artifacts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(36), ForeignKey("conversations.id"), nullable=False)
    message_id = Column(String(36), ForeignKey("messages.id"), nullable=True)
    artifact_type = Column(String(20), nullable=False)  # excel / ppt / pdf / markdown
    title = Column(String(500), nullable=False)
    url = Column(String(1000), nullable=True)
    status = Column(String(20), default="pending")  # pending / generating / done / error
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="artifacts")


class MessageCitation(Base):
    __tablename__ = "message_citations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(36), ForeignKey("conversations.id"), nullable=False)
    message_id = Column(String(36), ForeignKey("messages.id"), nullable=True)
    asset_id = Column(String(36), ForeignKey("knowledge_assets.id"), nullable=True)
    snippet = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="citations")
    message = relationship("Message", back_populates="citations")
