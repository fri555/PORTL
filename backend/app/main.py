"""天马 AI 工作门户 - 后端服务入口"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_db
from app.api.conversations import router as conversations_router
from app.api.files import router as files_router
from app.middleware.logging import RequestLoggingMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """启动/关闭生命周期"""
    init_db()
    yield


app = FastAPI(
    title="天马 AI 工作门户 API",
    version="0.1.0",
    description="提供会话管理、智能体编排、知识库管理、MCP/Skill 调用、审计日志等接口",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 请求日志
app.add_middleware(RequestLoggingMiddleware)

# 路由注册
app.include_router(conversations_router)
app.include_router(files_router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "0.1.0"}


@app.get("/api/me")
def get_current_user():
    """获取当前用户信息（Mock）"""
    return {
        "user_id": "user_001",
        "name": "测试用户",
        "department": "方案中心",
        "roles": ["user", "editor"],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )
