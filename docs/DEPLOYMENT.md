# Deployment

**Live URL:** https://sidd927.github.io/chhaya/

## How it is deployed

- GitHub Pages, built by GitHub Actions (`.github/workflows/deploy.yml`) on every push to `main`. The steps are `npm ci`, then `npm run typecheck`, then `npm run build`, then the `dist/` folder is uploaded with `actions/deploy-pages`.
- Pages was enabled with source "GitHub Actions". HTTPS is enforced, which WebXR requires.
- Vite builds with `base: './'`, so asset paths work under the `/chhaya/` subpath.
- There is no backend, account or API key. Save data stays in the headset browser's `localStorage`.

## Judge instructions (Quest 3 / 3S)

1. *Optional, recommended:* complete **Space Setup** in Quest settings so walls are detected. Without it, Chhaya hangs a paper screen in front of you.
2. Open the **Meta Quest Browser** and go to `https://sidd927.github.io/chhaya/`.
3. Press **Enter the theater**, or the browser's own enter prompt. Allow hand tracking and spatial data if asked.
4. Put the controllers down. Chhaya is hands-only.
5. Sit facing a wall, look at it, and pinch.

To start completely fresh on a headset that has visited before, clear the site data for `sidd927.github.io` in Quest Browser settings. That resets saved shadows and the remembered wall.

## Running locally

```bash
npm install
npm run dev        # managed dev server with the IWER emulator, https://localhost:8081
npm run build      # production build into dist/
npm run preview    # serve dist/ locally
```

To test on a Quest over USB, use `adb reverse tcp:8081 tcp:8081`, then open `https://localhost:8081` in Quest Browser.

## Before the deadline

- Deadline: 18 November 2026, 12:00 PT (19 November 2026, 01:30 IST).
- **Freeze `main` before the deadline.** Every push redeploys the live link, and entries may not change after the entry period. Create a tag for the submitted state:

  ```bash
  git tag -a submission-2026 -m "Meta VR Start 2026 submission"
  git push origin submission-2026
  ```

- After that, do not push to `main` until winners are announced (around 11 December 2026). Do further work on a branch. The site must stay up and free until the announcement.
