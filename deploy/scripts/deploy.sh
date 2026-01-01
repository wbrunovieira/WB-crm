#!/bin/bash

# WB-CRM Deployment Script
# Usage: ./deploy.sh [deploy|update]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANSIBLE_DIR="$SCRIPT_DIR/../ansible"
VAULT_PASS_FILE="$ANSIBLE_DIR/.vault_pass"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Ansible is installed
if ! command -v ansible-playbook &> /dev/null; then
    echo_error "Ansible is not installed. Please install it first:"
    echo "  brew install ansible  # macOS"
    echo "  sudo apt install ansible  # Ubuntu/Debian"
    exit 1
fi

# Check if vault password file exists
if [ ! -f "$VAULT_PASS_FILE" ]; then
    echo_warn "Vault password file not found at $VAULT_PASS_FILE"
    echo "Please enter your Ansible Vault password:"
    read -s VAULT_PASS
    echo "$VAULT_PASS" > "$VAULT_PASS_FILE"
    chmod 600 "$VAULT_PASS_FILE"
    echo_info "Vault password file created"
fi

# Determine playbook
PLAYBOOK="update.yml"
if [ "$1" == "deploy" ]; then
    PLAYBOOK="deploy.yml"
    echo_info "Running full deployment..."
else
    echo_info "Running update deployment..."
fi

# Run Ansible
cd "$ANSIBLE_DIR"
echo_info "Running ansible-playbook $PLAYBOOK"

ansible-playbook \
    -i inventory/production.yml \
    playbooks/$PLAYBOOK \
    --vault-password-file "$VAULT_PASS_FILE"

echo_info "Deployment completed!"
