# Idea evaluation

Twelve directions were considered before any code was written. Each is scored out of 100 on the weights below. The scores are judgement calls made with the constraints of the time: about 75 hours remaining, one developer, no headset, and no Unity installed. Prior-art checks were web searches, not store audits.

| Dimension | Weight |
| --- | ---: |
| Innovation and differentiation | 20 |
| User value and relevance | 15 |
| Spatial computing necessity | 15 |
| Hands-first interaction potential | 15 |
| Experience design potential | 10 |
| Technical feasibility (in time, without hardware) | 10 |
| Competitive positioning | 10 |
| Demo and presentation potential | 5 |

## Candidates

| # | Concept | Track | Innov. /20 | Value /15 | Spatial /15 | Hands /15 | XD /10 | Feas. /10 | Position /10 | Demo /5 | **Total** |
| -: | --- | --- | -: | -: | -: | -: | -: | -: | -: | -: | -: |
| 1 | **Shadow theater on your real wall**: held hand shapes become creatures that act out a fable | Entertainment | 16 | 10 | 14 | 15 | 9 | 8 | 7 | 5 | **84** |
| 2 | Mixed-reality memory palace: memorise lists by placing items around your own room, spaced recall | Productivity | 13 | 13 | 14 | 9 | 8 | 6 | 6 | 3 | **72** |
| 3 | Desk-scale marble run built from your table's real geometry | Gaming | 10 | 8 | 12 | 12 | 7 | 6 | 4 | 4 | **63** |
| 4 | Wind-down worry journal: write worries as cards, crumple and burn them in a fire on your floor | Productivity | 11 | 11 | 9 | 11 | 8 | 5 | 6 | 3 | **64** |
| 5 | A small ecosystem that grows on your desk across days | Entertainment | 9 | 9 | 11 | 10 | 8 | 6 | 3 | 4 | **60** |
| 6 | Fingerspelling tutor with live hand-shape feedback | Productivity | 11 | 12 | 8 | 14 | 7 | 3 | 6 | 3 | **64** |
| 7 | Room-as-instrument music toy | Entertainment | 6 | 9 | 13 | 12 | 8 | 7 | 2 | 4 | **61** |
| 8 | Tabletop strategy diorama on your real table | Gaming | 6 | 8 | 12 | 11 | 8 | 4 | 2 | 4 | **55** |
| 9 | Spatial Kanban on your wall | Productivity | 5 | 10 | 9 | 8 | 7 | 7 | 3 | 2 | **51** |
| 10 | Breathing/focus orb ritual | Productivity | 4 | 9 | 5 | 6 | 6 | 9 | 2 | 2 | **43** |
| 11 | Silhouette-matching puzzle: make your hands' shadow match a target outline | Gaming | 12 | 7 | 12 | 15 | 7 | 8 | 4 | 4 | **69** |
| 12 | Furniture-shadow stealth game: creatures that live in the shadows of your real furniture | Gaming | 18 | 7 | 15 | 11 | 7 | 2 | 8 | 5 | **73** |

## Notes on the serious candidates

**1. Shadow theater (chosen).**
- *Strengths:*
  - Hands are the medium itself, not merely a pointer: your hand casts the shadow, and its shape becomes the creature.
  - It needs a real wall (plane detection), real hands (25-joint tracking) and a light you can move, so it falls apart off-platform.
  - Seated by nature, with a payoff within seconds. The look comes from light and silhouettes, which need no art assets.
  - It touches several special awards: First Five Minutes, Boldest Original Concept, Reason to Come Back (a collection of shapes and a remembered stage).
- *Risks:*
  - **Silhouette** (2023) already uses hand shadows in VR, which costs points on innovation and positioning. Chhaya differs in what matters to these criteria: it runs in passthrough on the user's own wall, every held shape is itself the creature, and the format is storytelling.
  - Shape recognition can't be validated on real hands without a headset. Mitigations: classify by finger curl only (robust), tune against IWER's captured poses, and never block progress on recognition. Any held shape wakes *something*, and every story beat has an assisted path.

**2. Memory palace.**
- *Strengths:* strong user value and a strong case for using the user's own room. The method of loci traditionally uses a familiar home.
- *Weaknesses:*
  - **LOCI — Memory Palace Trainer** is already on the Meta Store (VR), and HoloLens apps did mixed-reality loci earlier.
  - It needs many vivid 3D objects, an art cost.
  - It needs text entry, which is awkward in immersive WebXR.
  - Its demo is harder to grasp in 30 seconds.

**12. Furniture-shadow stealth.**
- *Strengths:* the most original idea, with the best "only possible here" story.
- *Weaknesses:* gameplay on arbitrary scanned room meshes is a design problem that can't be validated without hardware in three days. Kept as a future direction for Chhaya's open stage.

**11. Silhouette matching.** Too close to Silhouette and to mobile shadow-puzzle games.

## Decision

**Chhaya (concept 1).**
- It has the highest score, it is the most demo-able, and the risk is manageable without hardware.
- Its weaknesses are known and addressed in the design: prior art, plus recognition accuracy on real hands.
