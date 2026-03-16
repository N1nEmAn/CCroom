# CCroom 重构总计划

## 0. 文档定位

这是一份“只做规划、不做实现”的总计划，目标是把当前 `OpenClaw-bot-review` 重构为新的多运行时本地 AI 会话总览项目 `CCroom`。

本计划覆盖：

- 仓库改名与品牌替换
- 架构重构
- OpenClaw / Claude Code / Codex 多引擎接入
- 多 session 统一展示与管理
- 前后端 API 重做
- 文档、归属、版权与非商用说明
- 测试、验收、发布与迁移顺序

本计划不包含直接编码实现。

---

## 1. 上游与版权边界

### 1.1 上游来源

- 当前仓库 `origin` 指向：`https://github.com/xmanrui/OpenClaw-bot-review`
- 当前项目显然以上游仓库为基础演化
- `README.md` 也直接声明该项目是 OpenClaw Dashboard

### 1.2 当前版权风险结论

基于本地勘察：

- 仓库根目录未发现 `LICENSE`、`COPYING`、`NOTICE`
- 在没有明确开源许可证的前提下，默认应按“保留所有权利”处理

这意味着：

- 不能擅自给上游代码重新套一个你自己的开源许可证
- 不能在没有授权的情况下，对外宣称“允许转载但必须署名”之类的新法律条件已经生效
- 不能在没有授权的情况下，把上游代码部分包装成可自由商用的项目

### 1.3 你的诉求如何落地才稳妥

你的要求是：

- 明确上游来自这里
- 另起炉灶
- 不可商用
- 再转载需要说明作者

稳妥做法不是“伪造许可证”，而是分三层处理：

1. 事实声明层

- 在 `README.md`、`NOTICE.md`、`PROVENANCE.md` 明确写出：
  - 本项目最初基于 `xmanrui/OpenClaw-bot-review` 进行重构
  - 当前项目为独立演化分支 `CCroom`
  - 保留对原作者来源的显式说明

2. 使用政策层

- 在 `README.md` 和 `NOTICE.md` 写明“项目维护方的发布政策/使用声明”：
  - 当前版本仅计划用于学习、研究、个人使用
  - 不建议商用
  - 再分发请保留原作者来源说明与本项目改造说明

3. 法律授权层

- 必须新增一个明确的“法律确认任务”：
  - 要么取得上游作者书面授权
  - 要么上游补充许可证
  - 要么 `CCroom` 仅内部自用，不公开分发

### 1.4 计划中的法律文档动作

需要新增或修改的文档：

- `README.md`
- `NOTICE.md`
- `PROVENANCE.md`
- `COPYRIGHT.md`

建议文案原则：

- 不写“本项目采用某某许可证”，除非拿到合法授权
- 不写“禁止商用具有法律效力”，除非许可证或授权明确支持
- 可以写“项目使用政策 / 维护者声明 / 再分发时请保留来源说明”
- 必须明确原始上游仓库地址与原作者

---

## 2. 现状勘察摘要

### 2.1 技术栈

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- 无数据库
- 当前以本地文件和本地 CLI / Gateway 为数据源

### 2.2 当前项目的 OpenClaw 强耦合点

以下位置基本都默认“只有 OpenClaw”：

- `lib/openclaw-paths.ts`
- `lib/openclaw-cli.ts`
- `lib/model-probe.ts`
- `lib/openclaw-skills.ts`
- `lib/session-test-fallback.ts`
- `app/api/config/route.ts`
- `app/api/agent-activity/route.ts`
- `app/api/sessions/[agentId]/route.ts`
- `app/api/test-session/route.ts`
- `app/api/test-model/route.ts`
- `app/api/config/agent-model/route.ts`
- `app/api/gateway-health/route.ts`
- `app/api/skills/route.ts`
- `app/api/skills/content/route.ts`
- `app/api/stats-*`
- `app/page.tsx`
- `app/sessions/page.tsx`
- `app/models/page.tsx`
- `app/sidebar.tsx`
- `app/layout.tsx`
- `app/pixel-office/page.tsx`
- `README.md`
- `quick_start.md`
- `package.json`

### 2.3 当前产品心智模型

当前产品把所有核心概念都建模成：

- Agent
- Platform
- Gateway
- OpenClaw Session
- OpenClaw Skills

这套模型对 OpenClaw 成立，但对 Claude Code 和 Codex 不成立，因为：

- Claude Code 的核心对象更接近 `Project + Session`
- Codex 的核心对象更接近 `Thread + Workspace + Logs`
- 这两个系统都不天然有 OpenClaw 那种 `agents.list / gateway / bindings / skills` 结构

结论：

- 不能继续在现有 OpenClaw 数据结构上硬补丁
- 必须把数据域从“OpenClaw Agent Dashboard”重构为“多引擎本地 AI Runtime Dashboard”

---

## 3. 本机真实数据源事实

以下是本机已确认的事实，后续实现必须以这些事实为准。

### 3.1 OpenClaw

本机路径形态：

- `~/.openclaw/openclaw.json`
- `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- `~/.openclaw/agents/<agentId>/sessions/*.jsonl`

能力形态：

- 有配置文件
- 有 agent 概念
- 有 gateway
- 有模型与 provider 配置
- 有 session 索引和 transcript

### 3.2 Claude Code

本机 CLI：

- `claude` 存在
- 版本：`2.1.76`

本机路径形态：

- `~/.claude/projects/<projectSlug>/*.jsonl`
- `~/.claude/projects/<projectSlug>/sessions-index.json`
- `~/.claude/history.jsonl`
- `~/.claude/tasks/...`

CLI 可用能力：

- `claude -c` 继续当前目录最近会话
- `claude -r <sessionId>` 按 session 恢复
- `claude --session-id <uuid>` 指定会话
- `claude -p` 非交互运行
- `claude --model`
- `claude --agent`
- `claude --worktree`

结论：

- Claude 适合以 `projectPath + sessionId + transcript jsonl` 为核心数据模型
- Claude 的“多 session”天然存在，且有 `sessions-index.json` 可加速扫描
- Claude 支持后续加入“从 CCroom 点击恢复/继续会话”的动作能力

### 3.3 Codex

本机 CLI：

- `codex` 存在
- 版本：`codex-cli 0.114.0`

本机路径形态：

- `~/.codex/config.toml`
- `~/.codex/state_5.sqlite`
- `~/.codex/logs_1.sqlite`
- `~/.codex/history.jsonl`

已确认的 SQLite 结构：

- `state_5.sqlite` 中有 `threads`
- `state_5.sqlite` 中有 `stage1_outputs`
- `state_5.sqlite` 中有 `thread_dynamic_tools`
- `logs_1.sqlite` 中有 `logs`

`threads` 已确认字段包括：

- `id`
- `created_at`
- `updated_at`
- `source`
- `model_provider`
- `cwd`
- `title`
- `sandbox_policy`
- `approval_mode`
- `archived`
- `git_branch`
- `git_origin_url`
- `cli_version`
- `first_user_message`
- `agent_nickname`
- `agent_role`

CLI 可用能力：

- `codex exec`
- `codex review`
- `codex resume`
- `codex fork`
- `codex -C <dir>`
- `codex --model`
- `codex --search`

结论：

- Codex 不适合继续走“扫 JSONL 目录”的套路
- Codex 应以 `thread + logs + cwd` 为中心建模
- Codex 支持后续加入“resume / fork / exec”的动作能力

---

## 4. CCroom 的目标定义

### 4.1 项目新定位

`CCroom` 的产品定位应改为：

> 一个面向本机 AI 编码/代理运行时的统一控制台，支持 OpenClaw、Claude Code、Codex 的多会话发现、状态汇总、历史查看、模型信息汇总和后续操作入口。

### 4.2 一期必须达成的核心目标

一期目标建议定义为：

- 完成从 `OpenClaw Dashboard` 到 `CCroom` 的品牌替换
- 保留 OpenClaw 支持
- 新增 Claude Code 支持
- 新增 Codex 支持
- 支持跨引擎的多 session 浏览
- 支持跨引擎的基础状态聚合
- 支持按引擎、工作区、项目、会话筛选
- 文档中明确上游来源与版权边界

### 4.3 二期目标

- 从页面一键恢复 Claude / Codex 会话
- 从页面发起新会话
- 统一“健康检查 / 探活 / resume / fork / exec”动作入口
- 像素办公室支持多引擎实体

### 4.4 非目标

以下内容不建议在首轮重构强行做完：

- 不做数据库化
- 不做多人协作服务端
- 不做云端同步
- 不做 OpenClaw / Claude / Codex 所有特性的 100% UI 对齐
- 不做未经授权的许可证重写
- 不做“完全隐藏上游来源”的白牌化处理

---

## 5. 关键产品决策

### 5.1 不能再用 “agent” 作为全局主对象

必须替换当前全站数据心智：

- 旧主对象：`agent`
- 新主对象：`runtime entity`

建议新域模型：

- `runtime`
  - 值：`openclaw` | `claude` | `codex`
- `workspace`
  - 对应本地根目录、项目目录或 runtime home
- `entity`
  - 可展示对象
  - OpenClaw 中可映射为 agent
  - Claude 中可映射为 project
  - Codex 中可映射为 workspace 或 thread group
- `session`
  - OpenClaw session
  - Claude session
  - Codex thread
- `action`
  - 可执行能力，如 resume、fork、probe、open、jump、view transcript

### 5.2 保留 OpenClaw，但不再把它当成唯一中心

方向不是删除 OpenClaw，而是把它变成三种 runtime 之一：

- OpenClaw adapter
- Claude adapter
- Codex adapter

### 5.3 页面语义要从 “监控机器人” 改成 “观察本地 AI 工作流”

建议统一为以下语义：

- 首页：运行时总览
- Sessions：会话总览
- Models：模型与提供方
- Stats：多源统计
- Skills：能力/扩展
- Alerts：告警中心
- Pixel Office：可视化工作室

---

## 6. 总体架构方案

### 6.1 新目录结构建议

建议将强耦合的 OpenClaw 工具拆成多引擎结构：

```text
lib/
  core/
    types.ts
    time.ts
    cache.ts
    errors.ts
  runtimes/
    registry.ts
    types.ts
    openclaw/
      adapter.ts
      paths.ts
      cli.ts
      parser.ts
      models.ts
      sessions.ts
      health.ts
      skills.ts
    claude/
      adapter.ts
      paths.ts
      parser.ts
      sessions.ts
      projects.ts
      actions.ts
      health.ts
    codex/
      adapter.ts
      paths.ts
      sqlite.ts
      threads.ts
      logs.ts
      actions.ts
      health.ts
  ui/
    view-models.ts
    labels.ts
```

### 6.2 统一接口定义

建议定义 `RuntimeAdapter`：

```ts
interface RuntimeAdapter {
  id: "openclaw" | "claude" | "codex";
  displayName: string;
  detect(): Promise<RuntimeDetection>;
  listEntities(): Promise<EntitySummary[]>;
  listSessions(filters?: SessionFilter): Promise<SessionSummary[]>;
  getEntityStats(entityId: string): Promise<EntityStats>;
  getModels(): Promise<ModelSummary[]>;
  getHealth(): Promise<RuntimeHealth>;
  getCapabilities(): Promise<CapabilitySummary[]>;
  listActions(): Promise<ActionDescriptor[]>;
}
```

### 6.3 ViewModel 层必须独立

不能让页面直接理解各 runtime 的原始数据结构。

必须引入一层：

- adapter 返回 runtime 原始标准化对象
- view-model 层再转换为页面需要的卡片/表格/图表结构

这样可避免：

- `app/page.tsx` 到处写 `if (runtime === "codex")`
- `app/sessions/page.tsx` 混杂多种解析逻辑
- API 返回结构在多处重复拼接

---

## 7. 分阶段实施计划

## Phase 0. 基线保护与命名改造

### 目标

- 把项目从品牌层面准备成 `CCroom`
- 在不破坏现有运行的情况下，为后续大改建立缓冲层

### 任务

1. 仓库与包名规划

- GitHub 仓库名改为 `CCroom`
- `package.json` 中 `name` 从 `openclaw-bot-review` 改为 `ccroom`
- 页面 metadata 标题改为 `CCroom`
- 导航、页头、按钮、空状态统一去除 “OpenClaw Dashboard” 专名

2. 文案替换清单

- `README.md`
- `quick_start.md`
- `app/layout.tsx`
- `app/sidebar.tsx`
- `app/gateway-status.tsx`
- `lib/i18n.tsx`
- 所有页面标题、按钮、帮助文案

3. 兼容别名保留策略

- 第一阶段保留环境变量兼容：
  - `OPENCLAW_HOME`
- 同时新增通用变量：
  - `CCROOM_RUNTIME_ROOTS`
  - `CCROOM_OPENCLAW_HOME`
  - `CCROOM_CLAUDE_HOME`
  - `CCROOM_CODEX_HOME`

4. 输出文档

- 新增 `NOTICE.md`
- 新增 `PROVENANCE.md`
- 新增 `COPYRIGHT.md`

### Phase 0 验收标准

- 项目名称、导航、metadata、README 主标题全部切换为 `CCroom`
- 文档明确标出上游来源
- 文档没有写出非法或不稳妥的许可证表述

---

## Phase 1. 领域模型重构

### 目标

- 彻底去掉“全站只认 OpenClaw agent”的数据模型

### 任务

1. 设计统一类型

- `RuntimeId`
- `WorkspaceSummary`
- `EntitySummary`
- `SessionSummary`
- `EntityStats`
- `ModelSummary`
- `RuntimeHealth`
- `CapabilitySummary`
- `ActionDescriptor`

2. 设计统一状态枚举

- `online`
- `active`
- `idle`
- `archived`
- `offline`
- `error`

3. 设计统一 session 类型枚举

- `interactive`
- `direct`
- `group`
- `cron`
- `thread`
- `project-session`
- `unknown`

4. 统一 token / usage 结构

- `inputTokens`
- `outputTokens`
- `totalTokens`
- `contextTokens`
- `messageCount`
- `avgResponseMs`

5. 统一 action 结构

- `open_transcript`
- `resume`
- `fork`
- `probe`
- `open_workspace`
- `open_runtime_home`

### 建议新增文件

- `lib/core/types.ts`
- `lib/runtimes/types.ts`
- `lib/runtimes/registry.ts`

### Phase 1 验收标准

- 页面和 API 不再依赖 `agent` 作为唯一顶层类型
- 可用一个统一结构表达 OpenClaw / Claude / Codex 三者

---

## Phase 2. 把 OpenClaw 代码抽成 adapter

### 目标

- 不改变 OpenClaw 现有能力，但把它封装成一个 runtime adapter

### 任务

1. 文件搬迁与重命名

- `lib/openclaw-paths.ts` -> `lib/runtimes/openclaw/paths.ts`
- `lib/openclaw-cli.ts` -> `lib/runtimes/openclaw/cli.ts`
- `lib/openclaw-skills.ts` -> `lib/runtimes/openclaw/skills.ts`
- `lib/model-probe.ts` 中 OpenClaw 相关逻辑拆到 `lib/runtimes/openclaw/models.ts`

2. OpenClaw adapter 方法实现

- `detect()`
- `listEntities()`
- `listSessions()`
- `getModels()`
- `getHealth()`
- `getCapabilities()`

3. 抽离 parser

- `sessions.json` 解析
- transcript `.jsonl` 解析
- group/direct/cron/subagent 识别
- gateway 探活

4. 兼容旧 API

- 先用 wrapper 保持当前页面不崩
- 后面逐步切到新 API

### 涉及现有文件

- `app/api/config/route.ts`
- `app/api/agent-activity/route.ts`
- `app/api/sessions/[agentId]/route.ts`
- `app/api/gateway-health/route.ts`
- `app/api/skills/route.ts`
- `app/api/skills/content/route.ts`
- `app/api/test-session/route.ts`
- `app/api/test-model/route.ts`
- `app/api/config/agent-model/route.ts`

### Phase 2 验收标准

- OpenClaw 数据读取全部通过 adapter
- 旧功能不退化
- 页面不再直接 import `lib/openclaw-*`

---

## Phase 3. Claude Code adapter

### 目标

- 接入本机 Claude Code 的 project 和多 session

### 任务

1. 路径与探测

- 默认根目录：`~/.claude`
- 项目目录：`~/.claude/projects/*`
- 如果存在 `sessions-index.json`，优先用索引
- 如果索引不存在，回退到扫描 `*.jsonl`

2. 数据模型映射

- `projectSlug` -> `entityId`
- `projectPath` -> `workspacePath`
- `sessionId` -> `session.id`
- `firstPrompt` / `summary` -> `session.title`
- `modified` / `fileMtime` -> `lastActive`
- `messageCount` -> `messageCount`

3. transcript 解析策略

- 解析 user / assistant / tool_use / tool_result
- 统计 token 使用量
- 统计最近活跃时间
- 尝试推断当前模型
- 尝试推断 session 状态：
  - 最近有新消息 -> `active`
  - 长时间无更新 -> `idle`

4. Claude entity 设计

建议：

- `entity = project`
- `session = 某个 project 下的一次 Claude 会话`

5. Claude action 设计

一期只读：

- 查看 transcript
- 跳转本地项目路径

二期可操作：

- `claude -r <sessionId>`
- `claude -c`
- `claude -p`

6. Claude 健康探测

不应该假设有 gateway。

建议健康结构：

- CLI 是否存在
- `~/.claude` 是否存在
- 最近是否有 session 记录

### 建议新增文件

- `lib/runtimes/claude/paths.ts`
- `lib/runtimes/claude/projects.ts`
- `lib/runtimes/claude/sessions.ts`
- `lib/runtimes/claude/parser.ts`
- `lib/runtimes/claude/actions.ts`
- `lib/runtimes/claude/adapter.ts`

### Phase 3 验收标准

- 首页能看到 Claude 项目实体
- Sessions 页面能列出 Claude 多 session
- 至少能显示标题、项目路径、最后活跃、消息数、基础 usage

---

## Phase 4. Codex adapter

### 目标

- 接入本机 Codex 的 threads / logs

### 任务

1. 路径与探测

- 默认根目录：`~/.codex`
- 状态库：`state_5.sqlite`
- 日志库：`logs_1.sqlite`
- 需要考虑未来版本文件名变化：
  - `state_*.sqlite`
  - `logs_*.sqlite`

2. SQLite 访问层

- 不要在页面里写 SQL
- 建立专门的 `sqlite.ts`
- 包装查询函数

3. 核心查询

- 读取 `threads`
- 读取 `stage1_outputs`
- 读取 `logs`
- 按 `thread_id` 关联日志
- 按 `cwd` 聚合 workspace

4. Codex entity 设计

建议：

- `entity = workspace` 或 `cwd group`
- `session = thread`

理由：

- 页面要展示多 session，更自然的分组是按工作目录
- 单个 `thread` 过细，不适合作为首页一级对象

5. 状态推断

可根据以下信息综合判断：

- `threads.updated_at`
- 最近日志时间
- 最近日志 target
- 是否 archived

建议映射：

- 最近 5 分钟有日志且非 archived -> `active`
- 有 thread 但长时间无更新 -> `idle`
- archived = true -> `archived`
- 数据库不存在或无法读取 -> `offline` / `error`

6. 模型与 provider

- `threads.model_provider`
- `~/.codex/config.toml` 默认模型
- 页面要接受“只能知道 provider，不一定知道完整模型名”

7. Codex action 设计

一期只读：

- 查看 thread 信息
- 打开工作目录

二期可操作：

- `codex resume <thread>`
- `codex fork <thread>`
- `codex exec`

### 建议新增文件

- `lib/runtimes/codex/paths.ts`
- `lib/runtimes/codex/sqlite.ts`
- `lib/runtimes/codex/threads.ts`
- `lib/runtimes/codex/logs.ts`
- `lib/runtimes/codex/actions.ts`
- `lib/runtimes/codex/adapter.ts`

### Phase 4 验收标准

- 首页能看到 Codex workspace / 实体卡片
- Sessions 页面能列出 Codex threads
- 能显示 cwd、title、model_provider、updated_at、archived 状态

---

## Phase 5. API 全量重做

### 目标

- 把当前按 OpenClaw 业务切割的 API 重构为多 runtime API

### 原则

- 新 API 优先
- 老 API 先保留兼容层
- 页面逐步迁移

### 建议新 API

1. 运行时探测

- `GET /api/runtimes`
- 返回：
  - 检测到哪些 runtime
  - 路径
  - 版本
  - 健康状态

2. 首页总览

- `GET /api/dashboard`
- 返回：
  - runtime summary
  - entity cards
  - 跨引擎总统计

3. 会话列表

- `GET /api/sessions`
- 支持查询参数：
  - `runtime`
  - `entityId`
  - `workspace`
  - `status`

4. 单实体详情

- `GET /api/entities/[id]`

5. 模型总览

- `GET /api/models`

6. 能力总览

- `GET /api/capabilities`

7. 健康检查

- `GET /api/health/runtime/[runtimeId]`

8. 动作接口

- `POST /api/actions/resume`
- `POST /api/actions/fork`
- `POST /api/actions/probe`
- `POST /api/actions/open`

### 老 API 处理策略

以下 API 要标记为“兼容层，待废弃”：

- `/api/config`
- `/api/agent-activity`
- `/api/sessions/[agentId]`
- `/api/test-session`
- `/api/test-model`
- `/api/gateway-health`
- `/api/skills`

### Phase 5 验收标准

- 新页面只依赖新 API
- OpenClaw 特有 API 不再是站点主数据入口

---

## Phase 6. 页面重构

## 6.1 首页 `/`

### 当前问题

- 完全以 OpenClaw agent card 为中心
- 强依赖 gateway、platform、binding

### 重构目标

- 改成“多 runtime 概览页”

### 新结构建议

1. 顶部总览条

- 检测到的 runtime 数
- 活跃 session 总数
- 最近 24h 消息量
- 最近 24h token 用量

2. runtime 卡片

- OpenClaw
- Claude Code
- Codex

每张卡片展示：

- 是否安装/可用
- 版本
- 根目录
- entity 数
- 活跃 session 数
- 最近活跃时间

3. entity 卡片墙

卡片字段统一：

- 图标
- 名称
- runtime 类型
- 工作区路径
- 当前模型/提供方
- session 数
- 最近活跃
- 状态

4. 筛选器

- runtime
- 状态
- 工作区路径

## 6.2 Sessions `/sessions`

### 当前问题

- 路由语义是 `agent`
- 类型系统只认 OpenClaw session key

### 重构目标

- 支持跨 runtime 的多 session 浏览

### 新结构建议

1. 左侧筛选

- runtime
- workspace
- entity
- status

2. 列表项字段

- 标题
- runtime
- entity
- sessionId / threadId
- 项目路径 / cwd
- 最后活跃
- 消息数
- token
- 状态

3. 详情抽屉

- transcript 摘要
- 最近几条事件
- 可执行动作

## 6.3 Models `/models`

### 当前问题

- 完全按 OpenClaw provider/model 组织

### 重构目标

- 支持不同 runtime 的模型信息并列展示

### 方案

1. OpenClaw

- 保留 provider-model 视图

2. Claude

- 展示会话实际使用模型
- 如无法稳定拿到全量模型清单，则展示“最近使用过的模型集合”

3. Codex

- 展示 `config.toml` 默认模型
- 展示 threads 中实际 provider / model 信息

4. 页面要承认“不同 runtime 能力不对称”

- 不强求三者都能 probe
- 对不支持 probe 的 runtime 显示 `unsupported`

## 6.4 Stats `/stats`

### 当前问题

- 统计口径偏 OpenClaw transcript

### 重构目标

- 统计变为跨 runtime 聚合

### 建议维度

- 按 runtime
- 按 workspace
- 按 entity
- 按 session
- 时间窗口：日 / 周 / 月

## 6.5 Alerts `/alerts`

### 重构目标

- 不再只针对 OpenClaw gateway / bot

### 建议告警项

- runtime 不可读
- session 长时间无活动
- parser 失败率异常
- OpenClaw gateway down
- Claude projects 目录损坏
- Codex sqlite 不可访问

## 6.6 Skills `/skills`

### 当前问题

- 只对 OpenClaw 有意义

### 建议处理

不要删除页面，但要改名或加 runtime 标记。

可选方案 A：

- 改名为 `Capabilities`
- OpenClaw 展示 skills
- Claude 展示 agents / plugins / MCP 相关能力
- Codex 展示 dynamic tools / MCP / profile 信息

可选方案 B：

- 页面仍叫 `Skills`
- 明确标注 “当前仅 OpenClaw 完整支持”

建议优先 A，更统一。

## 6.7 Gateway 状态

### 当前问题

- OpenClaw 专属

### 建议

- 首页保留为 OpenClaw runtime 的一张健康卡
- 不再作为全站唯一主状态条

## 6.8 Pixel Office `/pixel-office`

### 决策建议

不要在首轮把像素办公室一起大改完，否则风险过高。

建议分两步：

1. 一期

- 页面保留
- 明确标记：
  - OpenClaw：完整支持
  - Claude：只显示 project/session 活动人物
  - Codex：只显示 workspace/thread 活动人物

2. 二期

- 重做人物类型映射
- 引入 runtime-specific avatar

---

## 8. 文件级改造清单

### 8.1 必改文件

- `package.json`
- `README.md`
- `quick_start.md`
- `app/layout.tsx`
- `app/sidebar.tsx`
- `app/page.tsx`
- `app/sessions/page.tsx`
- `app/models/page.tsx`
- `app/stats/page.tsx`
- `app/alerts/page.tsx`
- `app/skills/page.tsx`
- `app/pixel-office/page.tsx`

### 8.2 需要拆分/迁移的库文件

- `lib/openclaw-paths.ts`
- `lib/openclaw-cli.ts`
- `lib/openclaw-skills.ts`
- `lib/model-probe.ts`
- `lib/session-test-fallback.ts`
- `lib/gateway-url.ts`

### 8.3 需要重写的 API

- `app/api/config/route.ts`
- `app/api/agent-activity/route.ts`
- `app/api/gateway-health/route.ts`
- `app/api/test-model/route.ts`
- `app/api/test-session/route.ts`
- `app/api/skills/route.ts`
- `app/api/skills/content/route.ts`
- `app/api/sessions/[agentId]/route.ts`
- `app/api/stats-all/route.ts`
- `app/api/stats-models/route.ts`
- `app/api/stats/[agentId]/route.ts`
- `app/api/activity-heatmap/route.ts`

### 8.4 建议新增文件

- `NOTICE.md`
- `PROVENANCE.md`
- `COPYRIGHT.md`
- `lib/core/types.ts`
- `lib/runtimes/types.ts`
- `lib/runtimes/registry.ts`
- `lib/runtimes/openclaw/*`
- `lib/runtimes/claude/*`
- `lib/runtimes/codex/*`
- `app/api/runtimes/route.ts`
- `app/api/dashboard/route.ts`
- `app/api/sessions/route.ts`
- `app/api/models/route.ts`
- `app/api/capabilities/route.ts`
- `app/api/actions/*`

---

## 9. 关键技术细节设计

## 9.1 路径配置策略

### 环境变量建议

- `CCROOM_OPENCLAW_HOME`
- `CCROOM_CLAUDE_HOME`
- `CCROOM_CODEX_HOME`
- `CCROOM_ENABLE_OPENCLAW`
- `CCROOM_ENABLE_CLAUDE`
- `CCROOM_ENABLE_CODEX`

兼容旧变量：

- `OPENCLAW_HOME`

### 自动探测顺序

1. 用户显式环境变量
2. 默认家目录路径
3. 运行时存在性检测

## 9.2 缓存策略

当前项目已有内存缓存思路，但未来多 runtime 后不能所有数据都同 TTL。

建议：

- runtime 探测缓存：30 秒
- Claude sessions-index 缓存：10 秒
- Codex threads 列表缓存：5 秒
- transcript 解析缓存：按文件 mtime 或 sqlite updated_at

## 9.3 大文件解析策略

Claude 和 OpenClaw transcript 都可能很大。

建议：

- 不要每次全量读取全部 jsonl
- 优先读索引
- 再按最近修改时间截取
- 大 transcript 只读取尾部窗口
- 提供“详情页再深读”的懒加载机制

## 9.4 Codex SQLite 稳定性策略

Codex 会写 sqlite WAL。

建议：

- 使用只读方式访问
- 允许 WAL 模式
- 查询失败时返回降级状态，不让全站崩

## 9.5 状态统一映射

建议建立一张状态映射表：

- OpenClaw `working` -> `active`
- OpenClaw `waiting` -> `active`
- OpenClaw `idle` -> `idle`
- OpenClaw `offline` -> `offline`
- Claude 最近更新 -> `active`
- Claude 长时间不更新 -> `idle`
- Codex archived -> `archived`
- Codex 最近有 thread/log -> `active`

## 9.6 动作层安全策略

一期允许只读。

二期动作必须遵守：

- 默认关闭危险动作
- 所有 CLI 动作都要显式开关
- 所有动作都记录日志
- 有超时
- 有 stderr 回传
- 不能把任意用户输入直接拼 shell

---

## 10. 文档与归属改造方案

## 10.1 README 必须新增的内容

1. 项目新定位

- CCroom 是多 runtime 本地 AI 会话控制台

2. 支持矩阵

- OpenClaw
- Claude Code
- Codex

3. 上游来源说明

- 明确写出源头仓库地址

4. 当前版权/授权说明

- 未获额外授权前的使用边界

5. 非商用声明写法

稳妥写法建议：

- “当前仓库维护方仅计划将本项目用于学习、研究与个人使用，不面向商业用途发布”
- “如需对外再分发，请保留上游来源说明、作者信息与本项目改造说明”

不要写成：

- “本项目法律上禁止商用”

除非拿到合法许可证支撑。

## 10.2 NOTICE.md 建议内容

- 上游项目名
- 上游仓库地址
- 原作者署名
- 本项目改造方向
- 当前版本的维护者声明

## 10.3 PROVENANCE.md 建议内容

- 当前项目从何而来
- 哪些文件最初来自上游思路或结构
- 哪些部分是新架构
- 哪些部分计划保留兼容

---

## 11. 测试计划

## 11.1 单元测试

至少覆盖：

- OpenClaw session key 解析
- Claude sessions-index 解析
- Claude jsonl transcript 解析
- Codex threads 查询结果映射
- Codex logs 关联 thread
- 状态映射函数
- token 聚合函数
- runtime 探测逻辑

## 11.2 集成测试

1. OpenClaw 有数据，Claude/Codex 缺失

- 页面正常
- 缺失 runtime 显示 disabled/offline

2. Claude 有多 project 多 session

- 列表正确
- 统计正确

3. Codex 有多个 thread，部分 archived

- 状态显示正确

4. 三者同时存在

- 首页聚合正确
- 过滤器正常

## 11.3 回归测试

重点回归：

- OpenClaw 当前已有所有页面能力
- 模型页不会因 Claude/Codex 缺 provider 结构而崩
- Sessions 页不会因 runtime 混合而排序错乱
- 手机端布局不炸
- 中英文 i18n 不缺 key

## 11.4 人工验收清单

1. 仓库打开后第一眼不再像 OpenClaw 专属项目
2. 首页能看到 OpenClaw / Claude / Codex 三种 runtime
3. Claude 多 session 可浏览
4. Codex threads 可浏览
5. 上游来源说明清晰可见
6. 文档没有许可证误导

---

## 12. 迁移顺序建议

推荐严格按下面顺序推进，不要并行乱改。

1. 品牌和文档改造

- 先把 CCroom 名称、README、NOTICE、PROVENANCE 定下来

2. 类型系统和 adapter 接口

- 先抽象，再迁移

3. OpenClaw adapter 落地

- 先把现有能力封箱

4. Claude adapter 落地

- 先接入最稳定的数据源：`sessions-index.json`

5. Codex adapter 落地

- 先做只读 thread 列表，再加 logs 细节

6. 新 API

- 先写新接口，再迁页面

7. 页面迁移

- 首页
- Sessions
- Models
- Stats
- Alerts
- Skills
- Pixel Office

8. 动作层

- Claude resume / continue
- Codex resume / fork / exec

9. 最后清理兼容层

- 删除或冻结旧 OpenClaw-only API

---

## 13. 风险清单

### 风险 1. 法律边界不清

说明：

- 上游未见许可证

应对：

- 先保守处理
- 优先内部使用
- 公开前先补授权确认

### 风险 2. Claude transcript 格式未来变化

说明：

- `jsonl` 字段可能变

应对：

- parser 容错
- 先信任 `sessions-index.json`

### 风险 3. Codex SQLite schema 变化

说明：

- 版本升级后 `state_5.sqlite` 可能变为别的文件名或字段

应对：

- 支持通配探测
- SQL 访问层隔离
- schema 异常时优雅降级

### 风险 4. 页面抽象过慢导致“半新半旧”

说明：

- 新类型与旧 agent 页面混用会非常乱

应对：

- 先改 API 和 view-model
- 页面一次切整页，不做过多局部缝补

### 风险 5. Pixel Office 成为重构黑洞

说明：

- 这是可视化页面，状态来源复杂

应对：

- 先做核心页面
- 像素办公室放到后面

---

## 14. 最终交付标准

`CCroom` 完成后，至少应满足：

1. 品牌层面

- 项目名、标题、文档都已是 `CCroom`

2. 来源层面

- README 和 NOTICE 清楚注明上游来自 `xmanrui/OpenClaw-bot-review`

3. 架构层面

- OpenClaw、Claude、Codex 全部通过 adapter 接入

4. 功能层面

- 支持浏览本机 Claude 多 session
- 支持浏览本机 Codex threads
- 保留 OpenClaw 能力

5. 文档层面

- 清楚说明当前版权边界
- 明确“学习/研究/个人使用优先”的发布政策

6. 稳定性层面

- 单个 runtime 出问题不会拖垮全站

---

## 15. 最建议的实际执行拆分

如果让工程师按任务单推进，建议拆成下面 10 个工单。

### 工单 1. 品牌与文档基线

- 改名为 `CCroom`
- 写 `NOTICE.md`
- 写 `PROVENANCE.md`
- 重写 README 头部

### 工单 2. 类型系统与 runtime registry

- 新建统一类型
- 新建 adapter 接口

### 工单 3. OpenClaw adapter 抽离

- 不改功能，只搬家和封装

### 工单 4. Claude adapter

- 支持 project + sessions-index + transcript

### 工单 5. Codex adapter

- 支持 threads + logs + cwd 聚合

### 工单 6. 新 API

- `/api/runtimes`
- `/api/dashboard`
- `/api/sessions`
- `/api/models`

### 工单 7. 首页与 sessions 页重构

- 这是最重要的用户可见变化

### 工单 8. models / stats / alerts / capabilities 重构

- 完成多 runtime 视图

### 工单 9. 动作层

- Claude resume / continue
- Codex resume / fork / exec

### 工单 10. Pixel Office 和清理旧接口

- 作为最后收尾

---

## 16. 一句话结论

这个项目不能靠“全局搜索替换 openclaw”完成，而必须做一次真正的产品和架构升维：从 `OpenClaw Bot Dashboard` 重构为 `CCroom`，以“多 runtime、本地多 session、跨引擎统一视图”为核心，并在 README / NOTICE / PROVENANCE 中明确写清上游来源与当前版权边界，尤其要注意：在上游未提供许可证的前提下，不能擅自把“不可商用、转载需署名”写成已经具备法律效力的授权条款，只能先作为维护策略和发布声明表达，公开分发前最好补授权确认。
