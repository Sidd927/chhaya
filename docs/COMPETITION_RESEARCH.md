# Competition research

Research for the Meta VR Start Developer Competition 2026, gathered on 15 November 2026. Primary sources are linked inline; anything not verified is marked as such.

## Sources

| Source | URL | Read |
| --- | --- | --- |
| Competition overview | https://start-developer-competition-26.devpost.com/ | 2026-11-15 |
| Official rules | https://start-developer-competition-26.devpost.com/rules | 2026-11-15 |
| Judging criteria | https://start-developer-competition-26.devpost.com/details/judging | 2026-11-15 (text matches rules §6) |
| FAQs | https://start-developer-competition-26.devpost.com/details/faqs | 2026-11-15 |
| 2025 winners | https://developers.meta.com/horizon/blog/meta-horizon-start-developer-competition-meet-the-winners/ | 2026-11-15 |
| Start program | https://developers.meta.com/vr/discover/programs/start/ | 2026-11-15 |
| IWSDK project setup | https://developers.meta.com/horizon/documentation/web/iwsdk-guide-project-setup | 2026-11-15 |
| IWSDK build and deploy | https://developers.meta.com/horizon/documentation/web/iwsdk-guide-build-deploy | 2026-11-15 |
| npm: `@iwsdk/core` 1.1.0, `iwer` 2.8.0 | https://www.npmjs.com/package/@iwsdk/core | published 2026-11-13 / 2026-11-04 |

## Dates

- Entry period: 24 September 2026, 10:00 PT, to **18 November 2026, 12:00 PT** (19 November 2026, 01:30 IST).
- Judging: on or around 18 November to 9 December 2026. Winners announced on or around 11 December 2026.
- After the entry period ends, an entry may not be changed. Judging uses its state at the deadline (rules §4).

## Eligibility (rules §2)

All of the following must hold:

- Entrants must be at least 18 and the age of majority where they live.
- Residents of Brazil, Quebec, or any area under comprehensive sanctions are excluded (Crimea, Russia, Cuba, Iran, North Korea, Syria, or anyone OFAC designates). **India is not named.** The FAQ adds that what counts is legal residence plus a bank account in an eligible country.
- Entrants need an active Meta account **with Developer Access enabled** by the time of submission.
- The person submitting must be a **member of the Meta VR Start program** by the time of submission. Apply at https://developers.meta.com/vr/discover/programs/start/. The competition page estimates 5 minutes to apply. Approval time is not published.
- One entry per individual.
- Projects funded by Meta under a separate agreement are excluded.

**Not verified in this session:** whether the entrant's Meta account already has Developer Access, and whether the entrant is a Start member. Neither can be checked from outside their account. See `SUBMISSION_CHECKLIST.md`.

## What an entry must be (rules §4)

- A VR/MR application built for Meta VR devices. **Judges review on Meta Quest 3 or 3S** (FAQ).
- It must fit a track:
  - **Entertainment:** lean-back media and content, including spatial cinema, music visualization, immersive storytelling and spatial audio. Hands-first is required.
  - **Gaming:** hands-first.
  - **Productivity:** daily moments and habits.
- It must fit a division:
  - **New Experience:** conceived and built within the window, with no pre-existing codebase.
  - **Adapted / Significantly Updated:** an existing project with a meaningful new feature, mode, or platform integration.
- Experience requirements, each paired with its "test":
  - Fully usable with hands end-to-end ("can someone finish without pairing a controller?").
  - Seated/stationary, the "airplane seat test" (2 ft radius).
  - Fast cold start, clean pause/resume, satisfying in ≤10 minutes ("one bus stop test").
  - Original, not a wrapper ("take it away test").
- Delivery:
  - IWSDK/WebXR entries submit **a link**; GitHub Pages is suggested, and other hosts are allowed.
  - Engine builds go to a "Competition" release channel.
- Video: under 3 minutes, publicly visible on YouTube or Vimeo. Footage must come from a Quest device **or the XR Simulator or another equivalent emulator**. The FAQ names Meta XR Simulator, Meta Spatial Simulator and the Immersive Web Emulator.
- Text: inspiration, how it was built, future plans, a target launch date, plus the track and division.
- Content must be in English or subtitled, appropriate for 10+/13+/18+ ratings, and contain no identifiable people, brands or logos. Third-party assets must be licensed.
- The project must stay free and accessible until winners are announced.

## Judging (rules §5–6)

- Stage one is a pass/fail check that the project fits the theme and uses the required tools.
- Stage two scores four equally weighted criteria (25% each):

| Criterion | What the rules say high scorers do |
| --- | --- |
| Innovation & Creativity | Differentiate, show ingenuity, and *uniquely leverage* device capabilities (spatial depth, hands-first, gaze, passthrough, scene understanding, persistent anchors) **to drive repeat usage**. |
| Experience Design | Seated, hands-first design with intuitive navigation, clear onboarding and a habit-forming purpose. **Passthrough must be purposeful: "the player's real room meaningfully changes the experience."** FoV-aware design, with essential UI in a narrower comfortable FoV. |
| Technical Implementation | Reliability and strategic use of hand tracking, passthrough, anchoring and FoV-aware design, **at 60 fps minimum on Quest**. For passthrough: scene understanding, anchoring to detected planes, and "holding up in rooms the developer never tested." |
| Polish & Presentation | Cohesive UI/UX, art direction and sound. A video that shows real use honestly; "don't lean on AI-generated video." |

AI tools may assist judging, but human judges make the final decisions.

## Prizes

- Each track × division has prize tiers; the overview cites a top prize of $100,000.
- Special awards are $25,000 each:
  - Best Social & Multiplayer
  - Best Agentic Interaction
  - Best Reason to Come Back
  - Best First Five Minutes
  - Best Accessibility Forward
  - Boldest Original Concept
- Two Judges' Choice awards of $20,000.
- Limit one prize per entry.

## Previous winners (2025)

The winners post names 32 awards but describes only a few. What it shows:

- **Entertainment winner: DreamSpace**, which turns any room into immersive mixed-reality spaces. **Lifestyle winner: Inkphony**, which turns everyday surroundings into instruments. Both use the user's *own room* as material.
- **Casual winner: Tiny Golf**, mixed-reality mini golf controlled with a pinch, with courses you can build.
- **Best IWSDK experiences: The Nanauts and Dun Jun.** A WebXR entry can win.
- Three awards went to hand interactions (Hand Survivor, Pocket Lands, Awesome Hand) and three to passthrough camera access with AI.

Pattern: winners make the real room, or the real hands, *the content*, not a backdrop.

## Competitive landscape for the chosen concept

- **Silhouette** (Team Panoptes, Quest, January 2023) is a hand-tracking puzzle game in VR. You manipulate light to cast hand shadows that act as platforms for shadow creatures; a "finger gun" shadow is a tool. It is the closest prior art. Coverage: [UploadVR](https://www.uploadvr.com/silhouette-vr-out-now-quest/), [Android Central](https://www.androidcentral.com/gaming/virtual-reality/quest-hand-tracking-still-sucks-but-at-least-silhouette-makes-good-use-of-it). Reviews praise the idea and cite hand-tracking glitches. The coverage found describes no passthrough or mixed reality.
- Hand-shadow puppetry is a centuries-old folk art, from Indian *Tholu Bommalata* and Chinese shadow play to Victorian *ombromanie*. The cultural form is public, and no product owns it.
- The searches found no Quest app that throws hand shadows onto the user's real wall in passthrough, nor one that turns a held hand shape into an autonomous creature. This is a limited web search, not an exhaustive store audit.

The alternatives considered, and their prior art, are in `IDEA_EVALUATION.md`.

## Technology findings

- No Unity, Unreal or Quest tooling is installed on the development machine, and no headset is confirmed.
- The latest IWSDK is 1.1.0, released 13 November 2026. It covers:
  - AR sessions with plane, mesh and anchor features
  - hand tracking
  - a `SceneUnderstandingSystem`
  - a gaze system (for glasses)
  - a CLI that drives the IWER emulator.
- IWER 2.8 emulates Quest 3:
  - 24 named hand poses (including `peace`, `claw`, `rock`, `open`, `flat`, `fist`, `point`) with per-finger blending
  - persistent anchors
  - eight scanned rooms with labelled planes (`wall`, `wall art`, `window`, `door`…).

  This makes hand-shape and wall-placement features testable without hardware.
- IWSDK requests session features as optional unless marked `required`, so a denied plane or anchor permission does not abort the session.
