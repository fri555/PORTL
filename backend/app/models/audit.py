"""审计与日志模型"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime
from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), index=True)
    action = Column(String(100), nullable=False)  # page_view / conversation_open / agent_run / ...
    resource = Column(String(200), nullable=True)
    result = Column(String(20), default="success")
    detail = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ToolInvocation(Base):
    __tablename__ = "tool_invocations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    message_id = Column(String(36), nullable=True)
    tool_name = Column(String(200), nullable=False)
    tool_key = Column(String(100), nullable=False)
    input_params = Column(Text, nullable=True)  # JSON
    output_result = Column(Text, nullable=True)  # JSON
    status = Column(String(20), default="running")  # running / success / error
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)
