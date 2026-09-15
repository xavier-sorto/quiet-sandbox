# The Quiet Sandbox

A **calm-tech** web app for children under 5 — a low-sensory, gently interactive
play space for the times a busy parent has their little one in tow (waiting
rooms, cars, appointments). No flashing rewards, no points, no timers, no
win/lose, no autoplay loops. Just quiet, tactile exploration in muted natural
colors with soft sounds.

## The three activities

| Activity | What the child does | Quiet learning |
|----------|---------------------|----------------|
| **Balancing Branch** | Drags woodland animals onto a branch and watches it tip | Weight, balance, counting, cause & effect |
| **Sifting Box** | Sweeps sand away with a finger to uncover a hidden letter, number, or shape | Letters, numbers, shapes, fine-motor control |
| **Water Stream** | Drops stones, leaves, and twigs to redirect a flowing current | Cause & effect, spatial reasoning |

## Running it

It's a plain static website — no build step, no dependencies. From this folder:

```bash
python -m http.server 8000
```

Then open **http://localhost:8000/** in a browser (works great on a tablet).

Any static file server works just as well; a server is only recommended over
opening `index.html` directly so browsers don't restrict local file access.

### Publishing to GitHub Pages (optional, later)
All paths are relative and there's no backend, so you can push this folder to a
repo and enable GitHub Pages — no changes needed.

## How the calm-tech promise is kept
- **Muted palette** — sandy beige, forest green, river-stone grey, warm wood. No neon.
- **Slow motion** — gentle eased transitions, no fast flashing.
- **No traps** — no pop-ups, stars, cheering, scores, or timers.
- **Gentle sound** — soft brushing, wood clinks, and trickling water, generated
  in-browser (no audio files). On by default; begins on first touch (a browser
  rule) with an obvious mute toggle in the top-right that remembers your choice.
- **Fine-motor first** — slow dragging over frantic tapping; large touch targets.
- **Nothing is ever lost** — no fail states; a child can stop any time.

## Project layout
```
quiet-sandbox/
  index.html            The Quiet Garden (home screen)
  activities/
    balance.html        Balancing Branch
    sift.html           Sifting Box
    stream.html         Water Stream
  css/style.css         shared palette + calm transitions
  js/
    palette.js          shared colors for canvas drawing
    core.js             pure, tested logic (tilt math, particle deflection)
    audio.js            procedural Web Audio soundscape + mute
    shapes.js           code-drawn woodland creatures
    nav.js              shared back button, mute button, canvas sizing
    home.js  balance.js  sift.js  stream.js
  tests/test.html       open in a browser to run the core unit tests
```

## Tests
Open **http://localhost:8000/tests/test.html** — it runs the pure-logic unit
tests (balance tilt and water deflection) and prints pass/fail. All should pass.

## Deliberately left for later
Offline (PWA) packaging, native app-store versions, per-child profiles, richer
hand-drawn art, and more activities. This first version is intentionally the
simplest thing that plays well and presents cleanly.
