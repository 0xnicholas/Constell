#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "[setup] Setting up Constell development environment..."

# Copy .env if missing
if [ ! -f "$ROOT_DIR/.env" ]; then
  if [ -f "$ROOT_DIR/.env.dev.example" ]; then
    cp "$ROOT_DIR/.env.dev.example" "$ROOT_DIR/.env"
    echo "[setup] Created .env from .env.dev.example"
  else
    echo "[setup] Warning: .env.dev.example not found"
  fi
else
  echo "[setup] .env already exists, skipping"
fi

# Install dependencies
echo "[setup] Installing dependencies..."
cd "$ROOT_DIR"
pnpm install

echo "[setup] Done. Run 'pnpm run infra:dev:up' to start infrastructure."
