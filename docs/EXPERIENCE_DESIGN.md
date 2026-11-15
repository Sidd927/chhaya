# Experience design

Chhaya is designed for one person, seated, in their own room, for 5–10 minutes, using only their hands.

## Journey

| Moment | What the user sees and does | Design intent |
| --- | --- | --- |
| Landing page (Quest Browser, 2D) | Wordmark, one sentence, a hare shadow, "Enter the theater". Facts: hands only, seated, ~8 minutes, sound on. | Sets expectations in five seconds. Returning visitors see "Return to the theater" and which shadows they have found. |
| Lights down (2 s) | Passthrough dims to about 40% as a theater does. Caption: *The lights go down…* | A sense of occasion; it also makes the lantern light readable on bright walls. |
| Choose a stage | A warm reticle follows the user's gaze across real walls. *Look at a wall to be your stage, then pinch.* | Gaze + pinch, the platform's own selection idiom. Only planes labelled `wall` (or unlabelled and ≥1.2 m wide) are offered; wall art, windows and doors are skipped. |
| No wall in view | After 3 s: *No wall in view? Pinch to hang a paper screen in front of you.* | Holds up in rooms that were never scanned, or when facing a window. |
| Curtain (4 s) | Light pools on the wall, and "Chhaya" is written in light. A small paper lantern floats just below the line of sight. | The reveal is the hook. |
| First light | *Raise a hand between the lantern and the wall.* | The stage is centred where the lantern throws a hand held naturally (0.5 m out, a little below the eyes), so the first shadow lands mid-stage without any searching. |
| First creature | *Every shape you hold still comes alive. Try two fingers up for ears.* The shadow's edges glow ember while it "breathes" (1.1 s), then it shrinks onto the stage and hops away. Toast: *A hare! 1 of 8 shadows found.* | The core magic, delivered within the first minute without a tutorial screen. |
| Menu | Two ink medallions on the stage: *Hear a tale* and *Open stage*, plus a small *Move stage*. *Cover a light with your hand's shadow to choose.* | The interface is part of the theater. Selecting means covering with your shadow (1.1 s dwell with a filling gold ring); pinching while covered is a quick confirm. |
| The tale (~5–6 min) | *The Lion and the Clever Hare.* Narration below the stage; instructions in small gold capitals. The user makes a lion (claw), forest animals, then a hare. They carry the hare to the lion by pinching its shadow, lead the lion to the well, then snap their hand open to roar; the reflection roars back. | Every character is performed by the user's hands, with no fail states. Each wait offers an assist after ~22 s: *Or pinch, and the lantern will shape him for you.* It acts on its own 18 s later. |
| The End | *Wit is stronger than strength.* Then *Tell it again* / *Open stage*. | A clean ending inside ten minutes. |
| Open stage | Forest scenery. *The stage is yours.* Every 10 s a hint for an undiscovered shape: *Undiscovered: spread your hand wide.* A *Curtain* medallion returns to the menu. | Open play and collection: eight shadows to find. |
| Leaving | The Quest menu ends the session. The landing page says *You have woken 3 of 8 shadows; the rest are waiting.* | A reason to come back. |
| Returning | The stage is restored on the same wall from a persistent anchor. *Your stage is where you left it.* The tutorial is skipped. | Getting back in takes seconds. |

## Hand interactions

| Gesture | Meaning | Thresholds and safeguards |
| --- | --- | --- |
| Pinch (thumb tip to index tip) | Confirm a wall, pick up a shadow or the lantern, accept an assist, quick-press a covered button | Starts below 1.8 cm, releases above 3.4 cm (hysteresis). A pinch never wakes a creature. |
| Hold a shape still | Wake a creature | Speed below 7 cm/s for 0.25 s, then 1.1 s of a stable classification (2.6 s for an unrecognised "wisp" shape). The hand is locked afterwards until it moves or changes shape. A hand covering a button never wakes anything. |
| Cover with shadow | Press a light button | The button must have been seen uncovered first (armed). The palm's shadow must be near it, so a hand right next to the lantern, whose shadow covers everything, presses nothing. |
| Pinch a shadow and move | Carry a creature | The pick is tested in wall space against creature bounds. Drop it off-stage and it walks away. |
| Brush a creature with your shadow | It hops | Only while the hand is moving faster than 12 cm/s. |
| Close the hand, then snap it open | Roar (in the tale) | Openness below 0.4, then above 0.8 within 0.5 s. A pinch also counts. |
| Pinch the lantern and move it | Change shadow size and softness | The lantern is kept at least 45 cm from the wall. |

Shapes are read from finger curl (total bend from metacarpal to tip) and spread. Thresholds were tuned against IWER's hand pose library (`scripts/tune-shapes.ts`):

| Shape | Creature |
| --- | --- |
| index + middle up | hare |
| all fingers half bent (claw) | lion |
| index + little finger | stag |
| open, spread | peacock |
| flat, fingers together | crocodile |
| fist | tortoise |
| index only | snake |
| anything else held longer | wisp |

A relaxed hand deliberately classifies as nothing.

## Seated and field-of-view aware

- Everything happens within arm's reach and on one wall in front of the user. Nothing requires standing or turning.
- The stage spans about 50° × 31°. It is sized by wall distance (`width ≈ 0.95 × distance`, 1.3–3.4 m), so it sits inside a comfortable field of view on both Quest 3 and 3S.
- Text keeps a constant angular size: captions ≈ 2°, instructions ≈ 1.2° in capitals.
- Captions sit just below the stage, where the eyes already are, not at the edges of view.
- The lantern sits 24 cm forward and 24 cm below the eyes: visible, within reach, and out of the stage's sightline.
- A "magic lantern" focal point behind the lantern keeps shadows framed on near and far walls alike (see `ARCHITECTURE.md`).

## Error and recovery states

| Situation | Behaviour |
| --- | --- |
| Hands not tracked for 2.5 s | *Show your hands to the lantern.* Clears as soon as a hand returns. Creatures carry on. |
| No room setup or no walls | Paper screen fallback. |
| Persistent anchor not found | Wall selection after up to 6 s. |
| Anchors or planes unsupported or denied | Features are optional; the paper screen and wall gaze still work. |
| Shape not recognised | Held longer, it becomes a wisp, so something always happens. |
| User can't or won't make a shape | Assists in every tale beat; in the tutorial, a pinch summons a hare after 40 s. |
| Headset menu opened (`visible-blurred`) | Updates and audio pause; resume on return. |
| Session ends | The landing page shows progress. |
| Storage unavailable | Play continues without saving. |

## Accessibility

- One hand is enough for everything.
- A seated 2 ft radius. Assisted paths at every story beat, for users who can't form shapes.
- Captions for all narration; no information is carried by sound alone.
- High contrast is built in: warm light, near-black shadows, dark-haloed captions.
- Respects `prefers-reduced-motion` on the landing page.

Not yet done: voice input, adjustable text size, left-handed hint wording.

## Sound

All sound is synthesized at runtime; no audio files ship:

- a tanpura-like drone (Pa–Sa–Sa–low Sa on C♯), plucked sawtooth through a resonant low-pass, plus convolution reverb
- bell tones for awakenings, with a rising breath while a shape awakens
- HRTF-panned creature sounds placed where the creature stands on the wall
- a lion roar and its echo, a splash, and a wooden "tock" for confirmations.
