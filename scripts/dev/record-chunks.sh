#!/usr/bin/env bash
# Dev-only: record N back-to-back 100 s chunks into REC_DIR (a, b, c...).
cd "$(dirname "$0")/../.."
for p in $(echo "a b c d e" | cut -d' ' -f1-${1:-3}); do
  REC_DIR=${REC_DIR:-/tmp/chhaya-rec} REC_PREFIX=$p REC_SECONDS=100 npx @iwsdk/cli browser run scripts/dev/record.mjs --timeout 108000 2>&1 | grep -E '"frames"|error' | head -2
done
