"""会话与消息模型"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class ConversationStatus(str, enum.Enum):
    active = "active"
    archived = "archived"
    deleted = "deleted"


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), nullable=False, index=True)
    title = Column(String(255), default="新会话")
    agent_key = Column(String(100), default="plan_supervisor")
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    messages = relationship("Message", back_populates="conversation", order_by="Message.created_at")
    files = relationship("ConversationFile", back_populates="conversation")
    artifacts = relationship("MessageArtifact", back_populates="conversation")
    citations = relationship("MessageCitation", back_populates="conversation")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(36), ForeignKey("conversations.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user / assistant / system
    content = Column(Text, nullable=False)
    thinking_steps = Column(Text, nullable=True)  # JSON: 思考链步骤
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")
    citations = relationship("MessageCitation", back_populates="message")


class ConversationFile(Base):
    __tablename__ = "conversation_files"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(36), ForeignKey("conversations.id"), nullable=False)
    filename = Column(String(500), nullable=False)
    file_type = Column(String(50))
    file_size = Column(Integer)
    parse_status = Column(String(20), default="pending")  # pending / parsing / done / error
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="files")
