# Product strategy

## Chhaya — a shadow theater for your hands

*Chhaya* (छाया) means "shadow" in Sanskrit and Hindi.

**One line:** A lantern throws your hands' shadows onto your own wall; hold a shape still and it comes alive.

## Who it is for

- People who want a short, gentle, wonder-first experience at home: an evening wind-down, sharing a headset with family, or a first mixed-reality session.
- Parents and children, for whom shadow puppetry is a familiar bedtime ritual.
- Anyone who enjoys making things with their hands but doesn't play games.

## The opportunity

- Shadow puppetry is among the oldest storytelling forms people have. Almost everyone has made a hare on a wall with a torch.
- It has never had an answer to "and then what?" The shadow stays a shadow.
- Mixed reality can keep the real part (*your* wall, *your* hands, a lamp in *your* room) and add the impossible part: the shape you hold detaches and lives on.

## Why it needs a headset

Every piece depends on the device:

- **Real wall.** The stage is a detected wall plane in the user's room, chosen by looking at it and pinching. No wall in view? A paper screen hangs in front of the user.
- **Real hands.** All 25 tracked joints per hand are projected into a shadow, and the shadow is the interface.
- **Real depth.** Moving a hand toward the lantern makes its shadow larger and softer; away from it, smaller and crisper. Penumbra is computed from occluder depth.
- **Persistence.** The stage is held by a WebXR persistent anchor and comes back on the same wall next time.

On a phone or a laptop there is no wall, no light between you and it, and no hands to cast it.

## Why hands are essential

- There is no other input: no controller, menu panel, keyboard or pointer.
- A creature is born from the exact shape of your hand.
- Choosing an option means covering a light with your hand's shadow.
- Moving a creature means pinching its shadow through your own shadow.
- The lion roars when you snap your hand open.

## Core experience

1. **Lights down.** The room dims as if in a theater.
2. **Choose a stage.** Look at a wall (a gaze reticle appears on it) and pinch.
3. **The curtain rises.** The lantern's light pools on your wall. Raise a hand and its shadow appears.
4. **The first creature.** Hold two fingers up; the shadow breathes, glows at the edges and becomes a hare.
5. **A tale.** Two public-domain tales, each 5–6 minutes, in which you summon and puppeteer every character.
   - *The Lion and the Clever Hare* (Panchatantra): the lion's reflection roars back from the well.
   - *The Hare in the Moon* (Jataka): it ends by drawing the hare *you* made on the moon, where it stays for every later visit.
6. **The open stage.** Make creatures freely and find all eight shadows. Undiscovered shapes are hinted at.

## Differentiators

- The user's real wall and real hands *are* the content; passthrough is not decoration.
- **Every shape works.** The creature keeps your hand's exact silhouette; the species only decides how it moves. Recognition can't "fail" into nothing.
- A complete, gentle narrative with no fail states, and assists at every beat.
- A distinctive look: lamp-black and lantern-gold, candle flicker, synthesized tanpura drone. No borrowed assets, AI imagery or stock audio.

## Competitive landscape

- *Silhouette* (2023, VR) uses hand shadows as puzzle platforms.
- Mixed-reality winners from 2025 (DreamSpace, Inkphony) show judges reward experiences that make the user's room the content.

Details are in `COMPETITION_RESEARCH.md`.

## Submission

- **Track:** Entertainment (immersive storytelling, spatial audio, lean-back with light interaction).
- **Division:** New Experience. The repository was created on 15 November 2026 from the IWSDK starter, with no prior code.

## Where it should score

| Criterion | Advantage |
| --- | --- |
| Innovation | Real-wall shadow theater and shape-to-creature, using hands, passthrough, scene understanding and persistent anchors together. |
| Experience design | A payoff within seconds, onboarding without walls of text, seated in a 2 ft radius, essential UI inside ±25° of the stage centre, no fail states. |
| Technical | Custom shadow pipeline (SDF capsules into one mipmapped target with contact-hardening penumbra), semantic wall selection, persistent anchors, hand-shape reading tuned against Meta's emulator pose data. |
| Polish | Coherent art direction and sound; text sized by angle. |

Special awards it could plausibly contend for: Best First Five Minutes, Boldest Original Concept, Best Reason to Come Back (a remembered stage, an eight-shadow collection, a second tale, and your hare kept in the moon).

## Known weaknesses

- **Not tested on a physical Quest.** Hand-shape thresholds, wall-plane behaviour on Quest Browser, persistent anchor support and frame rate are verified only in IWER.
- Content depth: two tales, eight creature types.
- Prior art in hand-shadow gameplay (Silhouette).
- No multiplayer and no voice narration (captions only).

## Why this has the best realistic chance

- It is the one concept that is original enough to stand out, delightful within 10 seconds, and buildable to a polished state by one person in three days.
- It turns the judges' own rubric language ("the player's real room meaningfully changes the experience", hands-first, seated) into the mechanic itself.
