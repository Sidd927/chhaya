# Devpost submission copy

Paste-ready text. Everything here describes features that are implemented in the repository. The testing caveats under "Testing instructions" must stay.

**Project title:** Chhaya — a shadow theater for your hands

**Tagline (≤140 characters):** A lantern throws your hands' shadows onto your own wall. Hold a shape still, and it comes alive and acts out a fable.
*(118 characters)*

**Track:** Entertainment
**Division:** New Experience

**Link to project:** https://sidd927.github.io/chhaya/ (IWSDK / WebXR, open in Meta Quest Browser)
**Code:** https://github.com/Sidd927/chhaya

---

## What it is

Chhaya (छाया, "shadow") is a mixed-reality shadow-puppet theater for Meta Quest 3 and 3S, played entirely with your hands while seated.

You look at a wall in your room and pinch. That wall becomes the stage, and a small paper lantern appears within reach. Raise a hand and its shadow falls on your real wall, larger and softer as you move toward the lantern, crisper toward the wall.

Hold a shape still and the shadow breathes, glows at its edges, and comes alive: a hare from two fingers, a lion from a claw, a stag from index and little finger, a peacock from a spread hand. Every creature keeps the exact silhouette of the hand that made it.

Then the lantern tells a story: *The Lion and the Clever Hare* from the Panchatantra. You perform every character:
- carry the hare to the lion by pinching its shadow
- lead the lion to an old well
- snap your hand open to make him roar, and his reflection roars back.

Afterwards the stage is yours, with eight shadows to discover. Your theater remembers your wall the next time you visit.

## Inspiration

Almost everyone has made a hare on a wall with a torch. Shadow puppetry is one of the oldest ways people have told stories: Tholu Bommalata in Andhra Pradesh, Chinese shadow theater, Victorian *ombromanie*. It never had an answer to "and then what?", because the shadow always stays a shadow.

Mixed reality lets me keep everything that is real about the ritual (your hands, your wall, a lamp in your room) and add the one impossible thing: the shape you hold walks away. I wanted an experience whose core falls apart on any other platform: no wall, no light between you and it, no hands, no Chhaya.

## How we built it

- **Immersive Web SDK 1.1.0** (Three.js r185), as an immersive-ar WebXR session with hand tracking, plane detection and anchors requested as optional features. It is deployed to GitHub Pages and needs no install.
- **Hand reading:** all 25 joints per hand from `XRFrame.getJointPose`.
  - Shapes are classified by per-finger curl and spread. Thresholds were tuned against the hand pose library in Meta's IWER emulator, so a relaxed hand reads as nothing.
  - Pinch uses hysteresis; stillness and an "open burst" roar gesture are derived from joint motion.
- **The shadow pipeline:**
  - Each hand is 27 capsules projected from the lantern onto the wall plane.
  - Hands, creatures and scenery are rendered as signed-distance capsules into one mipmapped render target that stores coverage, occluder depth, creature eyes and an ember rim.
  - The wall shader adds lantern irradiance and contact-hardening penumbra, chosen from the mip chain by blocker depth, over passthrough.
- **A "magic lantern":** a real point light 30 cm from your hand would magnify its shadow about 10× on a far wall. The light is focused from a point behind the visible lantern so shadows stay framed on any wall, while still growing and softening as you approach the lantern.
- **Scene understanding:** only planes labelled `wall` are offered (wall art, windows and doors are skipped). Head-gaze picks the wall and a pinch confirms. A paper screen appears when no wall is in view.
- **Persistence:** the stage is anchored with WebXR anchors and a persistent handle, then restored onto the same wall on the next visit. Discovered shadows are saved on the headset.
- **Interface made of light:** you choose by covering an ink medallion with your hand's shadow (a dwell ring fills) or by pinching while covering it. There are no floating panels or rays.
- **Sound:** synthesized at runtime with WebAudio: a tanpura drone, bell tones, and HRTF-panned creature calls positioned on your wall. No audio files ship.
- **Art direction:** lamp-black and lantern-gold, Fraunces and Manrope (OFL) typography sized by viewing angle, a procedural paper lantern. No stock art or AI imagery.

## What makes it unique

- Passthrough is the point, not decoration: your real wall is the stage and your real hands are the cast.
- Shape becomes creature: whatever you hold still comes alive with your hand's own silhouette, so recognition never "fails" into nothing.
- The whole interface is shadows: choosing, carrying and performing all happen through the shadow you cast.
- Seated, hands-only, satisfying within the first minute, with a complete story inside ten.

## Hand interaction implementation

| Gesture | Meaning |
| --- | --- |
| Pinch | Choose a wall, pick up a creature's shadow or the lantern, accept a story assist |
| Hold a shape still (about 1.1 s) | Wake a creature (eight species) |
| Cover with your shadow | Press a light button (1.1 s dwell, armed only after first being uncovered) |
| Pinch and move | Carry a creature along the wall; drop it off-stage to send it away |
| Close your hand, then snap it open | Roar |
| Brush a creature with your shadow | It hops |

Every story beat has an assisted path (a pinch, or simply waiting) for people who can't form a shape.

## Accessibility

Accessibility features:
- One hand is enough.
- Seated within a 2 ft radius.
- Captions for all narration.
- High-contrast light and shadow.
- No timed fail states; an assist is offered at every step.

## Future plans

- More tales from the Panchatantra and Jataka (*The Tortoise and the Geese*, *The Monkey and the Crocodile*), one unlocked per evening.
- Two-handed creatures (a bird from crossed thumbs).
- Shared stages: a parent and child performing together.
- Recording and replaying your own shadow plays.
- Shadows that fall across real furniture using the scene mesh.
- Voice narration.

**Target launch date:** March 2027, as a free web app with an optional Horizon Store listing. *[Proposed: confirm or change before submitting.]*

## Testing instructions

1. On a Quest 3 or 3S, optionally complete Space Setup so walls are detected.
2. Open `https://sidd927.github.io/chhaya/` in Meta Quest Browser.
3. Press **Enter the theater** and allow hand tracking and spatial data if asked.
4. Put the controllers down, sit facing a wall, look at it and pinch.
5. Raise a hand into the light. Try two fingers up, a claw, a spread hand or a fist, and hold still.
6. Cover **Hear a tale** with your hand's shadow for the story (about 6 minutes), or **Open stage** to play freely.

To reset progress, clear site data for `sidd927.github.io` in Quest Browser settings.

*Development note: Chhaya was developed and tested in Meta's Immersive Web Emulator (IWER 2.8, Quest 3 profile, scanned living-room environment). [Replace this note if it has since been tested on a physical Quest.]*

## Built with

Immersive Web SDK (IWSDK), WebXR (hand input, plane detection, anchors), Three.js, TypeScript, Vite, WebAudio, GLSL, GitHub Pages, IWER (Immersive Web Emulator).
