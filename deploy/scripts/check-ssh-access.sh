#!/bin/bash
# Pre-check script before running security hardening
# This verifies SSH key authentication is working

SERVER="root@45.90.123.190"

echo "=========================================="
echo "SSH Access Pre-Check"
echo "=========================================="
echo ""

echo "Testing SSH key authentication..."
if ssh -o BatchMode=yes -o ConnectTimeout=5 "$SERVER" "echo 'SUCCESS'" 2>/dev/null; then
    echo "✅ SSH key authentication: WORKING"
    echo ""
    echo "You can safely run security hardening:"
    echo "  cd deploy/ansible"
    echo "  ansible-playbook -i inventory/production.yml playbooks/security-hardening.yml"
    echo ""
else
    echo "❌ SSH key authentication: FAILED"
    echo ""
    echo "DO NOT run security hardening until this is fixed!"
    echo ""
    echo "To fix, ensure your SSH key is in ~/.ssh/id_rsa and:"
    echo "  ssh-copy-id $SERVER"
    echo ""
    exit 1
fi

echo "Current SSH config on server:"
ssh "$SERVER" "grep -E '^(PasswordAuthentication|PermitRootLogin)' /etc/ssh/sshd_config"
echo ""
echo "=========================================="
