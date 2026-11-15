# Video shot list

**Source footage:** `scripts/dev/demo-take.sh` performs the whole first-run journey in the IWER emulator, and `scripts/dev/record-chunks.sh` captures it at 1920×1080, 30 fps. The rough cut `media/chhaya-emulator-take.mp4` is built from these frames (see the last section). Every shot below is in that capture unless marked *Quest only*.

| # | Shot | Source and timing in the take | Framing | Duration | Transition |
| -: | --- | --- | --- | --: | --- |
| 1 | Room dims, "The lights go down…" | take 0:00–0:04 | Static head view of the living room | 4 s | Fade in from black |
| 2 | Head turns from the side wall to the far wall; reticle appears | take 0:04–0:09 | Head pan, minimum-jerk | 5 s | Cut |
| 3 | Pinch; light pools; "Chhaya" title | take 0:09–0:16 | Hold | 7 s | Cut |
| 4 | Open hand rises; shadow appears | take ~0:17–0:21 | Hand enters from bottom right | 4 s | Cut |
| 5 | Hand moves toward the lantern: shadow grows and softens, then sharpens | take ~0:21–0:25 | Hold | 4 s | Cut |
| 6 | Peace sign: ember rim, hare awakens, toast | take ~0:25–0:30 | Hold | 5 s | Cut |
| 7 | Menu; shadow covers "Hear a tale"; ring fills | take ~0:35–0:41 | Hold | 6 s | Dip to black |
| 8 | Tale title over the forest growing out of the ground | following | Hold | 5 s | Cut |
| 9 | Claw becomes the lion | following | Hold | 6 s | Cut |
| 10 | Rock becomes a stag; the animals plead | following | Hold | 6 s | Cut |
| 11 | Hare made at the right edge | following | Hold | 4 s | Cut |
| 12 | Pinch-carry the hare to the lion; "You are late!" roar | following | Hold | 8 s | Cut |
| 13 | Well rises; carry the lion to it | following | Hold | 8 s | Cut |
| 14 | Reflection ring; fist snaps open; roar and echo | following | Hold | 6 s | Cut |
| 15 | Lion leaps; "Wit is stronger than strength." | following | Hold | 8 s | Dip to black |
| 16 | Open stage with several creatures and a hint | separate capture (`open-stage`) | Hold | 8 s | Cut |
| 17 | Landing page with progress | browser capture of the live site | Static | 5 s | Cut |
| 18 | End card: Chhaya, URL, "Hands only · Seated · Quest 3 / 3S" | Make in an editor with Fraunces type on #0d0a08 | Static | 5 s | Fade out |
| Q1 | *Quest only, optional:* real hands in passthrough casting the shadow on a real wall | Quest screen recording (Meta Quest settings → Camera → Record video) | First person | 6–10 s | Use as the opening hook if available |

## Building the rough cut from captured frames

```bash
# Frames are in /tmp/chhaya-rec/{a,b,c}NNNNNN.jpg at ~30 fps.
ffmpeg -framerate 30 -pattern_type glob -i '/tmp/chhaya-rec/*.jpg' \
  -c:v libx264 -pix_fmt yuv420p -crf 20 media/chhaya-emulator-take.mp4
```

Upload the final edit to YouTube or Vimeo as **Public**: the rules require the video to be "publicly visible", so do not rely on Unlisted. Paste the link into Devpost.
