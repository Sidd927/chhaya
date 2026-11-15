# Testing report

Last updated 15 November 2026. This report states what was verified and how, and what was not.

## Environment

- Development machine: MacBook Air (Apple M5, 16 GB), macOS 27.0.1, Node 26.4.0.
- Emulator: **IWER 2.8.0** through `@iwsdk/vite-plugin-dev` 1.1.0. It emulates a Meta Quest 3 in an `immersive-ar` session, using the `sunlit_living_room` scanned room (labelled planes: walls, wall art, window, door, couch, table, floor, ceiling).
- The managed Chromium is driven by the IWSDK CLI (`xr`, `browser`, `scene` commands) and the scripts in `scripts/dev/`.
- **No physical Meta Quest was available. Nothing here was tested on hardware.**

## Automated checks

| Check | Result |
| --- | --- |
| `npm run typecheck` (tsc, strict) | Pass |
| `npm run build` (Vite production) | Pass: 3.7 MB `dist/`, main chunk 680 KB gzipped. Vite warns about chunk size. |
| `npm run tune-shapes`: classifier against IWER's 24 hand poses | Pass for all 9 expected mappings: peace → hare, claw → lion, rock → stag, open → peacock, flat → crocodile, fist → tortoise, point → snake; relaxed (`default`) and `pinch` → none |
| GitHub Actions deploy (typecheck + build + Pages) | Pass. https://sidd927.github.io/chhaya/ returns 200 over HTTPS. |

## Journey verification in the emulator

Each row was performed with emulated hands (named poses, transforms, pinch values) and checked against live app state, and in most cases a screenshot.

| Scenario | How it was checked | Result |
| --- | --- | --- |
| Landing page renders; desktop without immersive AR | Built-in browser on the deployed site | Pass. "Open on Meta Quest" with an explanation. |
| Enter XR → lights down → wall selection | `xr enter`; state `dim` → `wall` | Pass |
| Gaze reticle only on real walls | Room plane listing; reticle on the far wall, not the painting (`wall art`) | Pass, after adding label filtering |
| Pinch places stage; curtain; first-light | `xr select`; stage 3.23 × 2.02 m on a 3.4 m wall | Pass |
| Hand shadow on the wall, size and softness change with distance to the lantern | Open hand at 0.34 m and 0.17 m from the lantern; screenshots | Pass |
| Held shape awakens a creature, with ember rim, toast and a save entry | `peace` held → hare; `open` → peacock; "1 of 8" / "2 of 8" toasts | Pass |
| Relaxed hand does not spawn | Emulator `default` pose held | Pass (classified as none) |
| Tutorial → menu | State transitions | Pass |
| Light button pressed by covering it with the hand's shadow | Flat hand over "Hear a tale" → `tale` | Pass |
| A button already covered when it appears does not fire until uncovered | Code path added after a scripted run pressed a button the moment the menu appeared | Pass in later runs |
| The whole tale with real gestures | Claw → lion, rock → stag, peace → hare; pinch-carry the hare to the lion; carry the lion to the well; fist → open roar; leap; ending | Pass (several full runs; `scripts/dev/demo-take.sh` completes to `tale-end`) |
| Second tale, *The Hare in the Moon* | In-page choreography (`scripts/dev/choreo.js`, segments `moon1` and `moon2`): returning-visitor save → menu names the tale → peace → hare, open → peacock, traveller summoned, fist → open lights the fire, pinch-carry the hare to the fire, glow, hare leaps to the moon, silhouette saved | Pass. `tale-end` reached; `moonHare` saved; moon shows the silhouette. |
| Tale assists | Beats left alone complete through their auto-assist | Pass (seen in a run whose gestures failed, which still reached `tale-end`) |
| Open stage, all species | claw, rock, open, fist, point → lion, stag, peacock, tortoise, snake | Pass |
| Persistent stage | Place stage → reload → re-enter while looking elsewhere → stage restored at the same centre; subtitle "your stage is where you left it" | Pass (IWER's persistent anchor implementation) |
| Hand tracking lost | Code path only (prompt after 2.5 s) | Not exercised |
| Paper-screen fallback | Code path only (pinch with no wall in gaze after 1.2 s) | **Not exercised in the emulator.** The room's walls surround the viewer. |
| Pause (`visible-blurred`) | Code path only | Not exercised |
| Audio | Code compiles and runs. Headless capture has no audio output. | **Not listened to.** Levels unverified. |

## Bugs found and fixed during testing

- Lantern at the floor origin: IWSDK replaces an entity's `position` vector, so the cached reference was stale.
- Wall art chosen as the stage: added semantic label filtering.
- Shadows magnified about 10× on far walls: added the magic-lantern focal point.
- Text and buttons unreadable: text resized to angular targets; buttons redesigned as ink medallions.
- A held pose woke a creature while pressing a button: buttons suppress awakening, and hands lock after a press.
- Creatures wandered away during carry beats: added calm mode in tales.

## Performance

- Not measured on Quest. The frame budget on Quest 3 at 72–90 Hz is 11–14 ms; the design keeps per-frame work small (see `ARCHITECTURE.md`).
- Emulator frame rate on the development Mac is not representative of Quest and is not reported as a Quest figure.

## Needs physical hardware

1. Hand-shape classification on real tracked hands. Thresholds are tuned to IWER's poses, and real hands vary.
2. Quest Browser plane detection, semantic labels and the permission flow, in rooms with and without Space Setup.
3. Persistent anchors in Quest Browser (`requestPersistentHandle` / `restorePersistentAnchor`).
4. Frame rate on Quest 3 and 3S (60 fps minimum).
5. Legibility and comfort: text size, stage size, lantern position for a seated adult.
6. Audio levels and spatialisation.
7. Passthrough compositing: dimming strength and contrast of the light on real walls of different colours.
