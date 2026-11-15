#!/usr/bin/env python3
"""Dev-only: read the app's latest geometry beacon from the emulator console
and answer questions without a browser-script lease.
  geo.py aim X Y [FROM]   -> world position for a palm whose shadow lands at (X, Y)
  geo.py stage            -> "W,H"
  geo.py creature NAME    -> "x,y" of that creature's centre
  geo.py button ID        -> "x,y"
  geo.py wellx            -> well x
  geo.py phase            -> "phase,beat"
"""
import json, re, subprocess, sys, time

def beacon():
    out = subprocess.run(['npx', '@iwsdk/cli', 'browser', 'logs', '--input-json',
                          json.dumps({'pattern': r'chhaya\] geo', 'count': 1})],
                         capture_output=True, text=True).stdout
    try:
        result = json.loads(out)['data']['result']
    except Exception:
        open('/tmp/geo-fail.log', 'a').write(out[:400] + '\n---\n')
        return None
    now = time.time() * 1000
    for entry in reversed(result):
        msg = entry.get('message', '')
        # Ignore beacons from before a reload: they describe another session.
        if now - entry.get('timestamp', 0) > 20000:
            continue
        if msg.startswith('[chhaya] geo '):
            return json.loads(msg[len('[chhaya] geo '):])
    return None

g = None
for _ in range(20):
    g = beacon()
    if g is not None and (sys.argv[1] != 'stage' or g.get('placed')):
        break
    time.sleep(0.4)
cmd = sys.argv[1]
if g is None:
    print(''); sys.exit(0)
def add(a, b, k=1.0): return [a[i] + b[i] * k for i in range(3)]
def sub(a, b): return [a[i] - b[i] for i in range(3)]
def dot(a, b): return sum(a[i] * b[i] for i in range(3))
if cmd == 'aim':
    x, y = float(sys.argv[2]), float(sys.argv[3]); frm = float(sys.argv[4]) if len(sys.argv) > 4 else 0.3
    wall = add(add(g['o'], g['r'], x), g['u'], y)
    c = g['c']; hc = dot(sub(c, g['o']), g['n']); hl = dot(sub(g['l'], g['o']), g['n'])
    t = (hc - (hl - frm)) / max(1e-3, hc)
    p = add(c, sub(wall, c), t)
    print(','.join(f'{v:.3f}' for v in p))
elif cmd == 'stage': print(f"{g['w']},{g['h']}" if g.get('placed') else '')
elif cmd == 'creature':
    c = next((c for c in g['cr'] if c['s'] == sys.argv[2]), None); print(f"{c['x']},{c['y']}" if c else '')
elif cmd == 'button':
    b = next((b for b in g['b'] if b['id'] == sys.argv[2]), None); print(f"{b['x']},{b['y']}" if b else '')
elif cmd == 'wellx': print(g['wellX'])
elif cmd == 'phase': print(f"{g['phase']},{g['beat']}")
