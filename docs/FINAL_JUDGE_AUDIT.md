# Final judge audit

A self-assessment written as a demanding judge would score it, on 15 November 2026. Scores are out of 100 per criterion; the criteria are equally weighted.

| Criterion | Score | Why |
| --- | ---: | --- |
| Innovation & Creativity | **80** | The core idea is fresh and memorable: shadows on *your* wall from *your* hands, with a held shape becoming its own creature. It combines hands, passthrough, scene understanding and persistent anchors in service of one idea. Points off because Silhouette (2023) already put hand shadows to work in VR, and because there are only two short tales. |
| Experience Design | **76** | Payoff in the first minute with no instruction screens. Seated, one-handed, inside a comfortable field of view, no fail states, assists everywhere, and an interface made of the theater itself. The room meaningfully changes the experience: stage placement, size and persistence. Weaknesses: unknown comfort and legibility on a real headset; the button dwell may feel slow to some; the return loop is modest (eight shapes, two tales, the moon keepsake). |
| Technical Implementation | **68** | A custom contact-hardening shadow pipeline, semantic wall selection, persistent anchors, a classifier tuned against platform pose data, robust fallbacks. Points off because nothing has run on Quest hardware: frame rate, real-hand recognition and Quest Browser anchor behaviour are unverified. A judge will test on a Quest 3, and any device-only bug costs heavily here. |
| Polish & Presentation | **74** | Coherent lamp-black and lantern-gold art direction, typography sized by angle, a procedural lantern, synthesized sound, a clean landing page, complete docs. Points off because the video is not yet edited and narrated, the audio mix was never heard, and the emulator footage shows the emulator's outline hands rather than real passthrough hands. |
| **Weighted total** | **≈ 75** | Competitive for a track placement if it runs well on device; at risk if device behaviour differs from the emulator. |

## Biggest weaknesses, in priority order

1. **No hardware test.** This is the single largest risk. Ten minutes on any Quest 3/3S would verify:
   - entry
   - wall detection
   - a hare
   - a button press
   - a carried creature
   - frame rate (Quest Browser's performance HUD or OVR Metrics Tool)
2. **Real hands vs emulator poses.** Curl thresholds may be too strict or too loose on real hands. The design mitigates it (wisps, assists), but recognition quality drives the delight.
3. **Video.** It must be edited under 3 minutes with narration and captions, and must lead with the strongest moment: the shadow coming alive.
4. **Return loop depth.** Two tales and a moon keepsake. A schedule (one new tale per evening) would make the loop stronger.

## Disqualification-risk audit

| Question | Answer |
| --- | --- |
| Is it a genuine VR/MR application? | Yes. An `immersive-ar` WebXR session on Quest Browser with passthrough, hands and planes. |
| Does it fit the chosen track? | Entertainment: immersive storytelling and spatial audio, hands-first. Yes. |
| Hands-first end-to-end? | Yes. No controller input is used anywhere. |
| Seated? | Yes. Everything is within arm's reach and on one wall in front of you. |
| Correct division? | New Experience: the repository was created on 15 November 2026 from the public IWSDK starter, with no pre-existing code. Git history shows it. |
| Original? | Yes. The concept, code, visuals and sound are original. The story is a public-domain fable. |
| Third-party assets licensed? | IWSDK starter and IWER pose data (MIT, Meta). Fraunces and Manrope (OFL). No other assets. |
| Uses only public tools? | Yes. IWSDK 1.1.0 and IWER 2.8.0 are public npm releases. |
| Content rating | Suitable for 10+. The lion's fate is told off-stage, as in the fable. |
| Identifiable people, brands, logos? | None. |
| Accessible to judges? | Yes. A public HTTPS URL, free, no login. It must stay up until winners are announced. |
| Eligibility | **Unverified:** the entrant's Meta VR Start membership and Developer Access must be confirmed before submitting (see `SUBMISSION_CHECKLIST.md`). |
| Is the demo honest? | The footage is emulator capture of the real build and is labelled as such. No AI-generated video. |
| Unsupported claims? | The docs state that hardware testing has not happened and that performance has not been measured on a Quest. |
