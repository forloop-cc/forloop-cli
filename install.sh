#!/usr/bin/env bash
set -euo pipefail

# ForLoop CLI Installer
# https://github.com/forloop-cc/forloop-cli
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/forloop-cc/forloop-cli/main/install.sh | bash
#   npm install -g forloop-cli

# ── Colors ────────────────────────────────────────────────────────────────────
if [ -t 1 ]; then
    RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
    BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
else
    RED=''; GREEN=''; YELLOW=''; BLUE=''; CYAN=''; BOLD=''; NC=''
fi

print_header() {
    echo -e "${BLUE}${BOLD}"
    echo "  ███████╗ █████╗ ██████╗ ██╗      █████╗  █████╗ ██████╗ "
    echo "  ██╔════╝██╔══██╗██╔══██╗██║     ██╔══██╗██╔══██╗██╔══██╗"
    echo "  █████╗  ██║  ██║██████╔╝██║     ██║  ██║██║  ██║██████╔╝"
    echo "  ██╔══╝  ██║  ██║██╔══██╗██║     ██║  ██║██║  ██║██╔═══╝ "
    echo "  ██║     ╚████╔╝██║  ██║███████╗╚████╔╝╚████╔╝██║     "
    echo "  ╚═╝      ╚═══╝ ╚═╝  ╚═╝╚══════╝ ╚═══╝  ╚═══╝ ╚═╝     "
    echo -e "${NC}"
    echo -e "  ${BOLD}CLI Installer${NC}\n"
}

print_success() { echo -e "  ${GREEN}✓${NC} $1"; }
print_info()    { echo -e "  ${BLUE}ℹ${NC} $1"; }
print_error()   { echo -e "  ${RED}✗${NC} $1"; }

# ── Header ────────────────────────────────────────────────────────────────────
print_header

# ── Check prerequisites ───────────────────────────────────────────────────────
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    print_error "Node.js is required (v18 or later). Install from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js v18 or later is required. Current: $(node -v)"
    exit 1
fi
print_success "Node.js $(node -v)"

if ! command -v npm &> /dev/null; then
    print_error "npm is required."
    exit 1
fi
print_success "npm $(npm -v)"

echo ""

# ── Install ───────────────────────────────────────────────────────────────────
echo "Installing forloop-cli..."

if npm install -g forloop-cli 2>/dev/null; then
    print_success "Installed successfully"
else
    print_error "Installation failed. Try: npm install -g forloop-cli"
    print_info "Or clone manually: git clone https://github.com/forloop-cc/forloop-cli.git"
    exit 1
fi

echo ""

# ── Verify ────────────────────────────────────────────────────────────────────
echo "Verifying installation..."
FORLOOP_VERSION=$(forloop --version 2>&1)
print_success "forloop-cli ${FORLOOP_VERSION#forloop } installed"

echo ""
echo -e "${BOLD}Next steps:${NC}"
echo "  1. Get an API token: https://forloop.cc/profile?tab=api-tokens"
echo "  2. Authenticate:      forloop auth login --api-key floop_xxxxx"
echo "  3. Start using:       forloop sprint list"
echo ""
echo -e "${BOLD}Quick reference:${NC}"
echo "  forloop --help              Show all commands"
echo "  forloop auth login          Set your API token"
echo "  forloop sprint list         List sprints"
echo "  forloop agent developer-status   Check AI agent status"
echo ""
