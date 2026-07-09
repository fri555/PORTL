# Agent 工作规范

## 修改代码后的测试流程

修改任何代码后，必须完成以下测试步骤才能提交：

### 1. 功能测试（修改涉及的模块）
```bash
cd frontend-mvp
npx vitest run src/views/__tests__/KnowledgeBaseView.spec.ts
```

### 2. 回归测试（全量测试）
```bash
cd frontend-mvp
npx vitest run src/
```

### 3. 关键词残留检查
修改 PRD 或原型后，搜索以下关键词确保零残留：
```
密级、DOWNLOADER、回收站、待审核、reviewing、50个、多级嵌套、自定义标签、四种问答
```

### 4. 构建检查（可选，大型改动时）
```bash
cd frontend-mvp
npm run build
```

## 知识中心评审决议关键变更记录

| 评审项 | 状态 | PRD 修改 | 原型修改 |
|--------|------|----------|----------|
| 文件级权限删除 | ✅ | §3.2.2.3 整章删除 | SecurityLevel 类型移除 |
| 密级功能下线 | ✅ | §3.2.2.4 整章删除 | 所有 getDocSecurityClass/Label 移除 |
| 回收站删除 | ✅ | §3.2.4.5 整章删除 | recycleItems/pushRecycleItem 等全部移除 |
| 四层架构 | ✅ | 产品概述/架构图修改 | 侧栏删除空间文件夹层级 |
| 右键菜单移除 | ✅ | 全局替换为三点菜单 | 模板中 contextMenu 弹窗删除 |
| DOWNLOADER角色 | ✅ | 角色枚举/矩阵修改 | PermissionRole 类型修改 |
| 问答模式裁剪 | ✅ | 4种→纯聊天 | qaMode 改为 ref('chat') |
| 自定义标签删除 | ✅ | 上传描述移除 | addCustomTag/uploadCustomTagName 等移除 |
| 全局搜索 | ✅ | §3.2.4.2 重写 | inline 搜索改为全局搜索按钮 |
| 批次50→10 | ✅ | 上传规则修改 | 前端不限制文件选择数量 |
| 审核流程 | ✅ | reviewing 状态移除 | 上传状态流转简化 |
| 审计导出 | ✅ | 导出描述移除 | exportAuditLog 移除 |
| 会话独立 | ✅ | 会话管理描述修改 | qaMessages 独立于主对话 |
| 文件清洗规则 | ✅ | §3.2.4.1.7 新增 | 无需前端修改 |
| 向量化切块 | ✅ | §3.2.4.1.7 新增 | 无需前端修改 |
