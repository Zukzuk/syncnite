#!/bin/sh
set -eu

# Write runtime env for the frontend (version only)
cat >/usr/share/nginx/html/env.js <<EOF
window.__APP_VERSION__ = "${APP_VERSION:-dev}";
EOF

exec nginx -g 'daemon off;'