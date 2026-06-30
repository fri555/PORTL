"""知识库模型"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class KnowledgeAsset(Base):
    __tablename__ = "knowledge_assets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    kb_id = Column(String(100), index=True, default="default")
    asset_type = Column(String(50))  # file / url / text
    title = Column(String(500), nullable=False)
    version = Column(Integer, default=1)
    status = Column(String(20), default="pending")  # pending / ingesting / ready / error
    created_by = Column(String(64))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    ingestion_jobs = relationship("KnowledgeIngestionJob", back_populates="asset")


class KnowledgeIngestionJob(Base):
    __tablename__ = "knowledge_ingestion_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    asset_id = Column(String(36), ForeignKey("knowledge_assets.id"), nullable=False)
    status = Column(String(20), default="queued")  # queued / slicing / embedding / done / error
    chunk_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)

    asset = relationship("KnowledgeAsset", back_populates="ingestion_jobs")


class KnowledgeGap(Base):
    __tablename__ = "knowledge_gaps"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(36), ForeignKey("conversations.id"), nullable=True)
    question = Column(Text, nullable=False)
    reason = Column(Text, nullable=True)  # 为什么无法回答
    owner_id = Column(String(64), nullable=True)
    priority = Column(String(20), default="medium")  # low / medium / high / critical
    status = Column(String(20), default="open")  # open / in_progress / resolved / closed
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
