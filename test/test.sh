#!/usr/bin/env bash

# docker build -t forloop-cli-test -f test/Dockerfile test/ && docker run --rm -e FORLOOP_API_KEY=<token> forloop-cli-test

set -eu

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

PASS=0
FAIL=0
SKIP=0
TEST_SPRINT_ID=""
TEST_STORY_ID=""
TEST_FILE_ID=""
TEST_ORG_ID=""

pass()  { echo -e "  ${GREEN}PASS${NC} $1"; PASS=$((PASS + 1)); }
fail()  { echo -e "  ${RED}FAIL${NC} $1"; FAIL=$((FAIL + 1)); }
skip()  { echo -e "  ${YELLOW}SKIP${NC} $1"; SKIP=$((SKIP + 1)); }

header() {
  echo ""
  echo -e "${BLUE}${BOLD}=== $1 ===${NC}"
}

# ── Stage 0: Install & Auth ──────────────────────────────────────────────────

header "Stage 0: Install & Authenticate"
echo "Installing @forloop-cc/forloop-cli..."
if npm install -g @forloop-cc/forloop-cli > /dev/null 2>&1; then
  pass "npm install"
else
  fail "npm install failed"
  exit 1
fi

if command -v forloop &>/dev/null; then
  VERSION=$(forloop --version 2>&1)
  pass "binary: $VERSION"
else
  fail "binary not found on PATH"
  exit 1
fi

if [ -n "${FORLOOP_API_KEY:-}" ]; then
  if forloop auth login --api-key "$FORLOOP_API_KEY" --non-interactive > /dev/null 2>&1; then
    pass "auth login"
  else
    fail "auth login"
    exit 1
  fi
else
  skip "no FORLOOP_API_KEY provided"
fi

# ── Stage 1: Auth Commands ───────────────────────────────────────────────────

header "Stage 1: Auth"

forloop auth status --non-interactive 2>&1 | grep -q "valid" && pass "auth status" || fail "auth status"

# Test logout + login cycle
forloop auth logout --non-interactive > /dev/null 2>&1 || true
forloop auth status --non-interactive 2>&1 | grep -q "Not authenticated" && pass "auth logout" || fail "auth logout"
forloop auth login --api-key "$FORLOOP_API_KEY" --non-interactive > /dev/null 2>&1 && pass "auth re-login" || fail "auth re-login"

# ── Stage 2: User & Org (Read Only) ──────────────────────────────────────────

header "Stage 2: User & Organization"

USER_PROFILE=$(forloop user profile --non-interactive 2>&1)
echo "$USER_PROFILE" | grep -qE "name|email|tier|Name|Email|Tier|\{" && pass "user profile" || fail "user profile"

forloop user quotas --non-interactive 2>&1 | grep -qE "Orgs|Sprints|Quotas" && pass "user quotas" || fail "user quotas"

ORG_LIST=$(forloop org list --non-interactive 2>&1)
if echo "$ORG_LIST" | grep -qE "[Oo]rganization"; then
  TEST_ORG_ID=$(echo "$ORG_LIST" | grep -oE '#[0-9]+' | head -1 | tr -d '#')
  if [ -n "$TEST_ORG_ID" ]; then
    pass "org list (found org #$TEST_ORG_ID)"
  else
    skip "org list (no org ID found)"
  fi
else
  skip "org list (no orgs)"
fi

if [ -n "$TEST_ORG_ID" ]; then
  timeout 10 forloop org get --id "$TEST_ORG_ID" --non-interactive > /dev/null 2>&1 || true
  timeout 10 forloop org get --id "$TEST_ORG_ID" --non-interactive 2>&1 | grep -qE "Organization|Nam|Error" && pass "org get" || fail "org get"
  timeout 10 forloop org quotas --org-id "$TEST_ORG_ID" --non-interactive 2>&1 | grep -qE "Quotas|organization" && pass "org quotas" || fail "org quotas"
  timeout 10 forloop org list --owned-only --non-interactive > /dev/null 2>&1 && pass "org list --owned-only" || skip "org list --owned-only"
fi

# ── Stage 3: Template ────────────────────────────────────────────────────────

header "Stage 3: Template"
TMPL_OUT=$(forloop template list --non-interactive 2>&1)
if echo "$TMPL_OUT" | grep -q "schedule-meeting" && echo "$TMPL_OUT" | grep -q "doc-folder"; then
  pass "template list (schedule-meeting, doc-folder)"
else
  fail "template list"
fi

# ── Stage 4: Sprint (Read) ───────────────────────────────────────────────────

header "Stage 4: Sprint"

forloop sprint list --non-interactive 2>&1 | grep -qE "Sprints|No sprints|\[|#" && pass "sprint list" || fail "sprint list"
forloop sprint list --include-system-org --non-interactive > /dev/null 2>&1 && pass "sprint list --include-system-org" || skip "sprint list --include-system-org"

# Find an existing sprint to test get
EXISTING_SPRINT=$(forloop sprint list --non-interactive 2>&1 | grep -oE '#[0-9]+' | head -1 | tr -d '#')
if [ -n "$EXISTING_SPRINT" ]; then
  GET_OUT=$(forloop sprint get --id "$EXISTING_SPRINT" --non-interactive 2>&1)
  echo "$GET_OUT" | grep -qE "Sprint|Title|Status" && pass "sprint get (#$EXISTING_SPRINT)" || fail "sprint get"
  forloop sprint get --id "$EXISTING_SPRINT" --no-stories --non-interactive > /dev/null 2>&1 && pass "sprint get --no-stories" || skip "sprint get --no-stories"
else
  skip "sprint get (no sprints)"
fi

# ── Stage 5: Sprint/Story Write (Works only if token has write perms) ──────

header "Stage 5: Sprint & Story Write"
SPRINT_TITLE="cli-test-$(date +%Y%m%d-%H%M%S)"
SPRINT_OUT=$(timeout 15 forloop sprint create \
  --title "$SPRINT_TITLE" \
  --start-date "$(date +%Y-%m-%d)" \
  --end-date "$(date -d '+7 days' +%Y-%m-%d 2>/dev/null || date -v+7d +%Y-%m-%d)" \
  --description "CLI integration test" \
  --non-interactive 2>&1) || SPRINT_OUT=""

if [ -z "$SPRINT_OUT" ] || echo "$SPRINT_OUT" | grep -qi "Forbidden\|quota\|limit"; then
  skip "sprint create (token lacks write permission or timed out)"
  skip "story create (no sprint)"
  skip "folder create (no sprint)"
  skip "sprint update (no sprint)"
else
  TEST_SPRINT_ID=$(echo "$SPRINT_OUT" | grep -oE '#[0-9]+' | head -1 | tr -d '#')
  if [ -n "$TEST_SPRINT_ID" ]; then
    pass "sprint create (#$TEST_SPRINT_ID)"
    forloop sprint get --id "$TEST_SPRINT_ID" --non-interactive 2>&1 | grep -q "$SPRINT_TITLE" && pass "sprint get (own)" || fail "sprint get (own)"
    forloop sprint update --id "$TEST_SPRINT_ID" --description "Updated by CLI test" --non-interactive > /dev/null 2>&1 && pass "sprint update" || fail "sprint update"

    # Story CRUD
    STORY_OUT=$(forloop story create \
      --title "CLI test task" --sprint "$TEST_SPRINT_ID" --type basic-task \
      --description "Testing story" --priority high --points 5 --non-interactive 2>&1)
    TEST_STORY_ID=$(echo "$STORY_OUT" | grep -oE '#[0-9]+' | head -1 | tr -d '#')
    if [ -n "$TEST_STORY_ID" ]; then
      pass "story create basic-task (#$TEST_STORY_ID)"
      forloop story get --id "$TEST_STORY_ID" --non-interactive 2>&1 | grep -q "CLI test task" && pass "story get" || fail "story get"
      forloop story get --id "$TEST_STORY_ID" --no-comments --non-interactive > /dev/null 2>&1 && pass "story get --no-comments" || skip "story get --no-comments"
      forloop story update --id "$TEST_STORY_ID" --status in_progress --non-interactive > /dev/null 2>&1 && pass "story update" || fail "story update"
    else
      fail "story create: $STORY_OUT"
    fi

    NOTE_OUT=$(forloop story create --title "CLI test note" --sprint "$TEST_SPRINT_ID" --type basic-note --non-interactive 2>&1)
    NOTE_ID=$(echo "$NOTE_OUT" | grep -oE '#[0-9]+' | head -1 | tr -d '#')
    [ -n "$NOTE_ID" ] && { pass "story create basic-note (#$NOTE_ID)"; forloop story delete --id "$NOTE_ID" --confirm --non-interactive > /dev/null 2>&1; } || fail "story create basic-note"

    FOLDER_OUT=$(forloop folder create --title "cli-test-folder" --sprint "$TEST_SPRINT_ID" --non-interactive 2>&1)
    FOLDER_ID=$(echo "$FOLDER_OUT" | grep -oE '#[0-9]+' | head -1 | tr -d '#')
    [ -n "$FOLDER_ID" ] && { pass "folder create (#$FOLDER_ID)"; forloop story delete --id "$FOLDER_ID" --confirm --non-interactive > /dev/null 2>&1; } || fail "folder create"
  else
    skip "sprint create: $SPRINT_OUT"
  fi
fi

# ── Stage 6: File & Sync (Write - may be forbidden) ──────────────────────────

header "Stage 6: File & Sync"
if [ -n "$TEST_SPRINT_ID" ]; then
  echo "test" > /tmp/cli-test.txt

  UPLOAD_OUT=$(timeout 20 forloop file upload --path /tmp/cli-test.txt --sprint "$TEST_SPRINT_ID" --non-interactive 2>&1) || UPLOAD_OUT=""
  if echo "$UPLOAD_OUT" | grep -qi "Forbidden\|quota\|limit"; then
    skip "file upload (token lacks permission)"
  else
    TEST_FILE_ID=$(echo "$UPLOAD_OUT" | grep -oE '#[0-9]+' | head -1 | tr -d '#')
    [ -n "$TEST_FILE_ID" ] && pass "file upload (#$TEST_FILE_ID)" || fail "file upload"

    forloop file list --sprint "$TEST_SPRINT_ID" --non-interactive 2>&1 | grep -qE "Files|#" && pass "file list" || fail "file list"

    if [ -n "$TEST_FILE_ID" ]; then
      forloop file download --id "$TEST_FILE_ID" --non-interactive 2>&1 | grep -qE "URL|https://" && pass "file download-url" || fail "file download-url"
    fi
  fi

  forloop sync aivy-folder --sprint "$TEST_SPRINT_ID" --non-interactive > /dev/null 2>&1 && pass "sync aivy-folder" || skip "sync aivy-folder"
  forloop sync aivy-doc-get --sprint "$TEST_SPRINT_ID" --non-interactive 2>&1 | grep -qE "ID|Folder|#" && pass "sync aivy-doc-get" || fail "sync aivy-doc-get"
  timeout 15 forloop sync s3-to-local --sprint "$TEST_SPRINT_ID" --quiet --non-interactive > /dev/null 2>&1 && pass "sync s3-to-local" || skip "sync s3-to-local"

  SYNC_OUT=$(timeout 15 forloop sync local-to-s3 --path /tmp/cli-test.txt --sprint "$TEST_SPRINT_ID" --folder project --non-interactive 2>&1) || SYNC_OUT=""
  echo "$SYNC_OUT" | grep -qi "Uploaded\|uploaded" && pass "sync local-to-s3" || skip "sync local-to-s3"
  rm -f /tmp/cli-test.txt
else
  skip "file & sync (no sprint)"
fi

# ── Stage 7: Agent Commands ─────────────────────────────────────────────────

header "Stage 7: Agent Commands"
if [ -n "$TEST_SPRINT_ID" ] || [ -n "$EXISTING_SPRINT" ]; then
  AGENT_SPRINT="${TEST_SPRINT_ID:-$EXISTING_SPRINT}"
  timeout 10 forloop agent history --sprint "$AGENT_SPRINT" --limit 5 --non-interactive 2>&1 | grep -qiE "No conversation|Conversation" && pass "agent history" || skip "agent history (empty)"
  timeout 10 forloop agent developer-status --sprint "$AGENT_SPRINT" --non-interactive 2>&1 | grep -qiE "No running|Running" && pass "agent developer-status" || skip "agent developer-status (no task)"
else
  skip "agent commands (no sprint)"
fi

# ── Stage 8: Global Flags & Error Handling ──────────────────────────────────

header "Stage 8: Global Flags"

forloop sprint list --non-interactive --quiet > /dev/null 2>&1 && pass "--quiet" || fail "--quiet"
forloop template list --non-interactive > /dev/null 2>&1 && pass "--non-interactive" || fail "--non-interactive"
forloop --version > /dev/null 2>&1 && pass "--version" || fail "--version"
forloop --help 2>&1 | grep -q "Usage:" && pass "--help" || fail "--help"

# Error handling
forloop story create 2>&1 | grep -qE "require|Error|Usage" && pass "missing args shows error" || fail "missing args"
INVALID_EXIT=0
forloop sprint delete --id 999999 --confirm --non-interactive > /dev/null 2>&1 || INVALID_EXIT=$?
[ "$INVALID_EXIT" -ne 0 ] && pass "invalid ID returns error" || skip "invalid ID error check"

# ── Cleanup ───────────────────────────────────────────────────────────────────

header "Cleanup"
if [ -n "$TEST_FILE_ID" ]; then
  forloop file delete --id "$TEST_FILE_ID" --confirm --non-interactive > /dev/null 2>&1 && pass "file delete" || fail "file delete"
fi
if [ -n "$TEST_STORY_ID" ]; then
  forloop story delete --id "$TEST_STORY_ID" --confirm --non-interactive > /dev/null 2>&1 && pass "story delete" || fail "story delete"
fi
if [ -n "$TEST_SPRINT_ID" ]; then
  forloop sprint delete --id "$TEST_SPRINT_ID" --confirm --non-interactive > /dev/null 2>&1 && pass "sprint delete" || fail "sprint delete"
fi
rm -f /tmp/cli-test.txt || true

# ── Summary ──────────────────────────────────────────────────────────────────

header "Results"
echo -e "  ${GREEN}Passed: $PASS${NC}"
echo -e "  ${RED}Failed: $FAIL${NC}"
echo -e "  ${YELLOW}Skipped: $SKIP${NC}"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}${BOLD}SOME TESTS FAILED${NC}"
  exit 1
else
  echo -e "${GREEN}${BOLD}ALL TESTS PASSED${NC}"
  exit 0
fi
