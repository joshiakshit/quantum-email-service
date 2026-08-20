#!/bin/sh
set -e

cd /app/key-manager
uvicorn app.main:app --host 0.0.0.0 --port 8000 &

cd /app
uvicorn gateway.main:app --host 0.0.0.0 --port 9000 &

wait
