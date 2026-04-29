#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

PID_FILE=".backend.pid"
PORT_VALUE="${PORT:-5001}"

if [[ -f "$PID_FILE" ]]; then
  BACKEND_PID="$(cat "$PID_FILE")"
  if kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "Backend is running with PID $BACKEND_PID."
    lsof -nP -iTCP:"$PORT_VALUE" -sTCP:LISTEN 2>/dev/null || true
    exit 0
  fi
fi

PORT_PID="$(lsof -tiTCP:"$PORT_VALUE" -sTCP:LISTEN 2>/dev/null || true)"
if [[ -n "$PORT_PID" ]]; then
  echo "Port $PORT_VALUE is in use by PID $PORT_PID, but no active PID file was found."
  exit 0
fi

echo "Backend is not running."
