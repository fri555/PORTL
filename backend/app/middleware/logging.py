"""请求日志中间件"""

import time
import uuid
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from loguru import logger


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())[:8]
        start = time.monotonic()

        response = await call_next(request)

        elapsed = (time.monotonic() - start) * 1000
        logger.info(
            f"[{request_id}] {request.method} {request.url.path} "
            f"→ {response.status_code} ({elapsed:.0f}ms)"
        )
        response.headers["X-Request-ID"] = request_id
        return response
