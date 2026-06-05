# ForLoop CLI Error Reference

This document lists all error scenarios and the messages users will see.

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Usage error (invalid arguments) |
| 3 | Authentication error |
| 4 | Quota error |
| 5 | Timeout |
| 6 | Network error |
| 7 | API error |
| 10 | Content filter |
| 130 | Interrupted (Ctrl+C / SIGINT) |

---

## Auth Commands

### `forloop auth login`

| Scenario | Error Message |
|---|---|
| `--api-key` not provided | `Error: --api-key is required and must start with "floop_"` |
| Token does not start with `floop_` | `Error: --api-key is required and must start with "floop_"` |
| Token validation failed | `Invalid token: <validation error>` |

### `forloop auth status`

| Scenario | Error Message |
|---|---|
| No token configured | `Not authenticated` + `Run: forloop auth login --api-key <token>` |
| Token configured but invalid format | `Token: floop_xx...xxxx` + `Format: invalid` + `Error: <reason>` |

### `forloop auth logout`

No error scenarios — silently clears the token.

---

## Sprint Commands

### `forloop sprint get`

| Scenario | Error Message |
|---|---|
| No sprint ID resolved | `Error: No sprint ID resolved. Use --id, set FORLOOP_SPRINT_ID, or use a sprint-XXX branch.` |
| Sprint not found (404) | `ForLoop API GET /api/opencode/sprints/<id> failed: 404 Not Found` |

### `forloop sprint list`

| Scenario | Error Message |
|---|---|
| No sprints found | `No sprints found.` |

### `forloop sprint create`

| Scenario | Error Message |
|---|---|
| Missing `--title`, `--start-date`, or `--end-date` | `Error: --title, --start-date, and --end-date are required` |

### `forloop sprint update`

| Scenario | Error Message |
|---|---|
| `--id` not provided | `Error: --id is required` |
| No fields to update | `Error: at least one field to update is required` |

### `forloop sprint delete`

| Scenario | Error Message |
|---|---|
| `--confirm` not provided | `Error: --confirm is required to permanently delete a sprint.` |
| Sprint not found | `ForLoop API DELETE /api/opencode/sprints/<id> failed: 404 Not Found` |

---

## Story Commands

### `forloop story create`

| Scenario | Error Message |
|---|---|
| Missing `--title` or `--sprint` | `Error: --title and --sprint are required` |
| Invalid `--type` value | `Error: --type must be "basic-task" or "basic-note"` |
| Template not found | `Error: Template "<slug>" not found` |

### `forloop story get`

| Scenario | Error Message |
|---|---|
| `--id` not provided | `Error: --id is required` |
| Story not found (403) | `ForLoop API GET /api/opencode/stories/<id> failed: 403 Forbidden` |

### `forloop story update`

| Scenario | Error Message |
|---|---|
| `--id` not provided | `Error: --id is required` |
| No fields to update | `Error: at least one field to update is required` |

### `forloop story delete`

| Scenario | Error Message |
|---|---|
| `--confirm` not provided | `Error: --confirm is required to permanently delete a story.` |

---

## Organization Commands

### `forloop org get`

| Scenario | Error Message |
|---|---|
| `--id` not provided | `Error: --id is required` |

### `forloop org create`

| Scenario | Error Message |
|---|---|
| `--name` not provided | `Error: --name is required` |
| Free tier (no orgs allowed) | API returns quota/tier error |

### `forloop org update`

| Scenario | Error Message |
|---|---|
| `--id` not provided | `Error: --id is required` |

---

## Agent Commands

### `forloop agent developer-sprint`

| Scenario | Error Message |
|---|---|
| `--sprint` not provided | `Error: --sprint is required` |
| Sprint not found | API error with 404 |

### `forloop agent history`

| Scenario | Error Message |
|---|---|
| No history found | `No conversation history found.` |

### `forloop agent developer-status`

| Scenario | Error Message |
|---|---|
| No sprint resolved | `Error: No sprint ID resolved.` |
| No active task | `No active developer task.` + sprint progress |

---

## User Commands

### `forloop org quotas`

| Scenario | Error Message |
|---|---|
| `--org-id` not provided | `Error: --org-id is required` |

---

## File Commands

### `forloop file upload`

| Scenario | Error Message |
|---|---|
| `--path` or `--sprint` not provided | `Error: --path and --sprint are required` |
| File not found at `--path` | `Error: File not found: <path>` |
| Upload failed (S3 presigned URL) | `Error: Upload failed (<status>)` |

### `forloop file list`

| Scenario | Error Message |
|---|---|
| `--sprint` not provided | `Error: --sprint is required` |
| No files found | `No files found.` |

### `forloop file delete`

| Scenario | Error Message |
|---|---|
| `--confirm` not provided | `Error: --confirm is required.` |

### `forloop file download`

| Scenario | Error Message |
|---|---|
| `--id` not provided | `Error: --id is required` |

---

## Folder Commands

### `forloop folder create`

| Scenario | Error Message |
|---|---|
| `--title` or `--sprint` not provided | `Error: --title and --sprint are required` |

---

## Sync Commands

### `forloop sync s3-to-local`

| Scenario | Error Message |
|---|---|
| No sprint resolved | `Error: No sprint ID resolved.` |

### `forloop sync local-to-s3`

| Scenario | Error Message |
|---|---|
| `--path` not provided | `Error: --path is required` |
| File not found | `Error: File not found: <path>` |

---

## Global Errors (All Commands)

### Authentication

| Scenario | Error Message | Exit Code |
|---|---|---|
| No token configured | `Error: No ForLoop API token configured.` + how-to-fix | 3 |
| Token invalid (API 401) | `ForLoop API <method> <path> failed: 401 Unauthorized` | 3 |

### Network & API

| Scenario | Error Message | Exit Code |
|---|---|---|
| Network failure | `ForLoop API <method> <path> failed: ...` | 6 |
| Request timeout | `ForLoop API <method> <path> failed: ...` | 5 |
| API 429 (rate limit) | `ForLoop API <method> <path> failed: 429 ...` | 4 |
| API 500 | `ForLoop API <method> <path> failed: 500 ...` | 7 |
| Non-JSON response | API error: unexpected response | 7 |

### Process Signals

| Scenario | Behavior |
|---|---|
| Ctrl+C / SIGINT | `Interrupted. Exiting.` (exit code 130) |
| Piped output closed (EPIPE) | Silent exit 0 |

### Config / Token File Corruption

| Scenario | Behavior |
|---|---|
| `~/.config/forloop/tokens.json` corrupted | Treated as no token; write error to stderr |
| Config file corrupted | Falls back to defaults with warning |
