"""文件上传接口"""

import os
import uuid
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.conversation import ConversationFile
from app.models.knowledge import KnowledgeAsset
from app.core.config import settings
from app.schemas.conversation import FileUploadResponse

router = APIRouter(prefix="/api", tags=["files"])


@router.post("/files", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    conversation_id: str = None,
    db: Session = Depends(get_db),
):
    """上传文件（会话附件或知识库资料）"""
    # 校验大小
    content = await file.read()
    file_size = len(content)
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if file_size > max_bytes:
        raise HTTPException(status_code=400, detail=f"文件大小超过限制（{settings.max_upload_size_mb}MB）")

    # 校验格式
    allowed_extensions = {".xlsx", ".xls", ".csv", ".doc", ".docx", ".pdf", ".ppt", ".pptx", ".md", ".txt"}
    ext = os.path.splitext(file.filename or "unknown")[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"不支持的文件格式：{ext}")

    # 保存文件
    file_id = str(uuid.uuid4())
    safe_name = f"{file_id}{ext}"
    file_path = os.path.join(settings.upload_dir, safe_name)
    with open(file_path, "wb") as f:
        f.write(content)

    # 创建数据库记录
    file_type = ext.lstrip(".")
    conv_file = ConversationFile(
        id=file_id,
        conversation_id=conversation_id or "orphan",
        filename=file.filename or "unknown",
        file_type=file_type,
        file_size=file_size,
        parse_status="pending",
    )
    db.add(conv_file)
    db.commit()
    db.refresh(conv_file)

    return FileUploadResponse(
        id=conv_file.id,
        filename=conv_file.filename,
        file_type=conv_file.file_type,
        file_size=conv_file.file_size,
        parse_status=conv_file.parse_status,
    )
