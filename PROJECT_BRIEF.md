# BenZenE: Project Brief

## 1. What this is
BenZenE is my personal developer portfolio and creative playground. I'm a second-year CS student who builds things, works with Linux and C/C++, and explores networking and security.
It must feel personal and designed, never like a template or an AI-generated portfolio.

## 2. Core concept
One site, two modes sharing the same content:
- Minimal Mode (default): restrained, polished, recruiter-safe.
- CHAOS Mode: experimental, expressive, shows creativity and technical skill.
A visible "CHAOS Mode" button switches modes with an ink-spread transition (the reverse is shorter and simpler). The site remembers the last mode after refresh.
Visitors always land in Minimal Mode first.

## 3. Visual identity
- Background: #E5E8CE
- Sage: #789575, for artwork and accents only. NEVER for text (contrast is only about 2.6:1).
- Text: a dark green or charcoal, readable on the background.
- Editorial, typography-led, intentional spacing. Minimal but not empty.
- Avoid: neon or hacker aesthetics, skulls or hooded figures, random ASCII decoration, fake terminal or system-status panels, heavy gradients and glow, glassmorphism, rounded cards everywhere, generic slogans and AI-sounding copy.

## 4. Typography
Three roles, each a CSS variable so fonts can be swapped in one line:
- --font-display: hero and headings (serif). Hero, h1 and h2 in italic; h3 and h4 upright. Placeholder: Fraunces.
- --font-body: normal text. Placeholder: Hanken Grotesk.
- --font-mono: small labels and nav only. Placeholder: DM Mono.
Final fonts are chosen by me later. Do not ask or decide this.
Use a modular type scale from CSS variables (base 17px, ratio 1.25 in Minimal). Names: label, body, h4, h3, h2, h1, hero. No random font sizes. CHAOS Mode will later use a bigger ratio (1.618) and an accent font that is still undecided.

## 5. Hero
- Full first screen, artwork-dominant, light theme.
- Artwork: an ASCII-style skyline with a lone figure

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

### Artwork and click-petal effect
- Dahlia artwork appears in the upper-right corner and as three flowers along the lower-left edge.
- `components/PetalClicks.tsx` implements the site-wide click-petal effect. It creates petal sprites from the configured shapes and palette, cycles the palette using a 30-second palette clock, and draws a pile at the page bottom.
- The effect adapts quality based on frame timing and viewport width. The air canvas uses device-pixel ratio 1 above 1600px wide. `SHOW_PETAL_COUNTER` is currently `false`.

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

- Measure and fix the petal lag when petals land on the pile. This has not yet been measured or fixed.
- Set `SHOW_PETAL_COUNTER` to `true` when the project is done.
- Re-add the “PORTFOLIO / 2026” labels at the very end.
- Before publishing: compress images (the hero image is about 1.1 MB); verify/finalize the existing page title, description, and `app/favicon.ico`, and add a share image; check that no `.env` files or API keys are in the repository; deploy and test on a real phone.
