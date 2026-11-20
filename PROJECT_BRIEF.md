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
