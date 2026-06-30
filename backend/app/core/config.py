"""应用配置管理"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    # 服务
    port: int = 8090
    host: str = "0.0.0.0"

    # 数据库
    database_url: str = f"sqlite:///{BASE_DIR}/data/tianma_ai.db"

    # JWT
    secret_key: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    # AI 模型
    default_ai_provider: str = "anthropic"
    default_ai_model: str = "claude-sonnet-4-6"
    ai_api_key: str = ""
    ai_api_base: str = "https://api.anthropic.com/v1"

    # 钉钉
    dingtalk_app_key: str = ""
    dingtalk_app_secret: str = ""
    dingtalk_corp_id: str = ""

    # 文件存储
    upload_dir: str = str(BASE_DIR / "data" / "uploads")
    max_upload_size_mb: int = 50

    # CORS
    cors_origins: str = "http://localhost:5176,http://localhost:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()

# 确保上传目录存在
os.makedirs(settings.upload_dir, exist_ok=True)
