"""对话服务 - 智能体编排、思考链、模型调用"""

import json
import asyncio
import httpx
from typing import AsyncGenerator
from app.core.config import settings
from app.schemas.conversation import ThinkingStep


# ---- 思考链模板 ----
def build_thinking_chain(user_input: str, agent_key: str = "plan_supervisor") -> list[ThinkingStep]:
    """根据意图生成思考链步骤"""
    return [
        ThinkingStep(
            id="intent", label="意图识别",
            detail="分析用户输入，判断任务类型...",
            status="pending", icon="🔍",
        ),
        ThinkingStep(
            id="supervisor",
            label="方案中心主管" if agent_key == "plan_supervisor" else "智能体调度",
            detail="提取关键字段：客户类型、预算、场景、品类偏好...",
            status="pending", icon="🧠",
        ),
        ThinkingStep(
            id="knowledge", label="检索知识库",
            detail="匹配成功案例池、通用预算池、个性化方案池...",
            status="pending", icon="📚",
        ),
        ThinkingStep(
            id="expert", label="组货方案专家",
            detail="按预算段、场景偏好生成多档组货策略...",
            status="pending", icon="🔧",
        ),
        ThinkingStep(
            id="output", label="生成输出",
            detail="整理方案文本、Excel清单、PPT草稿，检测知识缺口...",
            status="pending", icon="📄",
        ),
    ]


def _is_real_api_configured() -> bool:
    """检查是否配置了真实 API"""
    return bool(settings.ai_api_key and settings.ai_api_base)


SYSTEM_PROMPT = """你是天马AI门户的方案中心主管智能体。你需要：

1. 先用"方案中心主管"的角色理解用户意图，判断是否在方案中心相关任务范围内。
2. 提取客户类型、数量、预算、活动场景、品类、品牌偏好、颜色/男女比例、交付时间等字段。
3. 缺字段时先追问，不直接编造。
4. 字段足够后调用"组货方案专家"子智能体。
5. 最终输出业务可读的方案说明，并解释引用来源。
6. 如果你不确定或无法回答，诚实告知并记录为知识缺口。

回复时请用 Markdown 格式，结构清晰。"""


async def generate_response(
    user_input: str,
    agent_key: str = "plan_supervisor",
    history: list[dict] | None = None,
) -> AsyncGenerator[dict, None]:
    """流式响应生成（自动选择模拟或真实 API）"""

    if _is_real_api_configured():
        async for event in _generate_real(user_input, agent_key, history):
            yield event
    else:
        async for event in _generate_simulated(user_input, agent_key):
            yield event


async def _generate_real(
    user_input: str,
    agent_key: str,
    history: list[dict] | None = None,
) -> AsyncGenerator[dict, None]:
    """调用真实 AI API 生成回复（DeepSeek / OpenAI 兼容）"""

    steps = build_thinking_chain(user_input, agent_key)

    # 发送思考链（快速完成）
    for i, step in enumerate(steps):
        step.status = "running"
        yield {"type": "thinking", "data": step.model_dump()}
        await asyncio.sleep(0.2)
        step.status = "completed"
        step.elapsed = 0.2 + i * 0.1
        yield {"type": "thinking", "data": step.model_dump()}

    # 构建消息
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if history:
        messages.extend(history[-20:])  # 最近 20 条历史
    messages.append({"role": "user", "content": user_input})

    api_url = settings.ai_api_base.rstrip("/")
    # DeepSeek/OpenAI 兼容：chat/completions
    if "deepseek" in api_url or "openai" in api_url or "/v1" in api_url:
        url = f"{api_url}/chat/completions" if not api_url.endswith("/chat/completions") else api_url
    else:
        url = f"{api_url}/chat/completions"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.ai_api_key}",
    }
    body = {
        "model": settings.default_ai_model,
        "messages": messages,
        "stream": True,
        "max_tokens": 4096,
    }

    full_text = ""

    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream("POST", url, json=body, headers=headers) as resp:
            if resp.status_code != 200:
                error_text = await resp.aread()
                yield {"type": "text", "data": f"\n\n❌ API 错误 {resp.status_code}: {error_text.decode()[:200]}"}
                yield {"type": "done", "data": None}
                return

            async for line in resp.aiter_lines():
                if not line or not line.startswith("data: "):
                    continue
                data_str = line[6:]
                if data_str == "[DONE]":
                    break
                try:
                    data = json.loads(data_str)
                    delta = data.get("choices", [{}])[0].get("delta", {})
                    content = delta.get("content", "")
                    if content:
                        full_text += content
                        yield {"type": "text", "data": content}
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue

    yield {"type": "done", "data": full_text}


async def _generate_simulated(
    user_input: str,
    agent_key: str = "plan_supervisor",
) -> AsyncGenerator[dict, None]:
    """模拟的流式响应生成，包含思考链"""
    steps = build_thinking_chain(user_input, agent_key)
    delays = [0.6, 0.8, 1.0, 1.2, 0.8]
    details = [
        f'意图识别完成：用户询问"{user_input[:30]}..."，匹配到[方案中心]业务域，置信度 0.92',
        "已提取关键字段：客户类型=待确认、预算=待确认、活动场景=待确认。发现缺失字段较多，需要追问。",
        "已检索到相关资源：运动鞋团购成功案例 ×3、通用预算池模板 ×1、方案中心字段模板 ×1。匹配度 78%。",
        "组货策略：基于预算区间生成'经济型/均衡型/品质型'三档方案，含 SPU 组合和预估价格带。",
        "✅ Markdown方案已生成 ✅ Excel组货清单已生成 ✅ PPT客户方案草稿已生成 ⚠️ 知识缺口：部分品牌最新库存及价格待确认",
    ]

    for i, step in enumerate(steps):
        step.status = "running"
        yield {"type": "thinking", "data": step.model_dump()}
        await asyncio.sleep(delays[i] + (0.1 * i))
        step.status = "completed"
        step.detail = details[i]
        step.elapsed = delays[i]
        yield {"type": "thinking", "data": step.model_dump()}

    response = _build_simulated_response(user_input)
    chunks = _split_for_streaming(response)
    for chunk in chunks:
        yield {"type": "text", "data": chunk}
        await asyncio.sleep(0.03)

    yield {"type": "done", "data": None}


def _build_simulated_response(user_input: str) -> str:
    """构建模拟回复"""
    from datetime import date
    today = date.today().strftime("%Y-%m-%d")
    return f"""## 📋 方案中心 · 组货方案初稿

> 生成日期：{today}
> 引用来源：运动鞋团购成功案例 · 通用预算池 · 方案中心字段模板

### 一、需求理解
根据您的描述「{user_input[:60]}...」，初步判断为**方案中心组货类需求**。

不过目前还有以下关键字段需要确认：

| 字段 | 状态 | 说明 |
|------|------|------|
| 客户类型 | ❓ 待确认 | B2B线下 / 门店 / 服务商团购 |
| 预算范围 | ❓ 待确认 | 单笔预算区间影响组货策略 |
| 活动场景 | ❓ 待确认 | 节日礼盒 / 员工福利 / 客户回馈 |
| 品类偏好 | ❓ 待确认 | 运动鞋 / 配件 / 服饰搭配 |
| 交付时间 | ❓ 待确认 | 影响库存 SKU 选择 |

### 二、初步组货建议（预计三档）
| 档位 | 预算占比 | 产品组合 | 适用场景 |
|------|----------|----------|----------|
| 🥉 经济型 | ~40% | 基础款运动鞋 2-3 款 | 覆盖人数最大化 |
| 🥈 均衡型 | ~40% | 核心款运动鞋 + 配件 | 品质与数量兼顾 |
| 🥇 品质型 | ~20% | 高端鞋款 / 限量款 | 核心客户专属 |

### 三、输出附件
- ✅ **Excel 组货清单** — 含 SPU/SKU、预估价格、库存状态
- ✅ **PPT 客户方案草稿** — 可直接用于客户沟通
- ⚠️ **知识缺口** — 部分品牌最新库存价格待补充

> 💡 请补充上述缺失字段，我将继续生成完整的组货方案。"""


def _split_for_streaming(text: str, chunk_size: int = 4) -> list[str]:
    chunks = []
    for i in range(0, len(text), chunk_size):
        chunks.append(text[i:i + chunk_size])
    return chunks


# 向后兼容
generate_simulated_response = _generate_simulated
