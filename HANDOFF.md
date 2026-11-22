# BenZenE project handoff

## Overview

Shakti Singh's personal developer portfolio. It is a single-page Next.js App Router project using TypeScript, Tailwind CSS 4, GSAP with `@gsap/react`, and Lucide React (installed; no current Lucide icons are rendered in `app/page.tsx`). The earlier Minimal/CHAOS two-mode idea was dropped: keep one design only.

## File map

- `app/page.tsx` — single-page content, GSAP scroll-driven docking title, project data, Eidolon screenshot/paragraph row, site sections, and corner flower markup.
- `app/globals.css` — Tailwind import, CSS variables and type scale, layout, responsive rules, corner flowers, screenshot card and site-wide petal styling.
- `app/layout.tsx` — root layout, Google font setup through `next/font/google`, page metadata.
- `components/PetalClicks.tsx` — client-side site-wide click petals, 108 prebuilt shape/color sprites, palette clock, incremental bottom pile, adaptive quality and optional counter flag. Resize redraws are debounced; each RAF draws at most six newly landed petals. At widths over 1600px, canvas DPR is 1.
- `public/art/shakti-hero.png` — hero artwork currently rendered on the page (disk usage reported about 2.4 MiB; publishing reminder previously estimated about 1.1 MB, verify the desired optimization target).
- `public/art/shakti-icon.png` — icon beside the hero name.
- `public/art/eidolon-cli.png` — screenshot used by the Eidolon project card.
- `public/art/dahlia-clean.png` — cleaned flower image used once at the top-right and three times in the bottom-left cluster.
- `public/art/dahlia.png` — original flower image; kept untouched and not referenced by the page.
- `public/art/eidolon-effect.png`, `public/art/eidolon-layout.png`, `public/art/skyline-lone-figure.png` — present but not referenced by the current page (unverified intended future use).
- `public/{file,globe,next,vercel,window}.svg` — starter assets present; not referenced by the current page.
- `PROJECT_BRIEF.md` — original brief; some ideas in it were later dropped by the owner.
- `AGENTS.md` — repository-specific Next.js instruction: consult the matching guide under `node_modules/next/dist/docs/` before editing code.
- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` — dependencies, scripts and pnpm setup.
- `next.config.ts`, `tsconfig.json`, `eslint.config.mjs` — Next.js, TypeScript and ESLint configuration.
- `README.md` — still mostly the create-next-app starter README; it is not a reliable description of the finished design.
- `app/favicon.ico` — current favicon asset; custom branding status is unverified.

## Design system

Actual CSS variables: cream `--paper: #EDDBC2`; espresso/dark body text `--ink: #382A2B`; muted espresso `--ink-muted: #705B55`; deep text `--espresso: #26211D`; crimson accent `--accent: #92252B`. Additional actual accents include tan `#E6D7BE`, crimson `#A63A2B`, and dark card `#090A0D`. The site-wide petal palette includes wine `#7A1730`, `#8E2419`, `#A63A4A` and rose `#B34A66`, `#C77088`, `#D9A08A`. The corner flowers use a CSS brightness/contrast/saturation/sepia filter. The page uses thin section/footer rules and open editorial layouts; the Eidolon screenshot is an intentional framed image, not a generic content card. Avoid extra cards, decorative gradients, glass and heavy shadows. The hero artwork has linear-gradient masks only for edge fading. The Eidolon row has no arrow icon or “View Repository” text link.

The font roles are set in `app/layout.tsx`: Fraunces (`--font-display-family`, loaded italic), Hanken Grotesk (`--font-body-family`) and DM Mono (`--font-mono-family`). `app/globals.css` maps them to `--font-display`, `--font-body` and `--font-mono`. Fraunces is used for the hero name, section headings, About pull-quote, and Eidolon title/index; Hanken Grotesk is used for body copy; DM Mono is assigned to the header/label role, though the current header slot has no visible label. The CSS type scale uses a 17px base and 1.25 ratio.

Site-wide click petal palette in `PetalClicks.tsx`: `#7A1730`, `#8E2419`, `#A63A4A`, `#B34A66`, `#C77088`, `#D9A08A`, expanded into 12 sprite color steps. Sprite bases are darkened from each tip color; veins and edges use a pale tint. The pile is limited to 44px desktop / 32px phone.

## What is built

- A full-screen artwork-led hero and one H1 linking to `#top`. The icon, “Shakti” name and period animate into a fixed top-left dock slot; the name group gains a pill, and the period fades. Reduced-motion handling is present.
- About, Projects and Contact sections, with alternating heading alignment on wider screens.
- About pull-quote and body paragraph. The quote is inside the section reveal. Dedicated `ScrollReveal` or marker `Highlighter` components are not present; no two highlighted phrases were found.
- Eidolon row: “01” above the screenshot card, EIDOLON title and GitHub logo link on the image, with this paragraph to its right on desktop and below on phones: “A safety layer for editing Linux config files. Edit a temporary copy, and Eidolon checks your changes against your real machine and shows a before and after view before anything is applied. Every finding is labeled verified, likely or unknown. Currently supports Hyprland.”
- The Contact section currently contains only its heading; GitHub/LinkedIn/Discord/Email icon buttons and their actions are not present in `app/page.tsx` (unverified whether planned elsewhere). The footer content element is empty; the bottom corner flowers and site-wide petal canvas decorate the page end.
- One top-right corner flower and a three-flower bottom-left cluster.
- `PetalClicks.tsx` provides site-wide click bursts, nine sprite shapes in 12 palette steps, a 30-second ping-pong palette clock, a pile at the page bottom, DPR capped at 2, and adaptive quality. `SHOW_PETAL_COUNTER` is currently `false`.

## Removed or abandoned; do not bring back

CHAOS mode and its toggle; top navigation bar; draggable floating project window; FolderFloat; Sakura.js and matter-js; Eidolon orb, flower petals and card-only rain; tech tags; “View Repository” text link; arrows in the Eidolon row.

## Owner preferences

Do exactly what was requested and add nothing unasked. Avoid AI-feeling additions. Keep prompts and code changes small, one change at a time. Verify at 1440×900 and 390×844 only unless a task explicitly requests other sizes. Never run git commands; the owner handles git. Ask before installing any dependency. Usage is limited, so keep work efficient. Find root causes instead of layering patches over symptoms.

## Pending and reminders

- Re-enable the site-wide note “You made N flower petals fall during your journey through this site.” by setting `SHOW_PETAL_COUNTER` to `true` when the project is done.
- Re-add the “PORTFOLIO / 2026” labels at the very end of the page.
- The owner says Eidolon content and contact links are final; current code only confirms the GitHub repository link and the new project paragraph requested in Job 2. Contact controls are absent, so final destinations/actions are unverified.
- Before publishing: compress images (hero file is about 2.4 MiB on disk; confirm target size), confirm the generic title/description in `app/layout.tsx`, replace/confirm the starter favicon, add a share image, check for `.env` files or API keys, deploy and test on a real phone. Presence of secrets has not been audited.
- Petal pile lag was measured and fixed in Firefox production at 1920×1200. Before: 360 landings; every landing cleared/redrew the whole pile (last redraw drew 360 sprites); mean redraw path 5.46ms, worst 18ms; 570 measured RAF callbacks averaged 8.21ms, worst 38ms, 13 exceeded 25ms. After: 359 landings; after 300, 94 measured callbacks averaged 6.67ms, worst 13ms, none exceeded 25ms; at most 3 new pile sprites were drawn in a frame (code cap is 6). Landing bookkeeping averaged 0.031ms and peaked at 1ms; individual canvas draw calls averaged 0.153ms and peaked at 2ms. The old 0.85 CSS opacity and 52px canvas (44px pile plus 8px) were removed; alpha is drawn into sprites and the canvas is 44px high. No React state update occurs per click while the counter flag is false; the lifetime count is kept in a ref. Geometry is cached from ResizeObserver/resize and updated on scroll without a frame-loop layout read. The observed headless Firefox run emitted an SWGL software-compositor warning; Marionette refused navigation to `about:support`, so hardware-acceleration status is unverified. The wide-viewport air canvas is pinned to DPR 1; it was already DPR 1 in the test, so that cap made no measured difference.

## How to start

Read `AGENTS.md` and this handoff first, then inspect the relevant Next.js guide under `node_modules/next/dist/docs/` before code edits. Run `npm run dev` for development, `npm run build` for a production build, and `npm start` to serve the build. Do not install dependencies without asking the owner.
