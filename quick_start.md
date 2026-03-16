# Quick Start

## 中文

### 1. 通过 Git 安装

```bash
git clone https://github.com/N1nEmAn/CCroom.git
cd CCroom
npm install
npm run dev
```

### 2. 当前运行前提

当前代码实现仍然主要面向 OpenClaw，所以你需要：

- 已安装 OpenClaw
- 默认配置位于 `~/.openclaw/openclaw.json`

如果 OpenClaw 不在默认目录，可以这样启动：

```bash
OPENCLAW_HOME=/opt/openclaw npm run dev
```

### 3. 说明

- 仓库名已改为 `CCroom`
- 上游来自 `xmanrui/OpenClaw-bot-review`
- Claude Code 多 session / Codex 支持目前还在规划阶段，详见 `PLAN.md`

---

## English

### 1. Install via Git

```bash
git clone https://github.com/N1nEmAn/CCroom.git
cd CCroom
npm install
npm run dev
```

### 2. Current Runtime Requirement

The current implementation is still primarily OpenClaw-based, so you need:

- OpenClaw installed
- Config available at `~/.openclaw/openclaw.json`

If OpenClaw is stored elsewhere:

```bash
OPENCLAW_HOME=/opt/openclaw npm run dev
```

### 3. Notes

- The repository name is now `CCroom`
- Upstream source is `xmanrui/OpenClaw-bot-review`
- Claude Code multi-session and Codex support are planned, not implemented yet; see `PLAN.md`
