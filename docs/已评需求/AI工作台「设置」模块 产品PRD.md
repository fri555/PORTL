# AI工作台「设置」模块 产品PRD

---

# 背景与产品概述

## 业务背景

AI工作台是一个 AI 智能体平台，核心能力是提供类似 ChatGPT/Claude 的智能对话助手。用户可以创建不同角色和能力的智能体，用于各种业务场景（通用问答、数据分析、代码辅助、客服等）。

设置模块是平台的核心配置中枢，承担三类管理职责：

1.  **智能体管理**：不同业务场景需要独立的智能体配置，包括差异化的系统提示词、模型选型、能力组合和快捷提示词。用户通过向导式流程快速创建专属智能体。
    
2.  **模型管理**：需同时管理多家提供商（阿里云 DashScope、OpenAI、DeepSeek、Anthropic 等）的 LLM 模型，支持模型的热切换、灰度发布和成本管控。
    
3.  **技能管理**：通过 Tool、Skill、MCP Server 三种扩展机制，让智能体具备外部能力（知识库检索、NL2SQL 查询、报告生成、第三方 API 调用等），实现从纯对话到工具调用的能力跃迁。
    

大模型提供了灵活的意图识别、内容生成和工具调用能力，但需要一套完善的配置管理系统来降低智能体创建和模型接入门槛，让业务人员也能快速搭建专属 AI 助手。

## 产品目标

| 目标维度 | 具体目标 | 量化指标 |
| --- | --- | --- |
| **业务目标** | 降低 AI 应用配置门槛，提升智能体创建效率 | 10分钟内完成一个智能体手动创建 |
| **数据目标** | 支持大规模配置管理 | 100+ 智能体、50+ 模型、200+ 技能并发注册 |
| **模型目标** | 支持多模态模型动态切换 | 覆盖 text / embedding / multimodal / image\_generation / video\_generation / audio 六种类型 |
| **工程化目标** | 模块化配置，热更新 | 配置变更 < 30s 生效，零停机 |

## 用户角色

| 角色 | 职责描述 | 核心功能 |
| --- | --- | --- |
| **管理员** | 配置全局模型、技能、智能体服务 | 模型管理、技能管理、智能体管理、系统级配置 |
| **产品经理** | 创建和管理智能体，配置提示词 | 智能体 CRUD、向导式创建、快捷提示词管理 |

## 术语定义

| 术语 | 定义 |
| --- | --- |
| **LLM** | Large Language Model，大语言模型，如 Qwen-Max、GPT-4o |
| **Prompt** | 提示词，用于设定 LLM 的初始行为和指令文本 |
| **System Prompt** | 系统提示词，在每轮对话前注入，定义智能体角色和行为约束 |
| **Tool Calling** | 工具调用，LLM 通过函数调用机制使用外部工具 |
| **RAG** | Retrieval-Augmented Generation，检索增强生成，结合知识库进行回答 |
| **MCP** | Model Context Protocol，模型上下文协议，标准化的第三方服务接入方式 |
| **Agent** | 智能体，具备特定角色、能力和知识的 AI 助手实例 |
| **Skill** | 技能包，可复用的能力模块，代码托管在 GitLab |
| **CoT** | Chain of Thought，思维链，让模型展示推理过程 |
| **Plan Mode** | 计划模式，模型先输出执行计划再逐步执行 |

## 参考文档

| 文档名称 | 路径 |
| --- | --- |
| 6 张配置表完整字段清单 | [《智能体字段》](https://alidocs.dingtalk.com/i/nodes/YQBnd5ExVEwXnrMBU6Dv6lLR8yeZqMmz?cid=623796344:660698500&corpId=dingaed79d9c350e396c35c2f4657eb6378f&doc_type=wiki_doc&iframeQuery=utm_medium=im_card&utm_source=im&utm_medium=im_card&utm_scene=person_space&utm_source=im) |

---

# 需求描述

## 需求清单

| 序号 | 优先级 | 需求名称 | 需求描述 |
| --- | --- | --- | --- |
| 1 | P0 | 智能体管理 | 展示所有智能体，4 步引导式创建流程（基础设定→角色设定→能力扩展→快捷提示词） |
| 2 | P0 | 模型管理 | 展示所有 LLM 模型，表单填写模型配置 |
| 3 | P0 | skill管理 | 展示所有 Skill，单步表单创建管理 |
| 4 | P0 | MCP管理 | 展示所有 MCP，单步表单创建管理 |

---

# 业务流程图

暂无

---

# 系统流程图

暂无

---

# 功能需求

## 智能体列表

### 功能需求描述

展示所有智能体，支持搜索、分类/状态筛选、分页

### 用户故事

作为管理员或产品经理，我需要查看所有智能体并快速找到目标智能体

### 主流程

1.  进入设置 → 智能体管理，系统默认重定向至此页
    
2.  系统加载智能体列表（过滤条件：未删除且是否为默认智能体=否）。
    
3.  搜索框与筛选下拉框默认空。
    
4.  操作列三点菜单默认收起。
    

**异常流程**

*   若网络超时，显示错误提示并提供重试按钮
    
*   若无数据，显示空状态插图和「创建智能体」按钮
    

### 界面原型

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/c35644f2-5d4a-4226-b352-f19767834ca7.png)

1）显示表格：名称（含图标）、服务业务（原分类）、描述、状态（开关）、更新时间（年月日时分秒）、操作。按创建时间倒序。

2）搜索：按照智能体名称/描述模糊搜索。

3）创建智能体：点击后打开添加弹窗，详见添加/编辑功能。

4）筛选：服务业务（原分类）（枚举字段）、状态（状态枚举字段）。默认空（全部）。点击「清除」后重置，点击「查询」后筛选。

5）操作列三点菜单：编辑、删除。

6）编辑：点击后打开编辑弹窗，详见添加/编辑功能。

7）禁用/启用：

*   列表页状态列提供 Switch 开关，点击即可切换启用/禁用
    
*   禁用智能体时，需弹窗二次确认，提示文案“禁用会导致用户无法使用，请确认已通知相关用户”，同意后修改状态为「已禁用」。
    

8）删除：

*   系统默认智能体不可删除，没在页面展示该智能体但后端需校验不允许删除；
    
*   删除智能体时，需弹窗二次确认，提示文案“删除会导致用户无法使用，请确认已通知相关用户”，同意后修改状态为「已删除」。
    
*   删除为逻辑删除。
    

### 数据说明

暂无

### 业务规则

*   同时只允许一个系统默认智能体
    

### 接口说明

---

## 智能体创建/编辑— Step 1 基础设定

### 功能需求描述

填写智能体基础信息和模型配置

### 用户故事

作为管理员或产品经理，我需要通过引导式流程快速创建智能体；编辑模式下修改已有智能体的全部配置

### 界面原型

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/1bcb6648-3e26-4353-a120-f8b1c5d1351d.png)

**主流程**：

1.  点击顶部步骤条可自由跳转（已完成的步骤可直接回跳）
    
2.  每步底部有「上一步」「下一步」按钮
    
3.  最终点击「保存」提交全部配置
    
4.  编辑模式下，加载已有数据回填至 4 步表单
    

### 数据说明

#### 基础设定

| NO | 字段名称 | 字段标识 | 组件类型 | 长度 | 默认值 | 必需 | 约束说明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 智能体图标 | icon | 图片上传 | / | NULL | Y | 支持 JPG/PNG/SVG，要求 1:1 比例，≥128px，≤2MB； |
| 2 | 名称 | name | Input | 限制最大50个字符 | NULL | Y | maxlength=50，右下角显示字符计数（N/50） |
| 3 | 服务业务 | 原category | Select | / | NULL | Y | 枚举：通用、B2B、B2C、直播、商品、门店 |
| 4 | 角色标识 | role | Input | 100 | NULL | N | 留空将自动生成唯一标识；备注：「智能体的角色标识，用于系统内部区分不同角色的智能体」。编辑时不可修改。 |
| 5 | 简介 | description | Textarea | 限制500字以内 | NULL | Y | maxlength=500，右下角显示字符计数（N/500） |

#### 模型配置区

| NO | 字段名称 | 字段标识 | 组件类型 | 长度 | 默认值 | 必需 | 约束说明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 6 | 基座模型 | model\_id | Select | / | NULL | Y | 关联 system\_llm\_model.id，下拉展示已启用且未删除的模型 |
| 7 | 任务规划与执行（ReAct） | enable\_plan | Switch | / | 启用 | Y | 允许智能体自主规划任务步骤并执行 |
| 8 | 深度思维链（CoT） | enable\_think | Switch | / | 不启用 | Y | 启用更深层的推理链以提升复杂问题解答质量 |
| 9 | 显示工具调用过程 | show\_tool\_calls | Switch | / | 启用 | Y | 开启后用户可在对话界面看到智能体调用工具的详细过程 |
| 10 | 历史对话轮数 | history\_turns | InputNumber（带+/-） | / | 20 | N | 数字输入框带 +/- 按钮；− 按钮最小值 1，步长 1；+ 按钮步长 1 |
| 11 | 压缩阈值 Tokens | compress\_threshold\_tokens | InputNumber（带+/-） | / | 3000 | N | 数字输入框带 +/- 按钮；− 按钮最小值 100，步长 100；+ 按钮步长 100 |
| 12 | 长期图谱记忆 | enable\_long\_term\_memory | Switch | / | 不启用 | N | 跨会话保留用户偏好和关键信息 |
| 13 | 激活智能体 | is\_active | Switch | — | 启用 | Y | 关闭后此智能体对用户不可见，但配置数据保留 |

### 补充说明

*   **版本号字段**：数据库表存在版本号字段，但前端已移除版本号输入控件，不在页面展示，每次保存都需要记录版本号（V1.0————V1.10————V2.0），增加快照机制。
    

---

## 创建智能体 — Step 2 角色设定

### 功能需求描述

配置智能体的系统提示词

### 用户故事

作为管理员或产品经理，我需要通过引导式流程快速创建智能体；编辑模式下修改已有智能体的全部配置

### 界面原型

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/3ea5fe57-5a04-41dc-8a53-81ed8bf10451.png)

### 数据说明

| NO | 字段名称 | 字段标识 | 组件类型 | 长度 | 默认值 | 必需 | 约束说明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 系统提示词 | system\_prompt | Textarea | 65535 | NULL | Y | 右下角显示字符统计（实时统计）；备注：「定义智能体的核心角色定位和行为规范」；支持Markdown 语法 |

---

## 创建智能体 — Step 3 能力扩展

### 功能需求描述

为智能体配置知识库、工具箱、MCP 服务、Skill 服务等扩展能力，以及附件上传限制

### 用户故事

作为管理员或产品经理，我需要通过引导式流程快速创建智能体；编辑模式下修改已有智能体的全部配置

### 界面原型

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/e7c29ebb-d025-4ba5-bdea-5f4200fc6bdc.png)

#### 知识库

##### 知识库选择弹窗

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/8d833b3e-34d8-403f-b6b7-8ae92997e073.png)

1.  打开弹窗时回显文件选中状态，可修改
    
2.  知识库——文件夹——文件三层结构父子节点关联
    
3.  搜索为模糊匹配知识库/文件夹/文件，本弹窗页面搜索
    
4.  全选为选择所有文件
    
5.  确定按钮需展示已选择文件数量统计值
    

##### 已选知识库列表

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/0ef07f8f-50ca-4cc8-8b81-11f8e755972c.png)

*   每项展示：文件类型彩色图标+ 文件名 + 文件后缀
    
*   右侧「删除」文字按钮，点击直接移除，无需二次确认
    
*   空状态提示：「暂无已选知识库，点击右上角『添加』按钮进行添加」
    

##### 开关区域

| NO | 字段名称 | 字段标识 | 组件类型 | 长度 | 默认值 | 必需 | 约束说明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 是否严格模式 | strictMode | Switch | / | 不开启 | Y | 开启后 AI 仅使用知识库回答，不联网查询 |
| 2 | 是否检索个人知识库 | enablePersonalKnowledge | Switch | / | 不开启 | Y | 开启后智能体可访问用户个人知识库文档 |
| ~~3~~ | ~~是否可开启联网查询~~ | ~~enableWebSearch~~ | ~~Switch~~ | ~~/~~ | ~~开启~~ | ~~Y~~ | ~~开启后智能体可访问互联网获取实时信息~~ |

【待定】是否可联网查询是根据是否严格模式判定还是是否有MCP工具（iqs-mcp-server-search），涉及到智能体是否展示「联网查询」按钮。

#### 工具箱

##### 选择弹窗

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/679b4023-2ed6-46d0-9ebe-5508c53a6d6f.png)

1.  打开弹窗时回显工具选中状态，可修改
    
2.  展示工具的前端展示名称（tool\_label），多选
    
3.  确定按钮需展示已选择文件数量统计值
    
4.  搜索为模糊匹配工具名称，本弹窗页面搜索
    

##### 已选工具列表

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/f16f942c-b8e6-4b68-9ca8-cb2b8748ebdf.png)

*   每项展示：工具的前端展示名称（tool\_label）
    
*   右侧「删除」文字按钮，点击直接移除
    
*   空状态提示：「暂无已选工具，点击右上角『添加』按钮进行添加」
    

#### 附件设置

**功能概述**：限制用户可以上传到此智能体的文件类型。

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/8bccafe9-7aa5-4e5f-8935-23ba0b637a09.png)

**数据说明**：

| NO | 字段名称 | 字段标识 | 组件类型 | 长度 | 默认值 | 必需 | 约束说明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 允许上传的文件类型 | allow\_attach\_exts | Select | / | NULL | Y | 多选，下拉展示格式：「选项标签」（「选项值」） |

**选项枚举（根据当前可支持的文件类型来，此处是列举）**：

| 选项标签 | 选项值 | 对应扩展名 |
| --- | --- | --- |
| PDF 文档 | pdf | .pdf |
| Word 文档 | docx | .docx |
| Excel 表格 | xlsx | .xlsx |
| 图片 | jpg,jpeg,png,gif | .jpg .jpeg .png .gif |
| 视频 | mp4,avi,mov | .mp4 .avi .mov |
| 音频 | mp3,wav,aac | .mp3 .wav .aac |
| 压缩包 | zip,rar,7z | .zip .rar .7z |
| 文本文件 | txt,md | .txt .md |

**智能体上传文件支持的格式及文案说明以此配置为准，数量及大小不走配置。**

#### MCP服务

##### 选择弹窗

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/dabbdcd8-fd99-4235-bb34-df8cd2dbaa19.png)

1.  打开弹窗时回显MCP选中状态，可修改
    
2.  展示MCP的显示名称（server\_name）、描述信息（description）、传输协议（transport\_type）、分类，多选
    
3.  确定按钮需展示已选择数量统计值
    
4.  搜索为模糊匹配显示名称/描述信息/传输协议，本弹窗页面搜索
    

##### 已选 MCP 列表

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/81af444c-7b0c-4541-87bc-048da463ae2e.png)

*   每项展示：Server 图标（固定）+ MCP 名称（`server_name`）+ 传输类型 Badge（`transport_type`）
    
*   各项以分隔线分隔，右侧「删除」文字按钮，点击直接移除无需二次确认
    
*   空状态：空状态图标 + 提示文案「暂无 MCP 服务，点击右上角『添加』按钮进行添加」
    

#### skill服务

##### 选择弹窗

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/4f25ebb0-cbf5-475c-8610-c23733161fe6.png)

1.  打开弹窗时回显skill选中状态，可修改
    
2.  展示skill的显示名称（skill\_name）、描述信息（description），多选
    
3.  确定按钮需展示已选择数量统计值
    
4.  搜索为模糊匹配显示名称/描述信息，本弹窗页面搜索
    

##### 已选skill列表

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/b708f5ed-b976-4b56-a79d-90cf1110543f.png)

*   每项展示：Sparkles 图标（固定）+ Skill 名称（`skill_name`）
    
*   各项以分隔线分隔，右侧「删除」文字按钮，点击即移除，无需二次确认
    
*   空状态：空状态图标 + 提示文案「暂无 Skill 服务，点击右上角『添加』按钮进行添加」
    

---

## 创建智能体 — Step 4 快捷提示词

### 功能需求描述

配置常用提示词，方便快速调用

### 界面原型

#### 添加/编辑提示词

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/3e5673b5-e155-4807-9847-127cfeb5e6cb.png)

| NO | 字段名称 | 字段标识 | 组件类型 | 长度 | 默认值 | 必需 | 约束说明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 提示词卡片 | promptCardTitle | Input | 限制20个字符以内 | NULL | N | 用于在列表中快速识别该提示词 |
| 2 | 提示词内容 | promptContent | Textarea | 限制200个字符以内 | NULL | N | 详细的提示词内容 |

*   快捷提示词可以不配置，但是提交添加都必填
    
*   提示词通过弹窗方式添加，支持添加多条
    
*   每条提示词以卡片形式展示在列表中，显示标题和内容
    
*   卡片右上角有删除按钮（X 图标），点击直接移除
    

#### 已添加列表

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/cbe055d5-60a7-4798-ac42-7dd5a4ed9797.png)

1.  列表显示标题「提示词卡片」+ 副标题「提示词内容」
    
2.  无提示词时显示空状态 图标 + 「暂无快捷提示词」+「点击右上角『添加提示词』按钮开始添加」
    
3.  点击「删除」直接删除提示词卡片，无需二次确认
    
4.  点击「编辑」打开编辑弹窗，同添加，回显数据
    

---

## 模型列表

### 功能需求描述

展示所有 LLM 模型配置，支持多维度筛选

### 用户故事

作为管理员，我需要查看和管理所有已配置的模型

### 主流程

1.  进入设置 → 模型管理。
    
2.  系统加载模型列表（过滤条件：未删除）。
    
3.  搜索框与筛选下拉框默认空。
    
4.  操作列三点菜单默认收起。
    

### 界面原型

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/a78ea71c-a90b-43d5-85d7-dec21b3c7528.png)

1）显示表格：名称、提供商、模型ID、类型、状态（开关）、操作。按创建时间倒序。

2）搜索：按照模型名称和ID模糊搜索。

3）添加模型：点击后打开添加弹窗，详见添加/编辑功能。

4）筛选：提供商（提供商的枚举字段）、模型类型（文本/多模态/Embedding/图像生成/视频生成/音频）、状态（状态枚举字段）。默认空（全部）。点击「清除」后重置，点击「查询」后筛选。

5）操作列三点菜单：编辑、禁用/启用、删除。

6）编辑：点击后打开编辑弹窗，详见添加/编辑功能。

7）禁用/启用：

*   列表页状态列提供 Switch 开关，点击即可切换启用/禁用
    
*   禁用模型时，查询是否关联智能体，如果是则提示「有 N 个智能体正在使用此模型，请取消关联后再禁用模型」并且不执行禁用，如果否则修改状态为「已禁用」。
    

8）删除：

*   系统内置模型（is\_builtin=1）不可删除，点击后提示「系统内置模型，不允许删除」；
    
*   删除模型时，查询是否关联智能体，如果是则提示「有 N 个智能体正在使用此模型，请取消关联后再删除模型」并且不执行删除，如果否则修改删除状态为「已删除」；
    
*   删除为逻辑删除。【？】
    

### 数据说明

暂无

### 业务规则

*   唯一约束：provider\_id + model\_id + del\_flag 联合唯一
    
*   系统内置模型（is\_builtin=1）不可删除
    

### 接口说明

暂无

---

## 模型创建/编辑

### 功能需求描述

表单填写模型配置，含基础信息和可折叠高级配置区

### 用户故事

作为管理员，我需要通过表单添加新的 LLM 模型配置或者修改原配置

### 页面原型

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/b973e479-0d0b-4da8-ac7d-01734d15419b.png)

### 数据说明

#### 基础信息区

| NO | 字段名称 | 字段标识 | 组件类型 | 长度 | 默认值 | 必需 | 约束说明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 模型显示名称 | name | Input | 255 | 空 | Y | — |
| 2 | 关联提供商 | provider\_id | Select | — | 空 | Y | 关联的提供商ID（agent\_llm\_providers.id） |
| 3 | 别名 | alias | Input | 255 | 空 | N | 系统内部调用标识，编辑时不可修改。 |
| 4 | 实际模型ID | model\_id | Input | 255 | 空 | Y | 实际模型ID，API调用时的model参数（如 deepseek-chat） |
| 5 | 模型类型 | model\_type | Select | 50 | text | Y | 枚举：text/embedding/multimodal/image\_generation/video\_generation/audio，单选 |
| 6 | 模型描述 | description | Textarea | 65535 | 空 | N | — |

#### 高级配置区（可折叠）

| NO | 字段名称 | 字段标识 | 组件类型 | 长度/精度 | 默认值 | 必需 | 约束说明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Base URL 覆盖 | base\_url | Input | 512 | 空 | N | URL 格式校验 |
| 2 | API Key 覆盖 | api\_key | Password | 512 | 空 | N | 脱敏展示，支持显示/隐藏切换 |
| 3 | 上下文窗口大小 | context\_length | InputNumber | — | 131072 | N | 覆盖提供商默认值，单位 Token |
| 4 | 最大输出 Token | max\_output\_tokens | InputNumber | — | 8192 | N | 覆盖提供商默认值，单位 Token |
| 5 | 最大输入 Token | max\_input\_tokens | InputNumber | — | 空 | N | 空则用上下文长度推算 |
| 6 | 模态能力 | modalities | Input | 500 | 空 | N | 英文逗号分隔输入，如 vision,video,audio |
| 7 | 支持视觉 / 看图 | supports\_vision | Switch | — | 0 | N | 允许模型接收图像作为输入 |
| 8 | 支持函数调用 / 工具 | supports\_tools | Switch | — | 1 | N | 允许模型调用外部工具和函数 |
| 9 | 支持 JSON 结构化输出 | supports\_json\_mode | Switch | — | 1 | N | 允许模型输出结构化 JSON 格式 |
| 10 | 支持流式输出 | supports\_streaming | Switch | — | 1 | N | 允许模型以流式方式返回响应 |
| 11 | 温度参数 | temperature | InputNumber | — | 空 | N | 数字输入框，需输入大于0的数字 |
| 12 | Top-P 核采样 | top\_p | InputNumber | — | 空 | N | 数字输入框，需输入大于0的数字 |
| 13 | 输入价格 | input\_price | InputNumber | (18,8) | NULL | N | 每 price\_unit 个 Token 的金额，缓存未命中也存这个字段 |
| 14 | 输入价格（缓存未命中） | input\_price | InputNumber | (18,8) | NULL | N | 每 price\_unit 个 Token 的金额，缓存未命中 |
| 15 | 输入价格(缓存命中) | input\_price\_cached | InputNumber | (18,8) | NULL | N | 每 price\_unit 个 Token 的金额，缓存命中 |
| 16 | 输出 Token 单价 | output\_price | InputNumber | (18,8) | 空 | N | 输出Token单价（每price\_unit个Token的金额） |
| 17 | 计价单位（Token 数） | price\_unit | InputNumber | — | 1000 | N | 计价单位：单价对应的Token数，如1000（每千Token） |
| 18 | 币种 | currency | Select | 8 | 'CNY' | N | CNY/USD |

#### 启用状态

| NO | 字段名称 | 字段标识 | 组件类型 | 默认值 | 必需 | 约束说明 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 是否启用 | enabled | Switch | 1 | N | 启用/禁用规则同列表 |
| 2 | 是否默认 | is\_default | Switch | 0 | N | 该提供商下唯一 |

### 异常流程

*   若 provider\_id + model\_id 组合已存在，提示「该提供商下模型ID已存在」
    
*   若 base\_url 格式不合法，表单校验拦截
    

### 补充说明

1）主键自增

2）以下字段不启用：

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/e76e42d9-4187-43f7-b931-95c7fcb28fc3.png)

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/2fa10dee-4cdf-419e-a226-9473628a3232.png)

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/0ae132b7-5a76-49ab-b5ac-73eed07ed3b3.png)

3）页面不展示，但需要记录的字段：

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/b88aadc7-483f-4a98-9db0-710db4749ef0.png)

---

## Skill列表

### 功能需求描述

展示所有 Skill，支持搜索、状态筛选、分页

### 用户故事

作为管理员，我需要查看所有已配置的 Skill 并快速找到目标技能

### 主流程

1.  进入设置 → Skill 管理
    
2.  系统加载skill列表（过滤条件：无）
    
3.  搜索框与筛选下拉框默认空。
    
4.  操作列三点菜单默认收起。
    

### 界面原型

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/e62c35b2-254d-4538-ace9-513656db91f3.png)

1）显示表格：名称、描述、状态（开关）、操作。按创建时间倒序。

2）搜索：按照skill名称/描述模糊搜索。

3）创建skill：点击后打开添加弹窗，详见添加/编辑功能。

4）筛选：状态（状态枚举字段）。默认空（全部）。点击「清除」后重置，点击「查询」后筛选。

5）操作列三点菜单：编辑、删除。

6）编辑：点击后打开编辑弹窗，详见添加/编辑功能，编辑时除特殊说明都可改。

7）禁用/启用：

*   列表页状态列提供 Switch 开关，点击即可切换启用/禁用
    
*   禁用skill时，查询是否关联智能体，如果是则提示「有 N 个智能体正在使用此skill，请取消关联后再禁用skill」并且不执行禁用，如果否则修改状态为「已禁用」。
    

8）删除：

*   删除skill时，查询是否关联智能体，如果是则提示「有 N 个智能体正在使用此skill，请取消关联后再删除skill」并且不执行删除，如果否则删除；
    
*   表里没有标记是否删除字段，删除应该是清空这两个字段：
    
*   ![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/af22001d-16cc-4aaf-98e3-057754b0980b.png)
    

### 数据说明

暂无

### 业务规则

暂无

### 接口说明

暂无

---

## Skill 创建/编辑

### 功能需求描述

单步表单创建 Skill，含基本信息和技能压缩包上传

### 用户故事

作为管理员，我需要通过表单添加新的 Skill 并上传技能内容

### 界面原型

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/a899b437-4482-4d5e-a697-cec3837c4b78.png)

### 数据说明

#### 基本信息区

| NO | 字段名称 | 字段标识 | 组件类型 | 长度 | 默认值 | 必需 | 约束说明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 名称 | skill\_name | Input | 50 | NULL | Y | 显示字数计数（N/50） |
| 2 | 标识符 | skill\_code | Input | 50 | NULL | 前端非必填，后端必须存 | 工具的唯一标识符，留空将自动生成，编辑时不可修改。 |
| 3 | 描述 | description | Textarea | 200 | NULL | N | 200 字限制 |

#### 技能内容区：

| NO | 字段名称 | 字段标识 | 组件类型 | 长度 | 默认值 | 必需 | 约束说明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Skill 压缩包 | / | 文件上传 | — | NULL | Y | 仅支持 .zip 格式，≤10MB |

**上传交互说明**

*   未上传时：紧凑按钮式（Upload 图标按钮 + "上传 Skill 压缩包" 文字 + "支持 .zip，≤10MB" 说明）
    
*   已上传后：绿色文件卡片（文件名、文件大小、下载按钮、删除按钮）。点下载调浏览器下载。点删除二次确认后删除，二次确认文案“确认删除？”。
    
*   仅支持上传一个 .zip 文件，不支持拖拽。
    

### 业务规则

*   标识符留空时系统自动生成（对应数据库 skill\_code 字段）
    
*   skill\_code 创建后不可修改
    
*   编辑模式下加载已有数据回填基本信息
    
*   压缩包上传需校验文件格式（.zip）和大小（≤10MB）
    

### 异常流程

*   若上传非 .zip 文件，直接拦截，绕过拦截后端校验提示「请上传 .zip 格式的压缩包」
    
*   若文件超过 10MB，提示「文件大小不能超过 10MB」
    
*   若 skill\_code 已存在，提示「标识已存在」
    

### 补充说明

1）主键自增

2）页面不展示，但需要记录的字段：

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/aee72409-e709-452c-b22a-522916764628.png)

---

## MCP 列表

### 功能需求描述

展示所有 MCP 服务，支持搜索、状态筛选、分页

### 用户故事

作为开发者，我需要查看所有已配置的 MCP 服务并快速了解可用状态

### 主流程

1.  进入设置 → MCP 管理
    
2.  系统加载MCP列表（过滤条件：无）
    
3.  搜索框与筛选下拉框默认空。
    
4.  操作列三点菜单默认收起。
    

### 界面原型

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/11650fd0-3068-49fa-873e-edfa61484c1b.png)

1）显示表格：名称、描述、传输类型、状态（开关）、操作。按创建时间倒序。

2）搜索：按照MCP名称/描述模糊搜索。

3）创建MCP：点击后打开添加弹窗，详见添加/编辑功能。

4）筛选：状态（状态枚举字段）。默认空（全部）。点击「清除」后重置，点击「查询」后筛选。

5）操作列三点菜单：编辑、删除。

6）编辑：点击后打开编辑弹窗，详见添加/编辑功能，编辑时除特殊说明都可改。

7）禁用/启用：

*   列表页状态列提供 Switch 开关，点击即可切换启用/禁用
    
*   禁用MCP时，查询是否关联智能体，如果是则提示「有 N 个智能体正在使用此MCP，请取消关联后再禁用MCP」并且不执行禁用，如果否则修改状态为「已禁用」。
    

8）删除：

*   删除MCP时，查询是否关联智能体，如果是则提示「有 N 个智能体正在使用此MCP，请取消关联后再删除MCP」并且不执行删除，如果否则删除；
    

### 数据说明

暂无

### 业务规则

暂无

### 接口说明

暂无

---

## MCP 创建/编辑

### 功能需求描述

单步表单创建 MCP 服务，含基本信息和 MCP 配置区（传输类型 + JSON 配置）

### 用户故事

作为开发者，我需要通过表单添加新的 MCP 服务并配置传输协议和连接参数

### 界面原型

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/aac92a69-4be8-4341-8061-8aa83815b7b6.png)

### 数据说明

#### 基本信息区

| NO | 字段名称 | 字段标识 | 组件类型 | 长度 | 默认值 | 必需 | 约束说明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 名称 | server\_name | Input | 128 | NULL | Y | 显示字数计数（N/50） |
| 2 | 标识符 | server\_code | Input | 64 | NULL | 前端非必填，后端必须存 | MCP 服务的唯一标识符，留空将自动生成，编辑时不可修改。 |
| 3 | 描述 | description | Textarea | 512 | NULL | N | 3 行文本框，200 字限制 |
| 4 | 分类 | / | Select | / | NULL | Y | 区分是哪个业务线用的。枚举：通用、B2B、B2C、直播、商品、门店 |

#### MCP 配置区

| NO | 字段名称 | 字段标识 | 组件类型 | 长度 | 默认值 | 必需 | 约束说明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 传输类型 | transport\_type | Select | / | NULL | Y | 枚举：Streamable HTTP / SSE / STDIO |
| 2 | MCP 配置 | mcp\_config\_json | Textarea | / | NULL | Y | 文本框，JSON 格式，等宽字体；前端统一提交 JSON 文本，后端解析为 command / args\_json / env\_vars\_json / url / headers\_json |

**连接预览功能**：

*   「连接预览」按钮位于 MCP 配置右侧
    
*   点击时先校验 JSON 格式：格式错误 → Toast 提示「请先填写正确的 JSON 配置」
    
*   JSON 合法 → 弹出预览弹窗，展示接口列表（名称、描述、参数）。
    
*   ![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/mxPOG5v8ko3JNnKa/img/a0125321-6634-4848-a907-011a1f96166f.png)
    

### 业务规则

*   标识符留空时系统自动生成（对应数据库 server\_code 字段）
    
*   server\_code 创建后不可修改
    
*   编辑模式下加载已有数据回填基本信息
    
*   前端以 JSON 文本框统一提交 MCP 配置，后端根据 transport\_type 解析存储：
    
    *   STDIO 模式 → 解析为 command、args\_json、env\_vars\_json
        
    *   SSE / Streamable HTTP 模式 → 解析为 url、headers\_json
        
*   operator\_union\_id、request\_timeout\_seconds、is\_inner 由后端自动处理，不在页面展示
    

### 异常流程

*   若 server\_code 已存在，提示「标识已存在」
    
*   若 MCP 配置 JSON 格式不合法，表单校验拦截，提示「请填写正确的 JSON 格式」
    

### 接口说明

暂无

---

# 非功能需求

## 响应时间

| 指标 | 目标值 | 说明 |
| --- | --- | --- |
| 首 Token 延迟 | < 1s | 流式输出场景 |
| 完整输出延迟 | < 10s | 流式输出场景 |
| 列表页加载 | < 500ms | 含网络请求 |
| 表单保存响应 | < 1s | 不含 LLM 调用 |
| 配置变更生效 | < 30s | 热更新 |

## 吞吐率

| 指标 | 目标值 | 说明 |
| --- | --- | --- |
| 并发智能体 | 100 个 | 同时活跃的智能体实例 |
| QPS | 50 req/s | 前端 API 请求峰值 |
| LLM 并发调用 | 20 req/s | 受提供商限流约束 |

## 可用性

| 指标 | 目标值 | 说明 |
| --- | --- | --- |
| 服务可用性 | SLA 99.9% | 月度不可用时间 < 43 分钟 |
| 数据持久性 | 99.99% | 配置数据不丢失 |
| 故障恢复 | RTO < 30min | 故障恢复时间目标 |

## 安全性

| 安全域 | 措施 | 说明 |
| --- | --- | --- |
| **凭证安全** | API Key 加密存储 | 使用 AES-256 加密，数据库不存明文 |
| **凭证安全** | API Key 脱敏展示 | 前端仅展示前后 4 位 |
| **访问控制** | RBAC 权限控制 | 管理员/业务人员/开发者三级权限 |
| **输入安全** | Prompt 注入防护 | 输入清洗 + 指令隔离 |
| **输出安全** | 内容审核 | 调用内容安全 API 检测 |
| **传输安全** | HTTPS 全链路加密 | 前后端通信 + LLM API 调用 |
| **审计** | 操作日志 | 记录所有配置变更操作 |

---

## 附录

### A. 数据库实体关系

```plaintext
agent_llm_providers (提供商)
       │ 1:N
       ▼
system_llm_model (大模型配置)
       │ 1:N (通过 model_id 外键)
       ▼
agent_conf (智能体配置) ──── model_id → system_llm_model.id
       │ 1:N
       ▼
agent_user_script_rel (用户剧本)

system_tool        (工具定义 - 独立实体)
system_skill       (Skill 配置 - 独立实体)
system_mcp_server  (MCP Server - 独立实体)
```