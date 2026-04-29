#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

PID_FILE=".backend.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "No backend PID file found."
  exit 0
fi

BACKEND_PID="$(cat "$PID_FILE")"

if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
  rm -f "$PID_FILE"
  echo "Backend PID $BACKEND_PID is not running."
  exit 0
fi

kill "$BACKEND_PID"

for _ in 1 2 3 4 5; do
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    rm -f "$PID_FILE"
    echo "Backend stopped."
    exit 0
  fi
  sleep 1
done

echo "Backend PID $BACKEND_PID did not stop cleanly."
exit 1
