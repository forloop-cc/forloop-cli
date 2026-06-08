# @forloop-cc/forloop-cli

Command-line interface for the [ForLoop](https://forloop.cc) AI development platform. Manage sprints, stories, files, AI agents, and organizations without leaving your terminal.

## Table of Contents

- [What is ForLoop?](#what-is-forloop)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Authentication](#authentication)
- [Environments](#environments)
- [Commands](#commands)
  - [Sprint Operations](#sprint-operations)
  - [Story Operations](#story-operations)
  - [Template Operations](#template-operations)
  - [Agent Operations](#agent-operations)
  - [Organization Operations](#organization-operations)
  - [User & Quota Operations](#user--quota-operations)
  - [File Operations](#file-operations)
  - [Folder Operations](#folder-operations)
  - [Sync Operations](#sync-operations)
- [Global Flags](#global-flags)
- [Environment Variables](#environment-variables)
- [Common Workflows](#common-workflows)
  - [Start Working on a Sprint](#start-working-on-a-sprint)
  - [Plan and Dispatch a Sprint](#plan-and-dispatch-a-sprint)
  - [Sync Files Between Local and S3](#sync-files-between-local-and-s3)
  - [CI/CD Automation](#cicd-automation)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## What is ForLoop?

[ForLoop](https://forloop.cc) is an AI agent platform for autonomous development and deployment. Think of it as your team's command center — a shared space where AI agents and humans collaborate on sprints, stories, and shipping code.

**With this CLI you can:**
- Plan sprints and create stories from your terminal
- Check what AI developer agents are building in real time
- Trigger AI agents to implement sprint stories automatically
- Upload and download project files to/from sprint storage
- Manage organizations, user profiles, and quotas
- Integrate ForLoop into shell scripts and CI/CD pipelines

---

## Installation

### Prerequisites

- **Node.js** 18 or later
- **npm** (comes with Node.js)

### Install Globally

```bash
npm install -g @forloop-cc/forloop-cli
```

### Verify Installation

```bash
forloop --version
# Output: forloop 0.2.1
```

---

## Quick Start

In about 30 seconds, you'll be connected:

```bash
# 1. Create an API token at https://forloop.cc/profile?tab=api-tokens
#    (copy the token — it starts with "floop_")

# 2. Authenticate
forloop auth login --api-key floop_xxxxx

# 3. See your sprints
forloop sprint list

# 4. Dive into a sprint
forloop sprint get --id 66

# 5. Check what your AI agents are doing
forloop agent developer-status --sprint 66
```

That's it. You're connected.

---

## Authentication

### Getting an API Token

Visit the ForLoop settings page to generate a token:

| Production | https://forloop.cc/profile?tab=api-tokens |

Tokens start with `floop_`. Create a token with at least these scopes:
- `sprint:read`, `sprint:write`
- `story:read`, `story:write`
- `agent:query`, `agent:read`
- `profile:read`

### Setting Your Token

**Method 1: Login command (recommended)**
```bash
forloop auth login --api-key floop_xxxxx
```
Your token is saved to `~/.config/forloop/tokens.json` with restricted file permissions (0600).

**Method 2: Environment variable**
```bash
export FORLOOP_API_KEY=floop_xxxxx
```

### Managing Authentication

```bash
forloop auth status          # Check: "Token: floop_ab...xxxx, Format: valid"
forloop auth logout          # Remove saved token
```

---

---

## Commands

### Sprint Operations

Work with sprints — the containers that hold your stories and track development cycles.

```bash
# List all sprints you have access to
forloop sprint list
forloop sprint list --org-id 1

# Get sprint details, including all stories
forloop sprint get --id 66
forloop sprint get --id 66 --no-stories     # Exclude stories
forloop sprint get --id 66 --no-files       # Exclude files

# Create a new sprint
forloop sprint create \
  --title "Sprint 15" \
  --start-date 2026-06-09 \
  --end-date 2026-06-23 \
  --description "Auth system implementation" \
  --org-id 1

# Update sprint details
forloop sprint update --id 66 --title "Updated Title"
forloop sprint update --id 66 --description "New goals for this sprint"

# Delete a sprint (destructive — requires --confirm)
forloop sprint delete --id 66 --confirm
```

> **Tip:** The CLI auto-detects your sprint from `FORLOOP_SPRINT_ID` env var or a git branch named `sprint-66`. You can often omit `--id` and the right sprint will be chosen.

### Story Operations

Stories are the work items inside sprints. Create them from templates for consistent structure.

```bash
# Create a task story (code, features, bug fixes)
forloop story create \
  --title "Implement user authentication" \
  --sprint 66 \
  --type basic-task \
  --priority high \
  --points 5 \
  --assignee-agent forLoopDeveloper

# Create a note story (docs, research, planning)
forloop story create \
  --title "Architecture decisions" \
  --sprint 66 \
  --type basic-note

# Create a doc folder for organizing files (no --type needed)
forloop story create \
  --title "Project Documents" \
  --sprint 66

# Read story details, including developer comments
forloop story get --id 229
forloop story get --id 229 --no-comments

# Update a story
forloop story update --id 229 --status in_progress
forloop story update --id 229 --priority critical --points 8

# Delete a story (requires --confirm)
forloop story delete --id 229 --confirm
```

> **Story types explained:** `basic-task` is for implementation work — AI agents pick these up. `basic-note` is for documentation and notes. Doc folders are containers for uploaded files.

### Template Operations

Templates define the structure of your stories. List available templates to see what story types are available.

```bash
forloop template list
# Output shows: Basic Task, Basic Note, Schedule Meeting, New Folder
```

### Agent Operations

Interact with ForLoop's AI agents — check their progress, trigger new work, and review past conversations.

```bash
# See what AI agents have discussed in the past
forloop agent history --sprint 66 --limit 20

# Check if a developer task is running, completed, or failed
forloop agent developer-status --sprint 66
# Output: "Developer Task: SUCCEEDED — Progress: 21/22 done"

# Trigger the developer agent to start implementing stories
forloop agent developer-sprint --sprint 66
forloop agent developer-sprint --sprint 66 \
  --message "Start with the high-priority auth module stories"
```

> **What happens when you trigger a developer sprint?** The ForLoop server launches an AI agent that picks up your `todo` stories, writes code, creates commits, and opens pull requests — all automatically. You get notified by email when it's done.

### Organization Operations

Organizations group sprints and control access for teams.

```bash
# List organizations you belong to
forloop org list
forloop org list --owned-only    # Only orgs you own

# View organization details
forloop org get --id 1

# Create an organization (requires Team or Enterprise tier)
forloop org create \
  --name "Engineering Team" \
  --description "Core engineering organization"

# Update organization details
forloop org update --id 1 --name "New Name"
```

### User & Quota Operations

Check your profile, limits, and usage.

```bash
# View your profile
forloop user profile
# Output: User: TOSHI WORKSHOP JP, Email: ..., Tier: free

# Check your quota limits and current usage
forloop user quotas
# Output: Stories used: 23/100, Storage used: 17KB/3GB, etc.

# Check quota usage for a specific organization
forloop org quotas --org-id 1
```

### File Operations

Upload files to sprint storage, list them, and generate download links. Files are stored on S3.

```bash
# Upload a file to a sprint
forloop file upload --path ./report.pdf --sprint 66
forloop file upload --path ./mockup.png --sprint 66 --folder designs

# List all files in a sprint
forloop file list --sprint 66

# Generate a download link
forloop file download --id 84

# Delete a file permanently (requires --confirm)
forloop file delete --id 84 --confirm
```

### Folder Operations

Create document folders to organize your sprint files.

```bash
# Create a folder with team-level access
forloop folder create \
  --title "Design Documents" \
  --sprint 66 \
  --description "UI mockups and wireframes" \
  --permissions team
```

### Sync Operations

Synchronize files between your local machine (`~/.forloop/sprint-{id}/`) and the sprint's S3 storage. Useful for persisting plan documents, task breakdowns, and knowledge files across opencode sessions.

```bash
# Step 1: Ensure the sync folder exists on the server
forloop sync aivy-folder --sprint 66

# Step 2: Get the folder's story ID (needed for uploads)
forloop sync aivy-doc-get --sprint 66

# Step 3: Download sprint files from S3 to your local machine
forloop sync s3-to-local --sprint 66
forloop sync s3-to-local --sprint 66 --no-tasks --overwrite

# Step 4: Upload a local file back to S3
forloop sync local-to-s3 \
  --path ~/.forloop/sprint-66/plan/my-plan.md \
  --sprint 66 \
  --folder project/plans
```

> **Local file structure:** `~/.forloop/sprint-{id}/knowledge/`, `~/.forloop/sprint-{id}/plan/`, `~/.forloop/sprint-{id}/task/`. The sync commands map these folders to S3 paths automatically.

---

## Global Flags

These flags work with every command:

| Flag | Description |
|------|-------------|
| `--api-key <key>` | Override the saved API token for this command |
| `--api-url <url>` | Override the API base URL |
| `--output <format>` | Output format: `text` (default) or `json` |
| `--timeout <seconds>` | Request timeout in seconds (default: 60) |
| `--quiet` | Suppress non-essential output — useful in scripts |
| `--verbose` | Print HTTP request/response details — useful for debugging |
| `--no-color` | Disable ANSI colors in output |
| `--non-interactive` | Disable interactive prompts — useful in CI |
| `--help` | Show help for any command |
| `--version` | Print the CLI version |

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `FORLOOP_API_KEY` | API token (alternative to `forloop auth login`) |
| `FORLOOP_API_URL` | Override the API base URL (e.g., `https://api.dev.forloop.cc`) |
| `FORLOOP_SPRINT_ID` | Default sprint ID for commands that auto-detect it |

---

## Common Workflows

### Start Working on a Sprint

A typical session start — load context, check progress, and understand what's happening.

```bash
# 1. Make sure you're authenticated
forloop auth status

# 2. Find your sprint
forloop sprint list

# 3. Load the full picture — stories, status, AI agents
forloop sprint get --id 66

# 4. Is the developer agent already running?
forloop agent developer-status --sprint 66

# 5. Review recent AI conversations for context
forloop agent history --sprint 66 --limit 10

# 6. Sync files from S3 so you have the latest plans
forloop sync s3-to-local --sprint 66
```

### Plan and Dispatch a Sprint

Create a sprint, add stories, and let AI agents implement them.

```bash
# 1. Create the sprint
forloop sprint create \
  --title "Feature X" \
  --start-date 2026-06-09 \
  --end-date 2026-06-23

# 2. Break the work into stories
forloop story create \
  --title "Set up project structure" \
  --sprint 67 --type basic-task --priority high --points 2
forloop story create \
  --title "Build API endpoints" \
  --sprint 67 --type basic-task --priority high --points 5 --assignee-agent forLoopDeveloper
forloop story create \
  --title "Create UI components" \
  --sprint 67 --type basic-task --priority medium --points 3 --assignee-agent forLoopDeveloper

# 3. Upload any planning documents
forloop sync aivy-folder --sprint 67
forloop sync local-to-s3 \
  --path ~/.forloop/sprint-67/plan/plan.md \
  --sprint 67 --folder project/plans

# 4. Dispatch the developer agent
forloop agent developer-sprint --sprint 67

# 5. Monitor progress
forloop agent developer-status --sprint 67
forloop sprint get --id 67
```

### Sync Files Between Local and S3

Keep your local planning files in sync with the sprint's S3 storage.

```bash
# Download everything from S3
forloop sync s3-to-local --sprint 66

# Files are now at ~/.forloop/sprint-66/knowledge/
#                         ~/.forloop/sprint-66/plan/
#                         ~/.forloop/sprint-66/task/

# Edit a plan file locally
vim ~/.forloop/sprint-66/plan/my-plan.md

# Upload it back to S3
forloop sync local-to-s3 \
  --path ~/.forloop/sprint-66/plan/my-plan.md \
  --sprint 66 --folder project/plans

# Verify it's on the server
forloop file list --sprint 66
```

### CI/CD Automation

Use the CLI in shell scripts to automate sprint management.

```bash
#!/bin/bash
set -e

# Authenticate via environment variable
export FORLOOP_API_KEY="$FORLOOP_TOKEN"

# Check if a developer task is already running
STATUS=$(forloop agent developer-status --sprint "$SPRINT_ID")
echo "$STATUS"

# Trigger a new developer sprint if none is active
if echo "$STATUS" | grep -q "No active"; then
  forloop agent developer-sprint \
    --sprint "$SPRINT_ID" \
    --message "CI-triggered implementation"
fi

# Wait for completion (poll every 60 seconds)
while forloop agent developer-status --sprint "$SPRINT_ID" | grep -q "RUNNING"; do
  echo "Still running..."
  sleep 60
done

echo "Sprint $SPRINT_ID completed."
```

---

## Configuration

The CLI resolves configuration from these sources, in priority order:

```
1. Environment variables  (highest priority)
2. Project config         (./opencode.json under "forloop" key)
3. Global config          (~/.config/opencode/config.json)
4. Defaults               (production API)
```

### Project Config (`./opencode.json`)

```json
{
  "forloop": {
    "apiUrl": "https://api.forloop.cc"
  }
}
```

### Global Config (`~/.config/opencode/config.json`)

```json
{
  "forloop": {
    "apiUrl": "https://api.forloop.cc"
  }
}
```

### Token Storage

API tokens are stored at `~/.config/forloop/tokens.json` with restricted permissions (`chmod 600`). The file is ForLoop-specific and not shared with other tools.

---

## Troubleshooting

### "No ForLoop API key configured"

You need to authenticate:

```bash
forloop auth login --api-key floop_xxxxx
# or
export FORLOOP_API_KEY=floop_xxxxx
```

### "Invalid token format"

Tokens must start with `floop_`. Double-check you copied the entire token from https://forloop.cc/profile?tab=api-tokens.

### "Forbidden" or "Not Found" on Specific Resources

Some resources (organizations, stories, files) return 403/404 when you don't have access or they don't exist in your current environment. Try:
- Verifying the resource ID exists with `forloop sprint get --id <id>`
- Checking your token has the required scopes

### Verbose Debugging

When something isn't working, use `--verbose` to see the raw HTTP requests:

```bash
forloop sprint get --id 66 --verbose
# Output:
# > GET https://api.forloop.cc/api/opencode/sprints/66
# < 200 OK
```

---

## License

MIT
