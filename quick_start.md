# Quick Start

## 中文

### 1. 通过 Git 安装

```bash
git clone https://github.com/N1nEmAn/CCroom.git
cd CCroom
npm install
npm run dev
```

### 2. 环境变量

支持以下环境变量（可组合使用）：

| 变量名 | 说明 |
|---|---|
| `CCROOM_OPENCLAW_HOME` | 指定 OpenClaw 根目录（优先级高于 `OPENCLAW_HOME`） |
| `OPENCLAW_HOME` | 兼容旧变量，指定 OpenClaw 根目录 |
| `CCROOM_CLAUDE_HOME` | 指定 Claude Code 数据目录（默认 `~/.claude`） |
| `CCROOM_CODEX_HOME` | 指定 Codex 数据目录（默认 `~/.codex`） |
| `CCROOM_RUNTIME_ROOTS` | 逗号分隔，批量指定多个 runtime 根目录 |

示例：

```bash
# 指定 OpenClaw 目录
CCROOM_OPENCLAW_HOME=/opt/openclaw npm run dev

# 同时指定多个 runtime
CCROOM_OPENCLAW_HOME=/opt/openclaw CCROOM_CLAUDE_HOME=/home/user/.claude npm run dev
```

### 3. 当前运行前提

- OpenClaw 支持：需已安装 OpenClaw，默认配置位于 `~/.openclaw/openclaw.json`
- Claude Code 支持：需已安装 Claude CLI，数据目录默认位于 `~/.claude`
- Codex 支持：需已安装 Codex，数据目录默认位于 `~/.codex`

### 4. 说明

- 仓库名：`CCroom`
- 上游来自：`xmanrui/OpenClaw-bot-review`
- 版权与来源说明见 `NOTICE.md`、`PROVENANCE.md`、`COPYRIGHT.md`
- 多 runtime 支持详见 `PLAN.md`

---

## English

### 1. Install via Git

```bash
git clone https://github.com/N1nEmAn/CCroom.git
cd CCroom
npm install
npm run dev
```

### 2. Environment Variables

The following environment variables are supported (combinable):

| Variable | Description |
|---|---|
| `CCROOM_OPENCLAW_HOME` | OpenClaw root directory (takes priority over `OPENCLAW_HOME`) |
| `OPENCLAW_HOME` | Legacy alias for OpenClaw root directory |
| `CCROOM_CLAUDE_HOME` | Claude Code data directory (default: `~/.claude`) |
| `CCROOM_CODEX_HOME` | Codex data directory (default: `~/.codex`) |
| `CCROOM_RUNTIME_ROOTS` | Comma-separated list of runtime root directories |

Example:

```bash
# Specify OpenClaw directory
CCROOM_OPENCLAW_HOME=/opt/openclaw npm run dev

# Specify multiple runtimes
CCROOM_OPENCLAW_HOME=/opt/openclaw CCROOM_CLAUDE_HOME=/home/user/.claude npm run dev
```

### 3. Runtime Requirements

- OpenClaw: requires OpenClaw installed; default config at `~/.openclaw/openclaw.json`
- Claude Code: requires Claude CLI installed; default data dir at `~/.claude`
- Codex: requires Codex installed; default data dir at `~/.codex`

### 4. Notes

- Repository name: `CCroom`
- Upstream source: `xmanrui/OpenClaw-bot-review`
- See `NOTICE.md`, `PROVENANCE.md`, `COPYRIGHT.md` for copyright and attribution details
- Multi-runtime support details: see `PLAN.md`
