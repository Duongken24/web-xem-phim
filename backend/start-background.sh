#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

PID_FILE=".backend.pid"
LOG_FILE="backend.log"
PORT_VALUE="${PORT:-5001}"

if [[ -f "$PID_FILE" ]]; then
  EXISTING_PID="$(cat "$PID_FILE")"
  if kill -0 "$EXISTING_PID" 2>/dev/null; then
    echo "Backend is already running with PID $EXISTING_PID."
    exit 0
  fi
  rm -f "$PID_FILE"
fi

PORT_PID="$(lsof -tiTCP:"$PORT_VALUE" -sTCP:LISTEN 2>/dev/null || true)"
if [[ -n "$PORT_PID" ]]; then
  echo "Port $PORT_VALUE is already in use by PID $PORT_PID."
  exit 1
fi

nohup node server.js > "$LOG_FILE" 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$PID_FILE"

sleep 2

if kill -0 "$BACKEND_PID" 2>/dev/null; then
  echo "Backend started in background."
  echo "PID: $BACKEND_PID"
  echo "Log: $(pwd)/$LOG_FILE"
  exit 0
fi

rm -f "$PID_FILE"
echo "Backend failed to stay up. Check $(pwd)/$LOG_FILE"
exit 1
