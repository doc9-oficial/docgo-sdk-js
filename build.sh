#!/usr/bin/env bash
set -euo pipefail

echo "[docgo-sdk] Installing deps..."
npm install

echo "[docgo-sdk] Building..."
npm run build

echo "[docgo-sdk] Done. Output in dist/"