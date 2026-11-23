# BenZenE: Project Brief

## 1. What this is
BenZenE is my personal developer portfolio and creative playground. I'm a second-year CS student who builds things, works with Linux and C/C++, and explores networking and security.
It must feel personal and designed, never like a template or an AI-generated portfolio.

## 2. Core concept
One site with shared content and two themes. Light is the default on every load; the selected theme is not persisted. The dark theme switches with an ink-bleed transition and a cutscene on each light-to-dark switch.

## 3. Visual identity and theme tokens
- Light theme values remain the existing cream paper (`#eddbc2`), dark espresso text (`#26211d` / `#382a2b`), muted brown (`#705b55`) and crimson accent (`#92252b`).
- Dark tokens: background `#0A0808`, surface `#141010`, text `#EDE6D6`, muted `#A39A8A`, accent `#D1262B`, accent-hot `#F0453A`, rule `rgba(237,230,214,0.18)`, and rare hover-link glow `#8FB8FF`.
- Site colors live in CSS custom properties under `:root`, with dark overrides under `html[data-theme="dark"]`. No theme choice is stored between loads.
- Dark mode uses uppercase, roman heavy headings, mono uppercase labels, square corners, red rules and selection, and a static 6% grain overlay. The corner dahlia images are hidden. The body, muted, hot-accent, hover-text, and link colors tested at 4.68:1 or higher on their corresponding backgrounds.

## 4. Typography
Three roles, each a CSS variable so fonts can be swapped in one line:
- `--font-display`: hero and light-theme headings (Fraunces); light h1/h2 are italic and h3/h4 upright. Dark headings use the body family, uppercase, roman, and heavy.
- `--font-body`: normal text (Hanken Grotesk).
- `--font-mono`: small labels (DM Mono).
The light type scale uses a 17px base and 1.25 ratio through CSS variables: label, body, h4, h3, h2, h1, hero.

## 5. Hero
- Full first screen, artwork-dominant, light theme.
- Artwork: an ASCII-style skyline with a lone figure.
- `#hero-art-slot` layers the light hero art and `public/art/dark/luffy.png` in the same box. The Luffy file is currently a temporary, unedited copy of `public/art/shakti-hero.png`; replace it with the owner-provided asset when available.

## 6. Current implementation

### Hero
- The home page opens with the Shakti mark and name, the line “Somewhere between building and breaking things.”, and the skyline artwork.
- The title docks into the header area while scrolling. The header itself has no top navigation links.

### About, Projects, and Contact
- The About, Projects, and Contact sections have alternating left/right heading alignment on desktop.
- About contains a pull-quote and a paragraph about Shakti. The section uses a GSAP/ScrollTrigger reveal; a ScrollReveal library and marker highlighter were not found in the current code.
- Projects contains the Eidolon row: a clean screenshot on the left and, on the right, “01”, the Eidolon heading, a GitHub link, and the project description. On phones the screenshot comes first, followed by the heading block and description.
- Contact currently contains its heading only. GitHub and LinkedIn open links and Discord and Email copy to the clipboard are unverified; no contact icon buttons or corresponding handlers are present in the current code.

### Skills
- The Skills section follows Projects and precedes Contact, with a responsive grid of skill tiles.
- Skills, in order: Git, JavaScript, Python, Rust, C, C++, Linux, HTML, CSS, Networking.
- Rust is labeled “learning”.
- Root cause of oversized icons: the inline SVGs had no width/height attributes and depended on `.skill-icon` CSS for sizing. The already-running dev server served stale CSS without that rule, so SVGs expanded to the grid width. There was no global SVG width rule or dynamically generated Tailwind class.

### Artwork, theme control, and click effects
- In light mode, dahlia artwork appears in the upper-right corner and as three flowers along the lower-left edge. Both are hidden in dark mode.
- The fixed top-right theme button uses an inline half-circle SVG, a 48px hit area, dynamic accessible label and pressed state, and a visually hidden live announcement. Light is the default on every page load.
- Theme transitions use an original fixed SVG overlay whose expanding ink circle is displaced by SVG turbulence at its edge. This replaced a CSS-clipped circle, whose clip edge stayed smooth because the filter did not affect it; the forward bleed also previously read the current cream background instead of the dark target color. The root theme changes at full coverage; scrolling is locked during the transition, the page moves to the top, and ScrollTrigger refreshes before the overlay fades. Reduced motion uses a 200ms crossfade without ink. The reference repo uses WebGL2 with a CSS fallback; its code was not copied.
- `components/DarkCutscene.tsx` runs the Phase 2 dark-entry sequence in one GSAP timeline, with the hand fading fully out before the fist appears once, screen blending for the black-backed hand/fist art, a camera shake, the Luffy reveal/dock, Skip focused as it appears, and Escape support. `PLAY_EVERY_TIME` is `true`; the three cutscene images preload on toggle focus/hover and after idle. Reduced motion bypasses the cutscene.
- The referenced `ink-bleed-theme-changer` repository has an MIT `LICENSE`; its code was not copied.
- `components/PetalClicks.tsx` reads its theme palette and sprite shading from CSS variables. In light mode it cycles flower petals with a 30-second palette clock and draws a pile at the page bottom. In dark mode it emits the four configured ember colors, rises against gravity, fades over 2.5 seconds, and does not land or draw a pile. The effect adapts quality based on frame timing and viewport width. The air canvas uses device-pixel ratio 1 above 1600px wide. `SHOW_PETAL_COUNTER` is currently `false`.

## 7. Removed or abandoned

Do not bring these back: CHAOS mode and its toggle, the top navigation bar, the draggable floating project window, FolderFloat, Sakura.js, matter-js, the Eidolon orb and petal flower, tech tags, the “View Repository” link, and arrow icons in the Eidolon row.

## 8. Owner preferences

- Do only what is asked; add nothing of your own. Avoid additions that feel AI-generated.
- Make small changes, one at a time.
- Verify only at 1440×900 and 390×844.
- Do not run git commands; the owner handles git.
- Ask before installing or uninstalling dependencies.
- Be efficient because usage is limited.
- Find root causes instead of patching symptoms.

## 9. Pending

- Measure and fix the petal lag when light-theme petals land on the pile. This has not yet been measured or fixed.
- Replace the temporary `public/art/dark/luffy.png` placeholder with the final owner-provided Luffy image when available.
- Set `SHOW_PETAL_COUNTER` to `true` when the project is done.
- Re-add the “PORTFOLIO / 2026” labels at the very end.
- Before publishing: compress images (the hero image is about 1.1 MB); verify/finalize the existing page title, description, and `app/favicon.ico`, and add a share image; check that no `.env` files or API keys are in the repository; deploy and test on a real phone.
