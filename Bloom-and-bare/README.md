# Bloom & Bare — Website

An education-first website for a premium nail business. The philosophy: teach the
emotional, psychological, and health case for professional nails *before* asking
anyone to book or buy — then give them enough interactive reasons to keep coming
back between appointments.

Static site. No build step, no backend required to run it. Open `index.html` in a
browser, or host the folder anywhere that serves static files.

---

## Pages

| File | Purpose |
|---|---|
| `index.html` | Homepage — hero, Daily Vibe Check, psychological reframe, education preview, CTA |
| `why-nails.html` | Education hub — psychology, nail health/protection, time-savings comparison |
| `quiz.html` | Nail Style Finder — 2-question quiz, personalized result, save + share |
| `mixer.html` | Look Mixer — build a custom shape/color/finish combo, save to journal |
| `lookbook.html` | Filterable gallery by vibe (Corporate / Bold / Clean Girl) + global shop section |
| `mynails.html` | "My Nails" hub — Regrowth Tracker + Nail Journal, in tabs |

All pages share:
- `style.css` — design tokens (colors, type), the nail-shape marker system, and all component styles
- `script.js` — every interactive feature (quiz, mixer, tracker, journal, vibe check, lookbook filter/hearts, nav)

---

## Design system

- **Palette:** cream `#FBF6EF`, blush `#F1D9D6`, nude `#E4C3A3`, deep rose `#B15C6A`
  (CTAs), charcoal `#2B2622`, muted gold `#AD8A55`. All defined as CSS variables at
  the top of `style.css` and mirrored into `tailwind.config` on each page.
- **Type:** Fraunces (display/serif headings) + Manrope (body). Loaded via Google Fonts.
- **Signature element:** nail-shape silhouettes (almond, coffin, oval, square) are
  used as bullets, dividers, and icons throughout — `.nail-mark--{shape}` classes in
  `style.css` — instead of generic numbered markers. It's the one visual idea that
  ties every page back to the actual product.
- **Framework:** Tailwind CSS via CDN (`cdn.tailwindcss.com`) for layout/spacing/type
  utilities, with custom CSS (`style.css`) for anything bespoke (buttons, cards,
  the quiz, the tracker ring, etc).

---

## Interactive / retention features

These are what turn the site from a brochure into something people open on their
own, between visits. All of it currently runs on browser `localStorage` (see
**Storage architecture** below).

**Nail Style Finder (`quiz.html`)**
Two questions → a 16-combination result matrix (4 lifestyle × 4 aesthetic answers).
Each result includes a "Save to My Nails" button and a "Share My Result" button
that draws an Instagram-story-shaped (1080×1920) PNG on a `<canvas>` and downloads it.

**Look Mixer (`mixer.html`)**
Pick a shape, color, and finish; see a live preview built from the same nail-mark
system used elsewhere on the site. Saves combos to the journal.

**Regrowth Tracker (`mynails.html`, Tracker tab)**
User logs their last appointment date + set type once. An SVG progress ring counts
down the days left in that set's typical cycle (soft-gel: 14 days, acrylic: 21 days,
press-on: 14 days), with status copy that escalates from "you're all set" through
"time to book your fill" to "overdue." This is the one feature tied to an actual
recurring, predictable event, so it's the strongest reason to return.

**Nail Journal (`mynails.html`, Journal tab)**
A saved-looks board. Anything saved from the quiz, the mixer, or a lookbook heart
lands here, with a remove option per item.

**Daily Vibe Check (homepage)**
A one-tap mood → nail-pairing suggestion that resets daily and tracks a
day-streak. Encourages a daily habit of opening the homepage, the way a horoscope
or word game does.

**Lookbook hearts (`lookbook.html`)**
Every gallery card has a heart toggle that saves/removes it from the journal,
using the same shared save function as the quiz and mixer.

---

## Storage architecture (read this before adding accounts)

There's no backend yet, so all of the above persists in the browser via
`localStorage`, scoped to one device. Every feature reads and writes through
exactly two helper functions in `script.js`:

```js
bb_get(key, fallback)   // read
bb_set(key, value)      // write
```

Nothing else in the tracker, journal, mixer, quiz, or vibe check talks to storage
directly — they only call `bb_get`/`bb_set` (and the shared `bb_journalSave` /
`bb_journalRemove` / `bb_journalGet` wrappers for journal data specifically).

**When real accounts ship:** swap the internals of those functions for API calls
(e.g. `fetch('/api/user-data/' + key)`), and everything built on top of them —
tracker, journal, streaks, saved looks — starts syncing across devices with no
changes needed anywhere else.

Current storage keys:

| Key | Shape | Used by |
|---|---|---|
| `bb_journal` | array of saved-look objects | Journal, quiz save, mixer save, lookbook hearts |
| `bb_journalSeenCount` | number | Profile "new activity" dot |
| `bb_lastAppointment` | `{ date, type }` | Regrowth Tracker |
| `bb_dailyVibe` | `{ date, mood }` | Daily Vibe Check |
| `bb_vibeStreak` | `{ count, lastDate }` | Daily Vibe Check streak |

---

## Running locally

No install needed. Either:

- Open `index.html` directly in a browser, or
- Serve the folder so relative paths and storage behave exactly like production:

```bash
cd nail-site
python3 -m http.server 8080
# visit http://localhost:8080
```

## Deploying

Any static host works as-is — Netlify, Vercel, GitHub Pages, S3 + CloudFront, or
your existing hosting. Just upload the whole folder; there's no build step and no
server-side code.

---

## Known placeholders to swap before launch

- All imagery is currently solid-color blocks standing in for real photography —
  swap the `bg-*` divs in `index.html` and `lookbook.html` for actual nail photos.
- "Add to Cart," "Download," and booking buttons in `lookbook.html`'s shop section
  are static — wire them to your real commerce/booking platform.
- The 92% confidence stat on the homepage and the client-survey footnote are
  placeholder copy — replace with a real source or remove.
- `bloomandbare.com` in the quiz share-card footer is a placeholder domain —
  update in `script.js` (`bb_drawShareCard`) once the real domain is live.
