"""会话接口"""

import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.models.conversation import Conversation, Message, ConversationFile
from app.models.artifact import MessageArtifact, MessageCitation
from app.models.knowledge import KnowledgeGap
from app.schemas.conversation import (
    ConversationCreate, ConversationResponse, ConversationUpdate,
    MessageCreate, MessageResponse,
    ArtifactResponse, CitationResponse, KnowledgeGapCreate, KnowledgeGapResponse, KnowledgeGapUpdate,
)
from app.services.chat_service import generate_response

router = APIRouter(prefix="/api", tags=["conversations"])


def _get_user_id() -> str:
    """获取当前用户 ID（Mock：后续接入钉钉登录后替换）"""
    return "user_001"


# ---- Conversation CRUD ----
@router.get("/conversations", response_model=list[ConversationResponse])
def list_conversations(db: Session = Depends(get_db)):
    user_id = _get_user_id()
    conversations = (
        db.query(Conversation)
        .filter(Conversation.user_id == user_id, Conversation.status != "deleted")
        .order_by(desc(Conversation.updated_at))
        .limit(50)
        .all()
    )
    result = []
    for conv in conversations:
        conv_dict = {
            "id": conv.id,
            "user_id": conv.user_id,
            "title": conv.title,
            "agent_key": conv.agent_key,
            "status": conv.status,
            "created_at": conv.created_at,
            "updated_at": conv.updated_at,
            "message_count": len(conv.messages),
        }
        result.append(conv_dict)
    return result


@router.post("/conversations", response_model=ConversationResponse)
def create_conversation(body: ConversationCreate, db: Session = Depends(get_db)):
    conv = Conversation(
        user_id=_get_user_id(),
        title=body.title or "新会话",
        agent_key=body.agent_key or "plan_supervisor",
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return {
        "id": conv.id,
        "user_id": conv.user_id,
        "title": conv.title,
        "agent_key": conv.agent_key,
        "status": conv.status,
        "created_at": conv.created_at,
        "updated_at": conv.updated_at,
        "message_count": 0,
    }


@router.get("/conversations/{conv_id}", response_model=ConversationResponse)
def get_conversation(conv_id: str, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="会话不存在")
    return {
        "id": conv.id,
        "user_id": conv.user_id,
        "title": conv.title,
        "agent_key": conv.agent_key,
        "status": conv.status,
        "created_at": conv.created_at,
        "updated_at": conv.updated_at,
        "message_count": len(conv.messages),
    }


@router.patch("/conversations/{conv_id}", response_model=ConversationResponse)
def update_conversation(conv_id: str, body: ConversationUpdate, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="会话不存在")
    if body.title is not None:
        conv.title = body.title
    if body.status is not None:
        conv.status = body.status
    db.commit()
    db.refresh(conv)
    return {
        "id": conv.id,
        "user_id": conv.user_id,
        "title": conv.title,
        "agent_key": conv.agent_key,
        "status": conv.status,
        "created_at": conv.created_at,
        "updated_at": conv.updated_at,
        "message_count": len(conv.messages),
    }


@router.delete("/conversations/{conv_id}")
def delete_conversation(conv_id: str, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="会话不存在")
    conv.status = "deleted"
    db.commit()
    return {"ok": True}


# ---- Messages ----
@router.get("/conversations/{conv_id}/messages", response_model=list[MessageResponse])
def list_messages(conv_id: str, db: Session = Depends(get_db)):
    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conv_id)
        .order_by(Message.created_at)
        .all()
    )
    result = []
    for msg in messages:
        thinking = None
        if msg.thinking_steps:
            try:
                thinking = json.loads(msg.thinking_steps)
            except json.JSONDecodeError:
                pass
        result.append({
            "id": msg.id,
            "conversation_id": msg.conversation_id,
            "role": msg.role,
            "content": msg.content,
            "thinking_steps": thinking,
            "created_at": msg.created_at,
        })
    return result


@router.post("/conversations/{conv_id}/messages")
async def send_message(conv_id: str, body: MessageCreate, db: Session = Depends(get_db)):
    """发送消息并获取 AI 回复（流式 SSE）"""
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="会话不存在")

    # 保存用户消息
    user_msg = Message(
        conversation_id=conv_id,
        role="user",
        content=body.content,
    )
    db.add(user_msg)
    conv.title = body.content[:40] + ("..." if len(body.content) > 40 else "")
    db.commit()

    async def event_stream():
        thinking_steps = []
        full_response = ""

        # 构建历史消息
        history = [
            {"role": m.role, "content": m.content}
            for m in db.query(Message)
            .filter(Message.conversation_id == conv_id)
            .order_by(Message.created_at)
            .all()
        ]
        async for event in generate_response(body.content, conv.agent_key, history):
            event_type = event["type"]

            if event_type == "thinking":
                step = event["data"]
                existing = next((s for s in thinking_steps if s["id"] == step["id"]), None)
                if existing:
                    existing.update(step)
                else:
                    thinking_steps.append(step)
                yield f"data: {json.dumps({'type': 'thinking', 'steps': thinking_steps}, ensure_ascii=False)}\n\n"

            elif event_type == "text":
                chunk = event["data"]
                full_response += chunk
                yield f"data: {json.dumps({'type': 'text', 'content': chunk, 'full': full_response}, ensure_ascii=False)}\n\n"

            elif event_type == "done":
                # 保存 AI 回复
                assistant_msg = Message(
                    conversation_id=conv_id,
                    role="assistant",
                    content=full_response,
                    thinking_steps=json.dumps(thinking_steps, ensure_ascii=False),
                )
                db.add(assistant_msg)
                db.commit()
                db.refresh(assistant_msg)

                # 自动检测知识缺口（模拟）
                if "待确认" in full_response or "知识缺口" in full_response:
                    gap = KnowledgeGap(
                        conversation_id=conv_id,
                        question="部分字段缺失，需要补充客户类型、预算范围等信息",
                        reason="用户输入信息不完整",
                        priority="medium",
                        status="open",
                    )
                    db.add(gap)
                    db.commit()

                yield f"data: {json.dumps({'type': 'done', 'message_id': assistant_msg.id}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ---- Citations ----
@router.get("/conversations/{conv_id}/citations", response_model=list[CitationResponse])
def list_citations(conv_id: str, db: Session = Depends(get_db)):
    return db.query(MessageCitation).filter(MessageCitation.conversation_id == conv_id).all()


# ---- Artifacts ----
@router.get("/conversations/{conv_id}/artifacts", response_model=list[ArtifactResponse])
def list_artifacts(conv_id: str, db: Session = Depends(get_db)):
    return db.query(MessageArtifact).filter(MessageArtifact.conversation_id == conv_id).all()


# ---- Knowledge Gaps ----
@router.get("/knowledge-gaps", response_model=list[KnowledgeGapResponse])
def list_knowledge_gaps(status: str = None, db: Session = Depends(get_db)):
    query = db.query(KnowledgeGap)
    if status:
        query = query.filter(KnowledgeGap.status == status)
    return query.order_by(desc(KnowledgeGap.created_at)).limit(50).all()


@router.patch("/knowledge-gaps/{gap_id}", response_model=KnowledgeGapResponse)
def update_knowledge_gap(gap_id: str, body: KnowledgeGapUpdate, db: Session = Depends(get_db)):
    gap = db.query(KnowledgeGap).filter(KnowledgeGap.id == gap_id).first()
    if not gap:
        raise HTTPException(status_code=404, detail="知识缺口不存在")
    if body.status is not None:
        gap.status = body.status
    if body.owner_id is not None:
        gap.owner_id = body.owner_id
    if body.priority is not None:
        gap.priority = body.priority
    db.commit()
    db.refresh(gap)
    return gap
