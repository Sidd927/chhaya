#!/usr/bin/env bash
# Dev-only: perform one full, first-run take of Chhaya in the emulator with
# smooth (minimum-jerk) hand and head motion. Pair with scripts/dev/record.mjs.
cd "$(dirname "$0")/../.."
source scripts/dev/walk.sh
anim() { npx @iwsdk/cli xr animate-to --input-json "$1" >/dev/null 2>&1; }
# Wait (up to $2 s) until the app reaches a phase (and optional beat).
waitfor() { for _ in $(seq 1 ${2:-40}); do case "$(python3 scripts/dev/geo.py phase)" in $1) return 0;; esac; sleep 0.5; done; echo "timeout waiting for $1"; }
rest_r() { anim '{"device":"hand-right","position":{"x":0.24,"y":1.02,"z":-0.3},"anchor":"wrist","duration":0.9,"easing":"minimum-jerk"}'; cli xr set-hand-pose --input-json '{"device":"hand-right","poseId":"default","duration":0.3}'; }
# Move the right palm so its shadow lands on stage (x, y), then take a pose.
palm() { local pos=""; for _ in 1 2 3; do pos=$(python3 scripts/dev/geo.py aim $1 $2 ${5:-0.3}); [ -n "$pos" ] && break; done; IFS=, read -r X Y Z <<< "$pos"
  anim "{\"device\":\"hand-right\",\"position\":{\"x\":$X,\"y\":$Y,\"z\":$Z},\"anchor\":\"middle-finger-metacarpal\",\"orientation\":{\"fingers\":[0,1,0],\"palm\":[0,0,-1]},\"duration\":${4:-1.1},\"easing\":\"minimum-jerk\"}"
  cli xr set-hand-pose --input-json "{\"device\":\"hand-right\",\"poseId\":\"$3\",\"duration\":0.35}"; }
grasp_to() { local pos; pos=$(python3 scripts/dev/geo.py aim $1 $2 0.32); IFS=, read -r X Y Z <<< "$pos"
  anim "{\"device\":\"hand-right\",\"position\":{\"x\":$X,\"y\":$Y,\"z\":$Z},\"anchor\":\"grasp\",\"orientation\":{\"fingers\":[0,0.6,-0.8],\"palm\":[-1,0,0]},\"duration\":${3:-1.0},\"easing\":\"minimum-jerk\"}"; }
carry() { local P; P=$(python3 scripts/dev/geo.py creature $1); IFS=, read -r CX CY <<< "$P"; grasp_to $CX $CY 1.0; cli xr set-select-value --input-json '{"device":"hand-right","value":1,"duration":0.2}'; sleep 0.3
  local MX; MX=$(python3 -c "print(($CX+$2)/2)"); grasp_to $MX $(python3 -c "print($CY+0.35)") 0.9; grasp_to $2 $CY 0.9
  cli xr set-select-value --input-json '{"device":"hand-right","value":0,"duration":0.2}'; sleep 0.4; rest_r; }

ev "window.__chhaya.resetSave(); const w = window.__chhaya.system.world; if (w.session) await w.session.end(); return 1" >/dev/null; sleep 3; cli xr enter; sleep 0.3
[ -n "$RECORD" ] && (./scripts/dev/record-chunks.sh ${RECORD} > /tmp/chhaya-rec.log 2>&1 &) && sleep 2.5
cli xr set-input-mode --input-json '{"mode":"hand"}'
cli xr set-transform --input-json '{"device":"hand-left","position":{"x":-0.24,"y":1.02,"z":-0.3},"anchor":"wrist"}'
cli xr set-transform --input-json '{"device":"hand-right","position":{"x":0.24,"y":1.02,"z":-0.3},"anchor":"wrist"}'
cli xr set-transform --input-json '{"device":"headset","orientation":{"pitch":0,"yaw":38,"roll":0}}'
waitfor 'wall,*' 30; sleep 1
anim '{"device":"headset","orientation":{"pitch":-1,"yaw":0,"roll":0},"duration":2.4,"easing":"minimum-jerk"}'
sleep 1.5
anim '{"device":"hand-right","position":{"x":0.16,"y":1.3,"z":-0.42},"anchor":"wrist","orientation":"auto","duration":0.8,"easing":"minimum-jerk"}'
cli xr select --input-json '{"device":"hand-right","duration":0.25}'
rest_r; waitfor 'first-light,*' 30; sleep 0.5
IFS=, read -r W H <<< "$(python3 scripts/dev/geo.py stage)"
X=$(python3 -c "print($W*0.42)"); Y=$(python3 -c "print($H*0.55)")
palm $X $Y open 1.4; sleep 2.2
palm $X $Y open 1.0 0.17; sleep 1.6
palm $X $Y open 1.0 0.34; sleep 1.2
cli xr set-hand-pose --input-json '{"device":"hand-right","poseId":"peace","duration":0.4}'; sleep 3.6
rest_r; waitfor 'menu,*' 30; sleep 1
echo "before tale: $(python3 scripts/dev/geo.py phase)"
B=$(python3 scripts/dev/geo.py button tale); IFS=, read -r BX BY <<< "$B"
echo "tale button at $B"; palm $BX $BY flat 1.2; sleep 2.0; rest_r; sleep 4.5; echo "after press: $(python3 scripts/dev/geo.py phase)"
waitfor 'tale,1' 30; palm $(python3 -c "print($W*0.3)") $Y claw; sleep 2.6; rest_r
waitfor 'tale,3' 40; palm $(python3 -c "print($W*0.62)") $Y rock; sleep 2.6; rest_r
waitfor 'tale,5' 40; sleep 1.5; palm $(python3 -c "print($W*0.86)") $Y peace; sleep 2.6; rest_r
waitfor 'tale,6' 30; sleep 1.5; LX=$(python3 scripts/dev/geo.py creature lion | cut -d, -f1); carry hare $(python3 -c "print($LX+0.45)")
waitfor 'tale,9' 40; sleep 2; WX=$(python3 scripts/dev/geo.py wellx); carry lion $(python3 -c "print($WX-0.32)")
waitfor 'tale,10' 30; sleep 2; palm $(python3 -c "print($W*0.45)") $Y fist 1.0; sleep 0.6
cli xr set-hand-pose --input-json '{"device":"hand-right","poseId":"open","duration":0.15}'; sleep 0.8; rest_r
waitfor 'tale-end,*' 60; sleep 3
echo "take done: $(python3 scripts/dev/geo.py phase)"
