# Final delivery report

Prepared on 15 November 2026, about 23:00 IST. The competition deadline is **18 November 2026, 12:00 PT (19 November, 01:30 IST)**.

## Product

| | |
| --- | --- |
| Name | **Chhaya — a shadow theater for your hands** |
| Concept | A mixed-reality shadow-puppet theater. A lantern throws your tracked hands' shadows onto a real wall, held shapes come alive as creatures, and you perform two short public-domain tales. |
| Track / division | Entertainment / New Experience |
| Repository | https://github.com/Sidd927/chhaya (public, `main`) |
| Local directory | `~/Projects/chhaya` |
| Live deployment | https://sidd927.github.io/chhaya/ (GitHub Pages; HTTPS; redeploys on every push to `main`) |
| Stack | Immersive Web SDK 1.1.0, WebXR (`immersive-ar`, hand tracking, plane detection, anchors), Three.js r185, TypeScript, Vite 7, WebAudio, GLSL |

## Implemented features

1. **Lights down and stage choice.** The room dims. A gaze reticle picks a real wall (semantic label `wall`, skipping wall art, windows and doors), and a pinch confirms. A paper-screen fallback appears when no wall is in view.
2. **Persistent stage.** It is stored with a WebXR anchor and a persistent handle, and restored on later visits ("your stage is where you left it"). A *Move stage* button forgets it.
3. **Hand shadows.** All 25 joints per hand are projected from a "magic lantern" onto the wall. A custom shadow layer (SDF capsules, mipmapped) gives contact-hardening penumbra. The lantern can be pinched and moved.
4. **Shape-to-creature.** Eight species are read from finger curl and spread (hare, lion, stag, peacock, crocodile, tortoise, snake, wisp), with ember-rim awakening. A creature keeps your hand's silhouette and has its own gait.
5. **Interactions.**
   - Pinch-carry creatures through your shadow.
   - Brush them to make them hop.
   - Close the hand and snap it open to roar or light a fire.
   - The interface is ink medallions you press by covering them with your shadow, or by pinching while covered.
6. **Two tales.** *The Lion and the Clever Hare* (Panchatantra) and *The Hare in the Moon* (Jataka). Every beat has an assisted path, and there are no fail states.
7. **Return loop.** Shadows discovered (x of 8), hints for undiscovered shapes, tonight's tale, and your hare saved on the moon.
8. **Onboarding.** A first-run tutorial with no instruction screens; returning visitors skip it.
9. **Error states.**
   - The hands-lost prompt.
   - Pause and resume on the headset menu.
   - Optional session features.
   - Storage failure tolerated.
10. **Sound.** All synthesized: tanpura drone, bells, HRTF creature calls, roar, splash.
11. **Landing page.** A capability check, progress summary after each session, and the same art direction.

## Build and testing status

- `npm run typecheck` passes.
- `npm run build` passes.
- `npm run tune-shapes` passes; all expected poses classify correctly.
- The GitHub Actions deploy passes.
- **Emulator:** the full journey has been run repeatedly with emulated hands in IWER 2.8 (Quest 3 profile, scanned living room):
  - tutorial
  - menu
  - both tales to the end
  - open stage with all species
  - persistent stage restore
  - paper-screen fallback
  - return visit with the moon keepsake

  Details are in `TESTING_REPORT.md`.
- **Physical hardware: not tested.** No Quest was available. Real-hand recognition, Quest Browser plane and anchor behaviour, frame rate (60 fps target) and audio levels are **unverified**.

## Demo video status

- Real application footage was captured in Meta's Immersive Web Emulator at 1920×1080 and 30 fps:
  - `media/chhaya-emulator-take.mp4`: 2:29, first run through the end of the lion tale plus the open stage.
  - `media/chhaya-emulator-moon.mp4`: 1:22, the second tale and the moon.

  These are local files and are not committed, because of their size.
- They have no sound (headless capture) and no narration. A script and shot list are ready: `DEMO_VIDEO_SCRIPT.md`, `VIDEO_SHOTLIST.md`.
- **Still to do (you):** edit to under 3:00, record the voice-over, add music or the app audio, burn in captions, label it as emulator footage, and upload **public** to YouTube or Vimeo.

## Devpost readiness

- The copy is ready in `DEVPOST_SUBMISSION.md`. The proposed target launch date (March 2027) is marked for you to confirm.
- Images: `docs/media/` (hero, thumbnail 1200×800, title, choose-wall, awakening, menu, fire, moon, open-stage, architecture).
- The checklist is in `SUBMISSION_CHECKLIST.md`.

## Remaining manual actions (only you can do these)

1. **Eligibility:**
   - Apply for or confirm **Meta VR Start membership** (https://developers.meta.com/vr/discover/programs/start/). Do this today, because approval time is unknown.
   - Confirm **Developer Access** on your Meta account.
2. **Register** on Devpost with *Join hackathon*. Read and accept the rules yourself.
3. **If at all possible, test on a Quest 3/3S** for 10 minutes. Tell me what happens and I can fix device issues before the deadline.
4. **Video:** edit, narrate, upload publicly.
5. **Submit** the Devpost form (track Entertainment, division New Experience, link, video). Then confirm it shows as submitted.
6. **Freeze:** tag `submission-2026` and stop pushing to `main` until winners are announced (around 11 December).
7. Confirm the license (MIT is set) and the launch date.

## Known limitations

- Not tested on hardware (above).
- Two tales, eight species, single player, captions only.
- The emulator footage shows the emulator's outline hands, not real passthrough hands.

## Run it locally

```bash
cd ~/Projects/chhaya
npm install
npm run dev          # managed browser with the IWER emulator at https://localhost:8081
npm run build && npm run preview
npm run typecheck
npm run tune-shapes
```

To try it on a headset over USB, run `adb reverse tcp:8081 tcp:8081`, then open `https://localhost:8081` in Quest Browser. You can also simply use the live URL.
