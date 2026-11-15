#!/usr/bin/env bash
# Dev-only: drive the emulator through the opening of Chhaya.
cli() { npx @iwsdk/cli "$@" >/dev/null 2>&1; }
shot() { npx @iwsdk/cli browser screenshot --output-file "/tmp/chhaya-shots/$1.png" >/dev/null 2>&1; echo "shot $1"; }
state() { CHHAYA_EVAL='return window.__chhaya.state' npx @iwsdk/cli browser run scripts/dev/eval.mjs 2>/dev/null | head -8 | tr -d '\n '; echo; }
ev() { CHHAYA_EVAL="$1" npx @iwsdk/cli browser run scripts/dev/eval.mjs 2>/dev/null | python3 -c "import sys;t=sys.stdin.read();i=t.find('{\n  \"ok\"');print((t[:i] if i>0 else t).strip().replace('\n','').replace(' ',''))"; }
# Put the right hand's palm shadow on stage point (x, y) with a pose.
aim() { local pos; pos=$(ev "const p = window.__chhaya.system.debugAim($1, $2); return p.map(v=>+v.toFixed(3)).join(',')" | tr -d '"'); IFS=, read -r X Y Z <<< "$pos"; cli xr set-transform --input-json "{\"device\":\"hand-right\",\"position\":{\"x\":$X,\"y\":$Y,\"z\":$Z},\"anchor\":\"middle-finger-metacarpal\",\"orientation\":{\"fingers\":[0,1,0],\"palm\":[0,0,-1]}}"; cli xr set-hand-pose --input-json "{\"device\":\"hand-right\",\"poseId\":\"${3:-open}\"}"; }
opening() {
  cli browser reload; sleep 4; cli xr enter; cli xr set-input-mode --input-json '{"mode":"hand"}'; sleep 3.5
  cli xr select --input-json '{"device":"hand-right"}'; sleep 5.5
  cli xr set-transform --input-json '{"device":"hand-left","position":{"x":-0.35,"y":1.0,"z":-0.2},"anchor":"wrist"}'
}
# Move the right hand so its pinch (grasp) point's shadow lands on (x, y).
aimpinch() { local pos; pos=$(ev "const p = window.__chhaya.system.debugAim($1, $2, 0.32); return p.map(v=>+v.toFixed(3)).join(',')" | tr -d '"'); IFS=, read -r X Y Z <<< "$pos"; cli xr set-transform --input-json "{\"device\":\"hand-right\",\"position\":{\"x\":$X,\"y\":$Y,\"z\":$Z},\"anchor\":\"grasp\",\"orientation\":{\"fingers\":[0,0.6,-0.8],\"palm\":[-1,0,0]}}"; }
creature() { ev "const c = window.__chhaya.system.debugCreatures().find(c=>c.s==='$1'); return c ? [c.x, c.y].join(',') : ''" | tr -d '"'; }
hide_right() { cli xr set-transform --input-json '{"device":"hand-right","position":{"x":0.35,"y":0.95,"z":-0.15},"anchor":"wrist"}'; cli xr set-hand-pose --input-json '{"device":"hand-right","poseId":"default"}'; }
beat() { ev "return window.__chhaya.state.beat"; }
