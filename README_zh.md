# @forloop-cc/forloop-cli

[English](../README.md) · [中文](README_zh.md) · [日本語](README_ja.md)

[ForLoop](https://forloop.cc) AI 开发平台的命令行界面。无需离开终端即可管理 Sprint、用户故事、文件、AI 代理和组织。

## 目录

- [什么是 ForLoop？](#什么是-forloop)
- [安装](#安装)
- [快速开始](#快速开始)
- [身份验证](#身份验证)
- [命令](#命令)
  - [Sprint 操作](#sprint-操作)
  - [用户故事操作](#用户故事操作)
  - [模板操作](#模板操作)
  - [代理操作](#代理操作)
  - [组织操作](#组织操作)
  - [用户与配额操作](#用户与配额操作)
  - [文件操作](#文件操作)
  - [文件夹操作](#文件夹操作)
  - [同步操作](#同步操作)
- [全局参数](#全局参数)
- [环境变量](#环境变量)
- [常见工作流程](#常见工作流程)
  - [开始一个 Sprint](#开始一个-sprint)
  - [规划并分配 Sprint](#规划并分配-sprint)
  - [本地与 S3 之间同步文件](#本地与-s3-之间同步文件)
  - [CI/CD 自动化](#cicd-自动化)
- [配置](#配置)
- [故障排除](#故障排除)
- [许可证](#许可证)

---

## 什么是 ForLoop？

[ForLoop](https://forloop.cc) 是一个用于自主开发和部署的 AI 代理平台。将其视为团队的指挥中心——一个 AI 代理和人类在 Sprint、用户故事和代码交付上协作的共享空间。

**使用此 CLI，您可以：**
- 从终端规划 Sprint 并创建用户故事
- 实时查看 AI 开发代理正在构建的内容
- 触发 AI 代理自动实现 Sprint 用户故事
- 上传和下载项目文件到/从 Sprint 存储
- 管理组织、用户资料和配额
- 将 ForLoop 集成到 shell 脚本和 CI/CD 流水线中

---

## 安装

### 前提条件

- **Node.js** 18 或更高版本
- **npm**（随 Node.js 一起提供）

### 全局安装

```bash
npm install -g @forloop-cc/forloop-cli
```

### 验证安装

```bash
forloop --version
# 输出: forloop 0.2.4
```

---

## 快速开始

大约 30 秒，您就能连接上：

```bash
# 1. 在 https://forloop.cc/profile?tab=api-tokens 创建 API 令牌
#    （复制令牌——以 "floop_" 开头）

# 2. 身份验证
forloop auth login --api-key floop_xxxxx

# 3. 查看您的 Sprint
forloop sprint list

# 4. 深入查看一个 Sprint
forloop sprint get --id 66

# 5. 检查 AI 代理正在做什么
forloop agent developer-status --sprint 66
```

就这样，您已连接。

---

## 身份验证

### 获取 API 令牌

访问 ForLoop 设置页面生成令牌：

| 生产环境 | https://forloop.cc/profile?tab=api-tokens |

令牌以 `floop_` 开头。创建令牌时至少需要以下权限范围：
- `sprint:read`, `sprint:write`
- `story:read`, `story:write`
- `agent:query`, `agent:read`
- `profile:read`

### 设置令牌

**方法 1：登录命令（推荐）**
```bash
forloop auth login --api-key floop_xxxxx
```
令牌保存到 `~/.config/forloop/tokens.json`，文件权限受限（0600）。

**方法 2：环境变量**
```bash
export FORLOOP_API_KEY=floop_xxxxx
```

### 管理身份验证

```bash
forloop auth status          # 检查："Token: floop_ab...xxxx, Format: valid"
forloop auth logout          # 移除已保存的令牌
```

---

### Sprint 操作

处理 Sprint——容纳用户故事并跟踪开发周期的容器。

```bash
# 列出所有有访问权限的 Sprint
forloop sprint list
forloop sprint list --org-id 1
forloop sprint list --include-system-org    # 包含系统组织 Sprint
forloop sprint list --output json           # 结构化 JSON 输出

# 获取 Sprint 详情，包含所有用户故事
forloop sprint get --id 66
forloop sprint get --id 66 --no-stories     # 排除用户故事
forloop sprint get --id 66 --no-files       # 排除文件
forloop sprint get --id 66 --output json    # 结构化 JSON 输出

# 创建一个新的 Sprint
forloop sprint create \
  --title "Sprint 15" \
  --start-date 2026-06-09 \
  --end-date 2026-06-23 \
  --description "认证系统实现" \
  --org-id 1

# 更新 Sprint 详情
forloop sprint update --id 66 --title "更新后的标题"
forloop sprint update --id 66 --description "此 Sprint 的新目标"

# 删除 Sprint（破坏性操作——需要 --confirm）
forloop sprint delete --id 66 --confirm
```

> **提示：** CLI 会自动从 `FORLOOP_SPRINT_ID` 环境变量或名为 `sprint-66` 的 git 分支中检测 Sprint。您通常可以省略 `--id`，会自动选择正确的 Sprint。

### 用户故事操作

用户故事是 Sprint 内的工作项。从模板创建以保持结构一致性。

```bash
# 创建任务用户故事（代码、功能、bug 修复）
forloop story create \
  --title "实现用户认证" \
  --sprint 66 \
  --type basic-task \
  --priority high \
  --points 5 \
  --assignee-agent forLoopDeveloper

# 创建笔记用户故事（文档、研究、规划）
forloop story create \
  --title "架构决策" \
  --sprint 66 \
  --type basic-note

# 创建文档文件夹以组织文件（无需 --type）
forloop story create \
  --title "项目文档" \
  --sprint 66

# 阅读用户故事详情，包含开发者评论
forloop story get --id 229
forloop story get --id 229 --no-comments
forloop story get --id 229 --output json     # 结构化 JSON 输出

# 更新用户故事
forloop story update --id 229 --status in_progress
forloop story update --id 229 --priority critical --points 8

# 删除用户故事（需要 --confirm）
forloop story delete --id 229 --confirm
```

> **用户故事类型说明：** `basic-task` 用于实现工作——AI 代理会接取这些任务。`basic-note` 用于文档和笔记。文档文件夹是上传文件的容器。

### 模板操作

模板定义了用户故事的结构。列出可用模板以查看可用的用户故事类型。

```bash
forloop template list
# 内置模板：Basic Task (basic-task), Basic Note (basic-note)
# 服务器模板：Schedule Meeting (schedule-meeting), New Folder (doc-folder)

# JSON 输出：
forloop template list --output json
```

### 代理操作

与 ForLoop 的 AI 代理交互——检查进度、触发新工作、查看历史对话。

```bash
# 查看 AI 代理过去的讨论内容
forloop agent history --sprint 66 --limit 20
forloop agent history --sprint 66 --output json

# 检查开发者任务是否正在运行、已完成或失败
forloop agent developer-status --sprint 66
# 输出："Developer Task: SUCCEEDED — Progress: 21/22 done"

# 触发开发者代理开始实现用户故事
forloop agent developer-sprint --sprint 66
forloop agent developer-sprint --sprint 66 \
  --message "从高优先级的认证模块用户故事开始"
```

> **触发开发者 Sprint 后会发生什么？** ForLoop 服务器会启动一个 AI 代理，自动接取您的 `todo` 用户故事，编写代码，创建提交并开启 Pull Request。完成后会通过邮件通知您。

### 组织操作

组织用于分组 Sprint 并控制团队访问权限。

```bash
# 列出您所属的组织
forloop org list
forloop org list --owned-only    # 仅列出您拥有的组织
forloop org list --output json    # 结构化 JSON 输出

# 查看组织详情
forloop org get --id 1
forloop org get --id 1 --output json

# 创建组织（需要 Team 或 Enterprise 计划）
forloop org create \
  --name "工程团队" \
  --description "核心工程组织"

# 更新组织详情
forloop org update --id 1 --name "新名称"
```

### 用户与配额操作

查看您的个人资料、限制和使用情况。

```bash
# 查看个人资料
forloop user profile
forloop user profile --output json

# 检查配额限制和当前使用情况
forloop user quotas
forloop user quotas --output json

# 检查特定组织的配额使用情况
forloop org quotas --org-id 1
forloop org quotas --org-id 1 --output json
```

### 文件操作

上传文件到 Sprint 存储、列出文件并生成下载链接。文件存储在 S3 上。

```bash
# 上传文件到 Sprint
forloop file upload --path ./report.pdf --sprint 66
forloop file upload --path ./mockup.png --sprint 66 --folder designs

# 列出 Sprint 中的所有文件
forloop file list --sprint 66
forloop file list --sprint 66 --output json

# 生成下载链接
forloop file download --id 84

# 永久删除文件（需要 --confirm）
forloop file delete --id 84 --confirm
```

### 文件夹操作

创建文档文件夹以组织 Sprint 文件。

```bash
# 创建具有团队级访问权限的文件夹
forloop folder create \
  --title "设计文档" \
  --sprint 66 \
  --description "UI 原型和线框图" \
  --permissions team
```

### 同步操作

在本地机器（`~/.forloop/sprint-{id}/`）和 Sprint 的 S3 存储之间同步文件。用于跨 opencode 会话持久化计划文档、任务分解和知识文件。

```bash
# 步骤 1：确保服务器上存在同步文件夹
forloop sync aivy-folder --sprint 66

# 步骤 2：获取文件夹的用户故事 ID（上传时需要）
forloop sync aivy-doc-get --sprint 66

# 步骤 3：从 S3 下载 Sprint 文件到本地机器
forloop sync s3-to-local --sprint 66
forloop sync s3-to-local --sprint 66 --no-tasks --overwrite

# 步骤 4：将本地文件上传回 S3
forloop sync local-to-s3 \
  --path ~/.forloop/sprint-66/plan/my-plan.md \
  --sprint 66 \
  --folder project/plans
```

> **本地文件结构：** `~/.forloop/sprint-{id}/knowledge/`、`~/.forloop/sprint-{id}/plan/`、`~/.forloop/sprint-{id}/task/`。同步命令会自动将这些文件夹映射到 S3 路径。

---

## 全局参数

以下参数适用于所有命令：

| 参数 | 描述 |
|------|------|
| `--api-key <key>` | 为此命令覆盖已保存的 API 令牌 |
| `--api-url <url>` | 覆盖 API 基础 URL |
| `--output <format>` | 输出格式：`text`（默认）或 `json` |
| `--timeout <seconds>` | 请求超时时间（秒，默认: 60） |
| `--quiet` | 抑制非必要输出——在脚本中有用 |
| `--verbose` | 打印 HTTP 请求/响应详情——调试时有用 |
| `--no-color` | 在输出中禁用 ANSI 颜色 |
| `--non-interactive` | 禁用交互式提示——在 CI 中有用 |
| `--help` | 显示任何命令的帮助 |
| `--version` | 打印 CLI 版本 |

---

## 环境变量

| 变量 | 用途 |
|------|------|
| `FORLOOP_API_KEY` | API 令牌（替代 `forloop auth login`） |
| `FORLOOP_API_URL` | 覆盖 API 基础 URL（例如 `https://api.dev.forloop.cc`） |
| `FORLOOP_SPRINT_ID` | 自动检测命令的默认 Sprint ID |

---

## 常见工作流程

### 开始一个 Sprint

一个典型的会话开始——加载上下文、检查进度并了解当前状况。

```bash
# 1. 确保已认证
forloop auth status

# 2. 找到您的 Sprint
forloop sprint list

# 3. 加载全貌——用户故事、状态、AI 代理
forloop sprint get --id 66

# 4. 开发者代理是否已经在运行？
forloop agent developer-status --sprint 66

# 5. 查看最近的 AI 对话以获取上下文
forloop agent history --sprint 66 --limit 10

# 6. 从 S3 同步文件以获得最新计划
forloop sync s3-to-local --sprint 66
```

### 规划并分配 Sprint

创建 Sprint、添加用户故事，让 AI 代理来实现它们。

```bash
# 1. 创建 Sprint
forloop sprint create \
  --title "功能 X" \
  --start-date 2026-06-09 \
  --end-date 2026-06-23

# 2. 将工作拆分为用户故事
forloop story create \
  --title "搭建项目结构" \
  --sprint 67 --type basic-task --priority high --points 2
forloop story create \
  --title "构建 API 端点" \
  --sprint 67 --type basic-task --priority high --points 5 --assignee-agent forLoopDeveloper
forloop story create \
  --title "创建 UI 组件" \
  --sprint 67 --type basic-task --priority medium --points 3 --assignee-agent forLoopDeveloper

# 3. 上传任何规划文档
forloop sync aivy-folder --sprint 67
forloop sync local-to-s3 \
  --path ~/.forloop/sprint-67/plan/plan.md \
  --sprint 67 --folder project/plans

# 4. 分配开发者代理
forloop agent developer-sprint --sprint 67

# 5. 监控进度
forloop agent developer-status --sprint 67
forloop sprint get --id 67
```

### 本地与 S3 之间同步文件

保持本地规划文件与 Sprint 的 S3 存储同步。

```bash
# 从 S3 下载所有内容
forloop sync s3-to-local --sprint 66

# 文件现在位于 ~/.forloop/sprint-66/knowledge/
#                   ~/.forloop/sprint-66/plan/
#                   ~/.forloop/sprint-66/task/

# 本地编辑计划文件
vim ~/.forloop/sprint-66/plan/my-plan.md

# 上传回 S3
forloop sync local-to-s3 \
  --path ~/.forloop/sprint-66/plan/my-plan.md \
  --sprint 66 --folder project/plans

# 验证它在服务器上
forloop file list --sprint 66
```

### CI/CD 自动化

在 shell 脚本中使用 CLI 以自动化 Sprint 管理。

```bash
#!/bin/bash
set -e

# 通过环境变量认证
export FORLOOP_API_KEY="$FORLOOP_TOKEN"

# 检查开发者任务是否已在运行
STATUS=$(forloop agent developer-status --sprint "$SPRINT_ID")
echo "$STATUS"

# 如果没有活跃任务，触发新的开发者 Sprint
if echo "$STATUS" | grep -q "No active"; then
  forloop agent developer-sprint \
    --sprint "$SPRINT_ID" \
    --message "CI 触发的实现"
fi

# 等待完成（每 60 秒轮询一次）
while forloop agent developer-status --sprint "$SPRINT_ID" | grep -q "RUNNING"; do
  echo "仍在运行..."
  sleep 60
done

echo "Sprint $SPRINT_ID 已完成。"
```

---

## 配置

CLI 按以下优先级从这些来源解析配置：

```
1. 环境变量（最高优先级）
2. 项目配置（./opencode.json 中的 "forloop" 键）
3. 全局配置（~/.config/opencode/config.json）
4. 默认值（生产 API）
```

### 项目配置（`./opencode.json`）

```json
{
  "forloop": {
    "apiUrl": "https://api.forloop.cc"
  }
}
```

### 全局配置（`~/.config/opencode/config.json`）

```json
{
  "forloop": {
    "apiUrl": "https://api.forloop.cc"
  }
}
```

### 令牌存储

API 令牌存储在 `~/.config/forloop/tokens.json`，文件权限受限（`chmod 600`）。该文件是 ForLoop 专用的，不与其他工具共享。

---

## 故障排除

### "No ForLoop API key configured"

您需要进行身份验证：

```bash
forloop auth login --api-key floop_xxxxx
# 或
export FORLOOP_API_KEY=floop_xxxxx
```

### "Invalid token format"

令牌必须以 `floop_` 开头。请仔细检查是否从 https://forloop.cc/profile?tab=api-tokens 复制了完整令牌。

### "Forbidden" 或 "Not Found" 访问特定资源

某些资源（组织、用户故事、文件）在您没有访问权限或它们不存在于当前环境时返回 403/404。尝试：
- 用 `forloop sprint get --id <id>` 验证资源 ID 是否存在
- 检查您的令牌是否具有所需的权限范围

### 详细调试

当某些内容不工作时，使用 `--verbose` 查看原始 HTTP 请求：

```bash
forloop sprint get --id 66 --verbose
# 输出：
# > GET https://api.forloop.cc/api/opencode/sprints/66
# < 200 OK
```

---

## 许可证

MIT
