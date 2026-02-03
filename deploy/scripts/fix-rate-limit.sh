#!/bin/bash
# Fix rate limiting for NextAuth endpoints
# Run this on the production server as root

echo "=== Fixing Rate Limiting for Authentication ==="

# 1. Update rate limiting config - increase login rate to 30r/m (1 request every 2 seconds)
cat > /etc/nginx/conf.d/rate-limiting.conf << 'RATELIMIT'
# Rate Limiting Zones

# General rate limit: 10 requests/second per IP
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;

# Login rate limit: 30 requests/minute per IP (allows normal auth flow)
limit_req_zone $binary_remote_addr zone=login:10m rate=30r/m;

# API rate limit: 30 requests/second per IP
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;

# Connection limit per IP
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

# Rate limit status code (429 Too Many Requests)
limit_req_status 429;
limit_conn_status 429;
RATELIMIT

echo "Rate limiting config updated (login: 30r/m)"

# 2. Update the CRM nginx config to use higher burst for auth
# First, check current config
echo ""
echo "=== Current wb-crm.conf ==="
cat /etc/nginx/sites-available/wb-crm.conf

# Update auth location block with higher burst
if grep -q "location /api/auth" /etc/nginx/sites-available/wb-crm.conf; then
    # Replace the auth location block with corrected version
    sed -i '/location \/api\/auth {/,/}/c\    # Rate limit for authentication (higher burst for NextAuth flow)\n    location /api/auth {\n        limit_req zone=login burst=10 nodelay;\n        proxy_pass http://127.0.0.1:3000;\n        proxy_http_version 1.1;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }' /etc/nginx/sites-available/wb-crm.conf
    echo "Auth location block updated with burst=10"
fi

# 3. Test nginx config
echo ""
echo "=== Testing Nginx Configuration ==="
nginx -t

# 4. Reload nginx if test passes
if nginx -t 2>&1 | grep -q "successful"; then
    systemctl reload nginx
    echo ""
    echo "=== Nginx reloaded successfully ==="
else
    echo ""
    echo "=== ERROR: Nginx config test failed! ==="
    echo "Restoring may be needed. Check the config manually."
    exit 1
fi

# 5. Show updated config
echo ""
echo "=== Updated wb-crm.conf ==="
cat /etc/nginx/sites-available/wb-crm.conf

echo ""
echo "=== Done! Try logging in again ==="
