#!/bin/bash
# Script para configurar backup do CRM para Google Drive
# Execute localmente: ./deploy/scripts/setup-gdrive-backup.sh

set -e

SERVER="root@45.90.123.190"
ANSIBLE_DIR="deploy/ansible"

echo "=========================================="
echo "CRM Backup Setup - Google Drive"
echo "=========================================="
echo ""

# Step 1: Run Ansible playbook
echo "Step 1: Installing backup scripts on server..."
cd "$(dirname "$0")/../ansible"

if [ ! -f ~/.vault_pass ]; then
    echo "Enter Ansible Vault password:"
    read -s VAULT_PASS
    echo "$VAULT_PASS" > ~/.vault_pass
    chmod 600 ~/.vault_pass
fi

ansible-playbook -i inventory/production.yml playbooks/setup-backup.yml --vault-password-file ~/.vault_pass

echo ""
echo "=========================================="
echo "Step 2: Configure Google Drive on Server"
echo "=========================================="
echo ""
echo "Now you need to configure rclone with Google Drive."
echo "This requires interactive setup on the server."
echo ""
echo "Press Enter to connect to server and run 'rclone config'..."
read

# Step 2: SSH to server and run rclone config
ssh -t "$SERVER" "rclone config"

echo ""
echo "=========================================="
echo "Step 3: Test Backup"
echo "=========================================="
echo ""
echo "Running test backup..."
ssh "$SERVER" "/opt/backups/backup-crm.sh"

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Backup schedule: Daily at 3:00 AM"
echo "Retention: 7 days"
echo ""
echo "Useful commands (on server):"
echo "  /opt/backups/backup-crm.sh        - Run backup manually"
echo "  /opt/backups/restore-crm.sh list  - List all backups"
echo "  tail -f /var/log/crm-backup.log   - View backup logs"
echo ""
