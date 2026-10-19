# Adaally Slider

A dependency-free slider/carousel built to support **WCAG 2.1 AA**, for **vanilla JS** and **Shopify themes**. ~4KB minified, no build step required on the consumer side.

Every class is prefixed with `adaally-` so you can spot our components in any codebase.

## Quick start

Pick the snippet that matches how you build.

### Shopify theme

In `layout/theme.liquid`:

```liquid
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@adaally/slider@0.1/dist/adaally-slider.css">
<script src="https://cdn.jsdelivr.net/npm/@adaally/slider@0.1/dist/adaally-slider.umd.js" defer></script>
```

In any section or snippet:

```liquid
<div data-adaally-slider='{"autoplay": true, "slidesPerView": {"0":1,"768":3}}'
     aria-label="{{ section.settings.title }}">
  {% for block in section.blocks %}
    <img src="{{ block.settings.image | image_url: width: 1600 }}" alt="{{ block.settings.alt }}">
  {% endfor %}
</div>
```

Auto-init picks it up on `DOMContentLoaded` — zero JavaScript to write.

### React / Vue / any bundler

```bash
npm install @adaally/slider
```

```jsx
import { useEffect, useRef } from 'react';
import AdaallySlider from '@adaally/slider';
import '@adaally/slider/css';

export function Hero() {
  const ref = useRef(null);
  useEffect(() => {
    const slider = new AdaallySlider(ref.current, { autoplay: true, dotsShape: 'line' });
    return () => slider.destroy();
  }, []);
  return (
    <div ref={ref}>
      <img src="/1.jpg" alt="…" />
      <img src="/2.jpg" alt="…" />
      <img src="/3.jpg" alt="…" />
    </div>
  );
}
```

### Plain HTML page (WordPress, static sites, prototypes)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@adaally/slider@0.1/dist/adaally-slider.css">
<script src="https://cdn.jsdelivr.net/npm/@adaally/slider@0.1/dist/adaally-slider.umd.js" defer></script>

<div data-adaally-slider='{"autoplay": true}'>
  <img src="1.jpg" alt="…">
  <img src="2.jpg" alt="…">
  <img src="3.jpg" alt="…">
</div>
```

---

## What makes it accessible

Follows the [WAI-ARIA Authoring Practices carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/):

- `role="region"` + `aria-roledescription="carousel"` — announced as a landmark.
- Each slide gets `role="group"`, `aria-roledescription="slide"`, and `aria-label="N of M"`.
- Non-active slides are set `inert` + `aria-hidden="true"` so keyboard users and screen readers cannot reach hidden content.
- Slide changes are announced through one shared, visually hidden `aria-live="polite"` region (appended to `<body>`, or to the enclosing open dialog). The track itself stays `aria-live="off"`, so multi-slide swaps do not spam a screen reader. Changes caused by autoplay are announced only while keyboard focus is inside the carousel; user-initiated navigation (click, keyboard, dots) always announces.
- Buttons are real `<button type="button">` with descriptive `aria-label`s.
- **Autoplay is always pausable** (WCAG 2.2.2). The play/pause button uses `aria-pressed` and its label swaps between "Start automatic slide show" / "Stop automatic slide show".
- Autoplay auto-pauses on hover, on focus-within, and when the user has `prefers-reduced-motion: reduce`.
- Fade animation is disabled under `prefers-reduced-motion`.
- Keyboard: `←`/`→` change slides, `Home`/`End` jump to first/last — only when focus is on a carousel control (so arrow keys inside slide content still behave normally).
- Focus states use `:focus-visible` with a 3px outline (WCAG 2.4.7).
- Loop-disabled mode disables Prev/Next at the ends instead of silently ignoring clicks.

---

## Install

### Option A — Shopify theme (drop-in `<script>`)

This is what most Shopify devs will do. No npm, no build.

1. Copy `dist/adaally-slider.umd.js` and `dist/adaally-slider.css` into your theme's `assets/` folder.
2. In `layout/theme.liquid`, add:

```liquid
{{ 'adaally-slider.css' | asset_url | stylesheet_tag }}
{{ 'adaally-slider.umd.js' | asset_url | script_tag }}
```

3. Anywhere in your sections/snippets, drop in the markup:

```liquid
<div class="my-hero" data-adaally-slider='{"autoplay": true, "interval": 5000}' aria-label="Homepage hero">
  {% for block in section.blocks %}
    <div class="hero-slide">
      <img src="{{ block.settings.image | image_url: width: 1600 }}" alt="{{ block.settings.alt }}">
      <h2>{{ block.settings.heading }}</h2>
    </div>
  {% endfor %}
</div>
```

The `data-adaally-slider` attribute triggers auto-init on `DOMContentLoaded`.

### Option B — npm / bundler

```bash
npm install @adaally/slider
```

```js
import AdaallySlider from '@adaally/slider';
import '@adaally/slider/css';

new AdaallySlider('#my-slider', { autoplay: true, interval: 5000 });
```

### Option C — CDN (JSDelivr or unpkg, no install)

Once published to npm, JSDelivr and unpkg mirror the package automatically.

```html
<!-- JSDelivr (recommended, faster global cache) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@adaally/slider@0.1/dist/adaally-slider.css">
<script src="https://cdn.jsdelivr.net/npm/@adaally/slider@0.1/dist/adaally-slider.umd.js" defer></script>

<!-- unpkg (identical package) -->
<script src="https://unpkg.com/@adaally/slider@0.1/dist/adaally-slider.umd.js" defer></script>
```

**Always pin a version in production** (`@0.1`, `@0.1.2`) — omitting it serves whatever's latest, which can break your site the day we ship a major.

---

## Platform notes & troubleshooting

### Shopify theme editor and dynamic content

Auto-init runs once, when the page loads. Content added later — Shopify sections re-rendered in the theme editor, Elementor popups or tabs, AJAX-loaded markup — is not picked up automatically. Call `Adaally.autoInit()` on the new content. Calling it on an element that is already initialised is safe; the existing instance is reused.

```liquid
<script>
  document.addEventListener('shopify:section:load', function (e) {
    Adaally.autoInit(e.target);
  });
</script>
```

This only matters inside the theme editor. Visitors to the live store are not affected.

### WordPress and Elementor

Add the slider markup with a **Custom HTML** block (WordPress) or the **HTML** widget (Elementor). Text, heading and classic-editor widgets can rewrite your markup:

- Straight quotes in `data-adaally-slider='{"autoplay": true}'` may be converted to curly quotes, which makes the JSON invalid. Invalid JSON is ignored silently and the slider starts with default options, so if your options seem to have no effect, check this first.
- `wpautop` can insert stray `<p>` and `<br>` tags between slides.

### Screen reader does not announce slide changes

Some themes reset empty elements with `div:empty { display: none; }`. The slider's live region is empty between announcements, so a rule like that removes it from the accessibility tree and nothing is spoken. The stylesheet includes `.adaally-slider__sr-status:empty { display: block; }` to prevent this. If a theme still hides it, inspect `.adaally-slider__sr-status` in your browser's dev tools, check its computed `display`, and override the theme rule in your own CSS.

### Theme styles overriding the controls

Themes often style every `button` globally, which can change the arrows, dots, focus outlines or target sizes. Check the controls with the keyboard on your theme and override with the `--adaally-*` CSS variables or the BEM classes listed below.

---

## Usage

### Auto-init (no JS to write)

Any element with `data-adaally-slider` is auto-initialised. Options can be passed as a JSON string:

```html
<div data-adaally-slider='{"autoplay": true, "interval": 6000, "loop": true}' aria-label="Featured">
  <div>Slide 1</div>
  <div>Slide 2</div>
  <div>Slide 3</div>
</div>
```

### Manual init

```js
const slider = new AdaallySlider('#hero', {
  autoplay: false,
  showDots: true,
  showArrows: true,
});
```

### Options

| Option           | Default   | What it does                                                                                                      |
| ---------------- | --------- | ----------------------------------------------------------------------------------------------------------------- |
| `autoplay`       | `false`   | Auto-advance slides. Forces a visible pause button.                                                               |
| `interval`       | `5000`    | Milliseconds between auto-advances.                                                                               |
| `loop`           | `true`    | Wrap around from last to first.                                                                                   |
| `keyboard`       | `true`    | Enable arrow-key / Home / End navigation on controls.                                                             |
| `pauseOnHover`   | `true`    | Pause autoplay while the pointer is over the slider.                                                              |
| `pauseOnFocus`   | `true`    | Pause autoplay while any descendant has focus.                                                                    |
| `showDots`       | `true`    | Render dot pagination.                                                                                            |
| `showArrows`     | `true`    | Render prev/next arrow buttons.                                                                                   |
| `slidesPerView`  | `1`       | Number of slides visible at once. Or a responsive map: `{ 0: 1, 640: 2, 1024: 3 }` (keys are min-width in pixels). |
| `slidesToScroll` | `1`       | How many slides Next/Prev advance by.                                                                             |
| `transition`     | `'slide'` | `'slide'` uses a translated flex track; `'fade'` stacks slides and cross-fades.                                   |
| `label`          | —         | Sets `aria-label` on the root, giving the carousel an accessible name.                                            |
| `icons`          | `{}`      | Custom icon HTML strings: `{ prev, next, play, pause }`. Pass inline SVG for anything beyond the default glyphs.  |
| `revealControls` | `false`   | When `true`, prev/next and play/pause fade in only on hover or focus-within. Dots stay visible. Touch always shows.|
| `playButtonPosition` | `'top-left'` | Where the play/pause button sits inside the viewport. One of `top-left`, `top-center`, `top-right`, `bottom-left`, `bottom-center`, `bottom-right`. |
| `dotsShape`      | `'dot'`   | `'dot'` for circular dots, `'line'` for thin horizontal bars.                                                     |
| `dotsPosition`   | `'overlay'` | `'overlay'` floats the dots over the bottom of the slide (Instagram-style) — best for image/photo carousels. `'below'` puts them in a normal block underneath the whole slider — best when slide content (cards, quotes) fills the bottom edge and would collide with floating dots. |
| `liveRegionClearDelay` | `2000` | Milliseconds before the screen-reader announcement text is cleared from the shared live region. |
| `labels`         | see src   | Override any ARIA label string, including `slideAnnouncement(content, i, total)` and `multiSlideAnnouncement(count)` for the live-region announcements, or `slide(i, total)` for i18n.               |

### Methods

```js
slider.next();
slider.prev();
slider.goTo(2);
slider.play();
slider.pause();
slider.toggle();
slider.destroy();
```

### Events

All events bubble on the root element.

- `adaally:change` — `detail: { index, previous }`
- `adaally:play`
- `adaally:pause`

```js
document.querySelector('#hero').addEventListener('adaally:change', (e) => {
  console.log(`slid to ${e.detail.index}`);
});
```

---

## What the library styles vs. what you style

The library owns the slider **chrome**: everything that makes it work as a carousel. You own the **slide content**: whatever you put inside each slide. This is the same line every serious carousel library draws.

**We style:**
- The viewport (clipping box) and the track (moving flex row)
- Slide widths — computed from `slidesPerView` and `--adaally-gap`
- Prev/next buttons, play/pause button, and dots — including their sizes, colors, borders, focus rings, disabled state, and layout
- The shared visually-hidden `aria-live` status region (one per page, appended to `<body>`, or to the enclosing open dialog)
- Variant classes (`--outlined`, `--ghost`, `--minimal`, `--square`, `--fade`, `--reveal-controls`, `--reduced-motion`)
- One defensive rule inside slides: `img, video, picture, svg { max-width: 100%; height: auto; display: block; }` — because oversized media inside a slide breaks the transform math

**You style:**
- Whatever HTML lives inside each slide (your product card, hero, testimonial)
- The wrapper around the whole slider if you want a border/radius/shadow around it
- Slide *height*: flex `align-items: stretch` gives you equal-height columns for free, but the actual pixel height comes from your content (or an `aspect-ratio` on an image inside)

**How to customize without touching our selectors** — in order of preference:

1. **Set CSS custom properties** on the root (colors, sizes, radii, gaps).
2. **Add a variant class** to the root (`.adaally-slider--outlined`, etc.).
3. **Pass a custom icon** via the `icons` option for anything beyond the default glyphs.
4. **Override a BEM class** (`.adaally-slider__prev`, etc.) as a last resort. See the class map below.

---

## Styling

Override CSS custom properties on the root element:

```css
.adaally-slider {
  --adaally-color: #ffffff;
  --adaally-bg: rgba(0, 0, 0, 0.6);
  --adaally-focus: #f59e0b;

  --adaally-btn-size: 3rem;
  --adaally-btn-radius: 50%;             /* e.g. 4px for square-ish buttons */
  --adaally-btn-border-width: 2px;
  --adaally-btn-border-color: currentColor;

  --adaally-dot-size: 0.75rem;
  --adaally-dot-gap: 0.5rem;
  --adaally-dot-color-active: currentColor;
  --adaally-dot-border-width: 2px;
  --adaally-dot-border-color: currentColor;
  --adaally-dots-inset: 0.75rem;         /* distance from the bottom edge when dotsPosition: 'overlay' */

  --adaally-line-width: 1.75rem;         /* dotsShape: 'line' bar width */
  --adaally-line-height: 3px;
  --adaally-line-gap: 0.35rem;

  --adaally-gap: 1rem;                   /* space between slides in slide mode */
  --adaally-arrow-inset: 0.5rem;         /* how far arrows sit from the edges */
  --adaally-transition: 300ms;
}
```

### Variant modifier classes

Add these to the root element:

- `.adaally-slider--outlined` — buttons keep the border but drop the background
- `.adaally-slider--ghost` — buttons drop both border and background (icon-only)
- `.adaally-slider--minimal` — smaller buttons and dots
- `.adaally-slider--square` — square-ish buttons instead of circles
- `.adaally-slider--reveal-controls` — hide arrows and play/pause until hover or focus-within (applied automatically when you pass `revealControls: true`; touch devices always show)

### Custom icons

Pass any HTML/SVG string per icon. When you supply one, the library adds `.adaally-slider__btn--custom-icon` so the default glyph is skipped:

```js
new AdaallySlider('#hero', {
  icons: {
    prev: '<svg viewBox="0 0 24 24" ...>...</svg>',
    next: '<svg viewBox="0 0 24 24" ...>...</svg>',
    play: '<svg ...>...</svg>',
    pause: '<svg ...>...</svg>',
  },
});
```

### BEM class map

```
.adaally-slider
.adaally-slider__viewport                    /* overflow clipping container */
.adaally-slider__track                       /* moving flex row */
.adaally-slider__slide
.adaally-slider__slide--active
.adaally-slider__controls
.adaally-slider__prev
.adaally-slider__next
.adaally-slider__play
.adaally-slider__play--playing
.adaally-slider__play--top-left
.adaally-slider__play--top-center
.adaally-slider__play--top-right
.adaally-slider__play--bottom-left
.adaally-slider__play--bottom-center
.adaally-slider__play--bottom-right
.adaally-slider__btn--custom-icon            /* applied when you pass a custom icon */
.adaally-slider__dots
.adaally-slider__dots--overlay               /* default: floats over the bottom of the slide */
.adaally-slider__dots--below                 /* set via dotsPosition: 'below' */
.adaally-slider__dots--lines                 /* set via dotsShape: 'line' */
.adaally-slider__dot
.adaally-slider__dot[aria-current="true"]
.adaally-slider__sr-status                   /* shared visually-hidden aria-live region (end of <body>) */
.adaally-slider--fade
.adaally-slider--outlined
.adaally-slider--ghost
.adaally-slider--minimal
.adaally-slider--square
.adaally-slider--reduced-motion
```

---

## Build

```bash
node build.mjs
```

Produces `dist/adaally-slider.umd.js`, `dist/adaally-slider.esm.js`, `dist/adaally-slider.d.ts`, and `dist/adaally-slider.css`. The script compiles with TypeScript 5 through `npx`, which downloads the compiler on first run, so you need Node.js and network access once. There are no runtime dependencies.

## Demo

```bash
python3 -m http.server 8000
# then open http://localhost:8000/demo/
```

## License

MIT
