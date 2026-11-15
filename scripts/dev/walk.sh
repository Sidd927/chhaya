#!/usr/bin/env bash
# Dev-only: drive the emulator through the opening of Chhaya.
cli() { npx @iwsdk/cli "$@" >/dev/null 2>&1; }
shot() { npx @iwsdk/cli browser screenshot --output-file "/tmp/chhaya-shots/$1.png" >/dev/null 2>&1; echo "shot $1"; }
state() { CHHAYA_EVAL='return window.__chhaya.state' npx @iwsdk/cli browser run scripts/dev/eval.mjs 2>/dev/null | head -8 | tr -d '\n '; echo; }
