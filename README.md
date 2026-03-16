# CCroom

## English

`CCroom` is a fork and continuation of [xmanrui/OpenClaw-bot-review](https://github.com/xmanrui/OpenClaw-bot-review).

Current status:

- The codebase has been renamed to `CCroom`
- The current implementation is still primarily an OpenClaw dashboard
- A detailed migration plan for Claude Code multi-session and Codex support is in [PLAN.md](PLAN.md)

### Upstream and Notice

- Upstream source: `xmanrui/OpenClaw-bot-review`
- This fork keeps the upstream attribution and continues from it as a separate project direction
- At this stage, the project is intended for learning, research, and personal use
- If you redistribute it, keep the upstream source, original author attribution, and your modification notes

Important:

- No `LICENSE` file was found in the upstream repository during local review
- Until explicit permission or a license is added upstream, treat this repository conservatively rather than as freely relicensable code

### What It Does Today

- Reads local OpenClaw configuration and session files
- Shows bots, models, sessions, stats, alerts, skills, and pixel office views
- Runs as a local Next.js dashboard without a database

### Planned Direction

- Keep OpenClaw support
- Add Claude Code multi-session support
- Add Codex thread/session support
- Unify local runtime monitoring under one dashboard

### Quick Start

```bash
git clone https://github.com/N1nEmAn/CCroom.git
cd CCroom
npm install
npm run dev
```

Open `http://localhost:3000`.

### Requirements

- Node.js 18+
- OpenClaw installed at `~/.openclaw/openclaw.json` for current functionality

### Config

```bash
OPENCLAW_HOME=/opt/openclaw npm run dev
```

### Docs

- Quick start: [quick_start.md](quick_start.md)
- Migration plan: [PLAN.md](PLAN.md)
- Attribution notice: [NOTICE.md](NOTICE.md)

---

## 中文

`CCroom` 是基于 [xmanrui/OpenClaw-bot-review](https://github.com/xmanrui/OpenClaw-bot-review) fork 出来的延续项目。

当前状态：

- 仓库内可见项目名已切换为 `CCroom`
- 现阶段代码实现仍然主要是 OpenClaw 仪表盘
- 后续支持 Claude Code 多 session 和 Codex 的详细规划见 [PLAN.md](PLAN.md)

### 上游来源与说明

- 上游来源：`xmanrui/OpenClaw-bot-review`
- 本项目保留上游来源说明，并以独立方向继续演化
- 当前阶段以学习、研究、个人使用为主，不建议直接用于商用发布
- 如果你再分发，请保留上游来源、原作者说明和你的改造说明

重要说明：

- 本地检查时，上游仓库未发现明确的 `LICENSE`
- 在上游未补充许可证或未取得额外授权前，不应把这个仓库当成可以随意重许可的代码

### 当前能做什么

- 读取本地 OpenClaw 配置与 session 文件
- 提供机器人、模型、会话、统计、告警、技能、像素办公室页面
- 基于 Next.js 本地运行，无数据库

### 计划中的方向

- 保留 OpenClaw 支持
- 增加 Claude Code 多 session 支持
- 增加 Codex thread / session 支持
- 统一成本机 AI 运行时总览控制台

### 快速开始

```bash
git clone https://github.com/N1nEmAn/CCroom.git
cd CCroom
npm install
npm run dev
```

浏览器打开 `http://localhost:3000`。

### 环境要求

- Node.js 18+
- 当前功能仍要求本机安装 OpenClaw，且配置位于 `~/.openclaw/openclaw.json`

### 配置

```bash
OPENCLAW_HOME=/opt/openclaw npm run dev
```

### 文档

- 快速启动：[quick_start.md](quick_start.md)
- 迁移规划：[PLAN.md](PLAN.md)
- 来源说明：[NOTICE.md](NOTICE.md)
