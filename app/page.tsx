"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type Project = {
  name: string;
  url: string;
  description: string;
  image: {
    src: string;
    width: number;
    height: number;
    alt: string;
  };
};

const projects: Project[] = [
  {
    name: "Eidolon",
    url: "https://github.com/nullbenz/eidolon",
    description: "A safety layer for editing Linux config files.",
    image: {
      src: "/art/eidolon-cli.png",
      width: 1512,
      height: 785,
      alt: "Terminal showing Eidolon's command list, its setup checks passing, and a diff of a changed config",
    },
  },
];

const flowerPetals = [
  {
    text: "Edits a temporary copy first",
    angle: -88,
    length: 170,
    width: 82,
    color: "#8E2419",
  },
  {
    text: "Checks against your real machine",
    angle: -34,
    length: 190,
    width: 74,
    color: "#A63A2B",
  },
  {
    text: "Shows a before and after view",
    angle: 34,
    length: 160,
    width: 90,
    color: "#8E2419",
  },
  {
    text: "Verified, likely or unknown labels",
    angle: 92,
    length: 185,
    width: 76,
    color: "#A63A2B",
  },
  {
    text: "Nothing applies without your approval",
    angle: 154,
    length: 190,
    width: 84,
    color: "#8E2419",
  },
  {
    text: "Currently supports Hyprland",
    angle: 214,
    length: 160,
    width: 88,
    color: "#A63A2B",
  },
];

const FLOWER_RADIUS = 150;
const FLOWER_REACH = FLOWER_RADIUS + 95;

function EidolonCard({ project, index }: { project: Project; index: number }) {
  const cardRef = useRef<HTMLElement>(null);
  const flowerRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLButtonElement>(null);
  const petalRefs = useRef<(HTMLLIElement | null)[]>([]);
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [open, setOpen] = useState(false);
  const [hoverEnabled, setHoverEnabled] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const hover = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncHover = () => setHoverEnabled(hover.matches);
    const syncReduced = () => setReducedMotion(reduced.matches);
    syncHover();
    syncReduced();
    hover.addEventListener("change", syncHover);
    reduced.addEventListener("change", syncReduced);
    return () => {
      hover.removeEventListener("change", syncHover);
      reduced.removeEventListener("change", syncReduced);
    };
  }, []);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const measure = () => {
      const rect = card.getBoundingClientRect();
      setCardSize((current) =>
        current.width === rect.width && current.height === rect.height
          ? current
          : { width: rect.width, height: rect.height },
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  const isNarrowCard = cardSize.width > 0 && cardSize.width < 560;
  const centerX = isNarrowCard ? cardSize.width / 2 : cardSize.width * 0.78;
  const centerY = isNarrowCard ? cardSize.height * 0.7 : cardSize.height / 2;
  const scale =
    cardSize.width > 0
      ? Math.min(
          1,
          centerX / FLOWER_REACH,
          (cardSize.width - centerX) / FLOWER_REACH,
          centerY / FLOWER_REACH,
          (cardSize.height - centerY) / FLOWER_REACH,
        )
      : 1;
  const petalTargets = useMemo(
    () =>
      flowerPetals.map((petal) => {
        const radians = (petal.angle * Math.PI) / 180;
        return {
          x: Math.cos(radians) * FLOWER_RADIUS * scale,
          y: Math.sin(radians) * FLOWER_RADIUS * scale,
        };
      }),
    [scale],
  );

  useEffect(() => {
    if (!open) return;

    const onOutsidePointer = (event: PointerEvent) => {
      if (!flowerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onOutsidePointer);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onOutsidePointer);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  useLayoutEffect(() => {
    const orb = orbRef.current;
    const petals = petalRefs.current.slice(0, flowerPetals.length);
    if (!orb || petals.some((petal) => !petal)) return;

    const targets = petals.map((_, petalIndex) => petalTargets[petalIndex]);
    const timeline = gsap.timeline();

    if (open) {
      if (reducedMotion) {
        gsap.set(petals, {
          x: (i) => targets[i].x,
          y: (i) => targets[i].y,
          rotation: (i) => flowerPetals[i].angle,
          scale: 1,
          opacity: 0,
        });
        gsap.set(orb, { scale: 1, rotation: 0 });
        timeline.to(petals, {
          opacity: 1,
          duration: 0.18,
          stagger: 0.11,
          ease: "none",
        });
      } else {
        gsap.set(petals, {
          x: 0,
          y: 0,
          rotation: (i) => flowerPetals[i].angle - 18,
          scale: 0,
          opacity: 1,
        });
        gsap.set(orb, { scale: 1, rotation: 0 });
        timeline
          .to(
            orb,
            { scale: 60 / 44, rotation: 90, duration: 0.5, ease: "power2.out" },
            0,
          )
          .to(
            petals,
            {
              x: (i) => targets[i].x,
              y: (i) => targets[i].y,
              rotation: (i) => flowerPetals[i].angle,
              scale: 1,
              duration: 0.48,
              ease: "back.out(1.45)",
              stagger: 0.11,
            },
            0.04,
          );
      }
    } else if (reducedMotion) {
      gsap.set(petals, {
        x: (i) => targets[i].x,
        y: (i) => targets[i].y,
        rotation: (i) => flowerPetals[i].angle,
        scale: 1,
        opacity: 1,
      });
      gsap.set(orb, { scale: 1, rotation: 0 });
      timeline.to(petals, {
        opacity: 0,
        duration: 0.14,
        stagger: { each: 0.045, from: "end" },
      });
    } else {
      timeline
        .to(
          petals,
          {
            x: 0,
            y: 0,
            rotation: (i) => flowerPetals[i].angle - 18,
            scale: 0,
            duration: 0.28,
            ease: "power2.in",
            stagger: { each: 0.045, from: "end" },
          },
          0,
        )
        .to(
          orb,
          { scale: 1, rotation: 0, duration: 0.32, ease: "power2.inOut" },
          0,
        );
    }

    return () => {
      timeline.kill();
    };
  }, [open, petalTargets, reducedMotion, scale]);

  const cancelHoverClose = () => {
    if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current);
  };
  const openOnHover = () => {
    cancelHoverClose();
    if (hoverEnabled) setOpen(true);
  };
  const closeAfterHover = () => {
    if (!hoverEnabled) return;
    cancelHoverClose();
    hoverCloseTimer.current = setTimeout(() => setOpen(false), 150);
  };
  const toggleOpen = () => setOpen((current) => !current);
  const flowerStyle = {
    left: `${centerX}px`,
    top: `${centerY}px`,
    "--flower-scale": scale,
  } as CSSProperties;

  return (
    <article
      className="eidolon-card"
      ref={cardRef}
      data-flower-open={open ? "" : undefined}
    >
      <Image
        src={project.image.src}
        alt={project.image.alt}
        fill
        sizes="(max-width: 767px) 100vw, 1120px"
        loading="lazy"
        className="eidolon-card-image"
      />
      <div className="eidolon-card-shade" aria-hidden="true" />

      <div className="eidolon-card-copy">
        <span className="eidolon-card-index" aria-hidden="true">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="eidolon-card-title-line">
          <h3 className="eidolon-card-title">EIDOLON</h3>
          <a
            className="eidolon-card-github"
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Eidolon on GitHub"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="28"
              height="28"
              fill="currentColor"
            >
              <path d="M12 .297a12 12 0 0 0-3.794 23.4c.6.111.82-.261.82-.577v-2.234c-3.338.726-4.043-1.416-4.043-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.605-2.665-.304-5.467-1.332-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.5 11.5 0 0 1 6.006 0c2.292-1.552 3.298-1.23 3.298-1.23.655 1.652.243 2.873.12 3.176.77.84 1.235 1.91 1.235 3.221 0 4.61-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.216.694.825.576A12.001 12.001 0 0 0 12 .297z" />
            </svg>
          </a>
        </div>
        <p className="eidolon-card-description">{project.description}</p>
      </div>

      <div className="eidolon-flower" ref={flowerRef} style={flowerStyle}>
        <ul
          className="eidolon-flower-petals"
          id="eidolon-flower-list"
          aria-hidden={!open}
        >
          {flowerPetals.map((petal, petalIndex) => (
            <li
              key={petal.text}
              className="eidolon-flower-petal"
              ref={(element) => {
                petalRefs.current[petalIndex] = element;
              }}
              style={
                {
                  "--petal-angle": `${petal.angle}deg`,
                  "--petal-color": petal.color,
                  "--petal-length": `${petal.length * scale}px`,
                  "--petal-width": `${petal.width * scale}px`,
                  "--petal-font": `${Math.max(12, 14 * scale)}px`,
                } as CSSProperties
              }
              onPointerEnter={openOnHover}
              onPointerLeave={closeAfterHover}
              onClick={toggleOpen}
            >
              <span className="eidolon-flower-petal-shape" aria-hidden="true" />
              <span className="eidolon-flower-petal-text">{petal.text}</span>
            </li>
          ))}
        </ul>
        <button
          className="eidolon-flower-orb"
          type="button"
          ref={orbRef}
          aria-label="Show how Eidolon works"
          aria-expanded={open}
          aria-controls="eidolon-flower-list"
          onPointerEnter={openOnHover}
          onPointerLeave={closeAfterHover}
          onClick={toggleOpen}
        />
      </div>
    </article>
  );
}

export default function Home() {
  const pageRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const slotRef = useRef<HTMLSpanElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleLinkRef = useRef<HTMLAnchorElement>(null);
  const titleGroupRef = useRef<HTMLSpanElement>(null);
  const titlePeriodRef = useRef<HTMLSpanElement>(null);
  const heroIntroRef = useRef<HTMLParagraphElement>(null);
  useGSAP(
    () => {
      const page = pageRef.current;
      const header = headerRef.current;
      const slot = slotRef.current;
      const hero = heroRef.current;
      const heading = headingRef.current;
      const titleLink = titleLinkRef.current;
      const titleGroup = titleGroupRef.current;
      const titlePeriod = titlePeriodRef.current;
      const heroIntro = heroIntroRef.current;

      if (
        !page ||
        !header ||
        !slot ||
        !hero ||
        !heading ||
        !titleLink ||
        !titleGroup ||
        !titlePeriod ||
        !heroIntro
      ) {
        return;
      }

      let scrollTimeline: gsap.core.Timeline | undefined;
      let reducedScrollTrigger: ScrollTrigger | undefined;
      let copyCollisionTrigger: ScrollTrigger | undefined;
      let resizeObserver: ResizeObserver | undefined;
      let refreshFrame = 0;
      let titleIsFixed = false;
      let reducedMotionMode = false;
      let copyIsHidden = false;
      let disposed = false;
      let copyOpacityTween: gsap.core.Tween | undefined;

      const clearTitlePosition = () => {
        titleLink.style.position = "";
        titleLink.style.top = "";
        titleLink.style.left = "";
        titleLink.style.zIndex = "";
        titleIsFixed = false;
      };

      const fixTitle = (metrics: ReturnType<typeof measure>) => {
        const y = reducedMotionMode
          ? 0
          : Number(gsap.getProperty(titleLink, "y")) || 0;
        gsap.set(titleLink, {
          y,
          scale: metrics.targetScale,
          transformOrigin: "top left",
        });
        titleLink.style.position = "fixed";
        titleLink.style.top = `${metrics.targetDocumentTop - y}px`;
        titleLink.style.left = `${metrics.targetDocumentLeft}px`;
        titleLink.style.zIndex = "13";
        titleIsFixed = true;
      };

      const measure = () => {
        const wasFixed = titleIsFixed;
        const y = Number(gsap.getProperty(titleLink, "y")) || 0;
        const scale = Number(gsap.getProperty(titleLink, "scale")) || 1;
        const introY = Number(gsap.getProperty(heroIntro, "y")) || 0;

        if (wasFixed) clearTitlePosition();
        titleLink.style.transform = "none";
        titleLink.style.translate = "none";
        titleLink.style.rotate = "none";
        titleLink.style.scale = "none";
        gsap.set(titleLink, { clearProps: "transform" });
        gsap.set(heroIntro, { clearProps: "transform" });

        const titleRect = titleLink.getBoundingClientRect();
        const slotRect = slot.getBoundingClientRect();
        const heroRect = hero.getBoundingClientRect();
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;
        const sourceDocumentTop = titleRect.top + scrollY;
        const targetDocumentLeft = slotRect.left + scrollX;
        const groupWidth = titleGroup.offsetWidth;
        const groupHeight = titleGroup.offsetHeight;
        const endScroll = heroRect.top + scrollY + heroRect.height * 0.6;
        const targetScale = groupWidth > 0 ? slotRect.width / groupWidth : 1;
        const targetDocumentTop =
          slotRect.top +
          scrollY +
          (slotRect.height - groupHeight * targetScale) / 2;
        const safeTargetScale = Math.max(targetScale, 0.001);
        titleGroup.style.setProperty(
          "--dock-inset-x",
          `${8 / safeTargetScale}px`,
        );
        titleGroup.style.setProperty(
          "--dock-inset-y",
          `${6 / safeTargetScale}px`,
        );
        titleGroup.style.setProperty(
          "--dock-border-width",
          `${1 / safeTargetScale}px`,
        );

        gsap.set(titleLink, { y, scale, transformOrigin: "top left" });
        gsap.set(heroIntro, { y: introY });

        if (wasFixed) {
          titleLink.style.position = "fixed";
          titleLink.style.top = `${targetDocumentTop - y}px`;
          titleLink.style.left = `${targetDocumentLeft}px`;
          titleLink.style.zIndex = "13";
          titleIsFixed = true;
        }

        return {
          sourceDocumentTop,
          targetDocumentLeft,
          targetDocumentTop,
          targetScale,
          endY: targetDocumentTop - (sourceDocumentTop - endScroll),
          currentY: targetDocumentTop - (sourceDocumentTop - scrollY),
        };
      };

      const dockTitle = () => {
        if (!titleIsFixed) fixTitle(measure());
      };

      const undockTitle = () => {
        if (titleIsFixed) clearTitlePosition();
      };

      const undockEverything = () => {
        clearTitlePosition();
        gsap.set(titleLink, { clearProps: "transform" });
        gsap.set(titlePeriod, { opacity: 1 });
        copyOpacityTween?.kill();
        gsap.set(heroIntro, { opacity: 1, clearProps: "transform" });
        gsap.set(titleGroup, { "--dock-pill-alpha": 0 });
        copyIsHidden = false;
      };

      const updateCopyCollision = () => {
        const titleRect = titleLink.getBoundingClientRect();
        const introRect = heroIntro.getBoundingClientRect();
        const horizontalOverlap =
          titleRect.left < introRect.right && titleRect.right > introRect.left;
        const nearVerticalOverlap =
          titleRect.bottom + 8 > introRect.top &&
          titleRect.top < introRect.bottom + 8;
        const shouldHide = horizontalOverlap && nearVerticalOverlap;

        if (shouldHide === copyIsHidden) return;
        copyIsHidden = shouldHide;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          gsap.set(heroIntro, { opacity: shouldHide ? 0 : 1 });
        } else {
          copyOpacityTween?.kill();
          copyOpacityTween = gsap.to(heroIntro, {
            opacity: shouldHide ? 0 : 1,
            duration: 0.1,
            ease: "power1.out",
          });
        }
      };

      const refreshMeasurements = () => {
        const restoreTitle = titleIsFixed;
        if (restoreTitle) clearTitlePosition();
        ScrollTrigger.refresh();
        const metrics = measure();
        if (restoreTitle) fixTitle(metrics);
        updateCopyCollision();
      };

      const installAnimations = () => {
        scrollTimeline?.scrollTrigger?.kill();
        scrollTimeline?.kill();
        reducedScrollTrigger?.kill();
        copyCollisionTrigger?.kill();
        undockEverything();

        const reduceMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        reducedMotionMode = reduceMotion;

        copyIsHidden = false;
        copyCollisionTrigger = ScrollTrigger.create({
          trigger: heroIntro,
          start: "top bottom",
          end: "bottom top",
          onEnter: updateCopyCollision,
          onEnterBack: updateCopyCollision,
          onUpdate: updateCopyCollision,
          onLeave: updateCopyCollision,
          onLeaveBack: updateCopyCollision,
        });

        if (reduceMotion) {
          reducedScrollTrigger = ScrollTrigger.create({
            trigger: hero,
            start: "bottom top",
            onEnter: () => {
              const metrics = measure();
              fixTitle(metrics);
              gsap.set(titlePeriod, { opacity: 0 });
              gsap.set(titleGroup, { "--dock-pill-alpha": 1 });
            },
            onLeaveBack: undockEverything,
          });
          return;
        }

        gsap.fromTo(
          heroIntro,
          { y: 12 },
          {
            y: 0,
            duration: 0.7,
            ease: "power2.out",
            delay: 0.12,
          },
        );
        gsap.fromTo(
          ".hero-art-image",
          { opacity: 0 },
          { opacity: 1, duration: 1.2, ease: "sine.out", delay: 0.35 },
        );
        gsap.utils
          .toArray<HTMLElement>(".section-reveal", page)
          .forEach((section) => {
            gsap.fromTo(
              section,
              { opacity: 0, y: 18 },
              {
                opacity: 1,
                y: 0,
                duration: 0.7,
                ease: "power2.out",
                scrollTrigger: {
                  trigger: section,
                  start: "top 82%",
                  once: true,
                },
              },
            );
          });

        scrollTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: () =>
              `+=${Math.round(hero.getBoundingClientRect().height * 0.6)}`,
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate: updateCopyCollision,
            onLeave: dockTitle,
            onEnterBack: undockTitle,
            onLeaveBack: undockEverything,
          },
        });

        scrollTimeline
          .to(
            titleLink,
            {
              y: () => measure().endY,
              scale: () => measure().targetScale,
              duration: 1,
              ease: "none",
              transformOrigin: "top left",
            },
            0,
          )
          .to(titlePeriod, { opacity: 0, duration: 0.42, ease: "none" }, 0.48)
          .to(
            titleGroup,
            { "--dock-pill-alpha": 1, duration: 0.3, ease: "none" },
            0.7,
          );
      };

      const onMotionPreferenceChange = () => {
        installAnimations();
        ScrollTrigger.refresh();
      };

      const onResize = () => {
        if (refreshFrame) window.cancelAnimationFrame(refreshFrame);
        refreshFrame = window.requestAnimationFrame(refreshMeasurements);
      };

      const onScroll = () => updateCopyCollision();

      const initialize = async () => {
        await document.fonts.ready;
        if (disposed) return;

        installAnimations();
        ScrollTrigger.refresh();

        resizeObserver = new ResizeObserver(onResize);
        resizeObserver.observe(header);
        resizeObserver.observe(slot);
        resizeObserver.observe(heading);
        resizeObserver.observe(titleGroup);
        resizeObserver.observe(hero);
        window.addEventListener("resize", onResize);
        window.addEventListener("scroll", onScroll, { passive: true });
        window
          .matchMedia("(prefers-reduced-motion: reduce)")
          .addEventListener("change", onMotionPreferenceChange);
        document.fonts.addEventListener("loadingdone", onResize);
      };

      void initialize();

      return () => {
        disposed = true;
        if (refreshFrame) window.cancelAnimationFrame(refreshFrame);
        resizeObserver?.disconnect();
        window.removeEventListener("resize", onResize);
        window.removeEventListener("scroll", onScroll);
        window
          .matchMedia("(prefers-reduced-motion: reduce)")
          .removeEventListener("change", onMotionPreferenceChange);
        document.fonts.removeEventListener("loadingdone", onResize);
        scrollTimeline?.scrollTrigger?.kill();
        scrollTimeline?.kill();
        reducedScrollTrigger?.kill();
        copyCollisionTrigger?.kill();
        undockEverything();
      };
    },
    { scope: pageRef },
  );

  return (
    <main className="home-screen" ref={pageRef}>
      <header className="site-header" ref={headerRef}>
        <span className="dock-slot" aria-hidden="true" ref={slotRef} />
      </header>

      <section
        className="hero"
        id="top"
        aria-labelledby="hero-title"
        ref={heroRef}
      >
        <div className="hero-copy">
          <h1 id="hero-title" ref={headingRef}>
            <a
              className="hero-title-link"
              href="#top"
              aria-label="Shakti"
              ref={titleLinkRef}
            >
              <span className="hero-title-primary" ref={titleGroupRef}>
                <Image
                  src="/art/shakti-icon.png"
                  alt=""
                  width={42}
                  height={42}
                  className="hero-title-icon"
                  priority
                />
                <span className="hero-title-name">Shakti</span>
              </span>
              <span
                className="hero-title-period"
                aria-hidden="true"
                ref={titlePeriodRef}
              >
                .
              </span>
            </a>
          </h1>
          <p className="hero-intro" ref={heroIntroRef}>
            Somewhere between building and breaking things.
          </p>
        </div>

        <figure className="city-art" aria-hidden="true">
          <Image
            src="/art/shakti-hero.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="hero-art-image"
            unoptimized
          />
        </figure>
      </section>

      <section
        className="editorial-section about-section section-reveal"
        id="about"
        aria-labelledby="about-title"
      >
        <div className="section-heading">
          <h2 id="about-title">About</h2>
        </div>
        <div className="about-layout section-content">
          <blockquote className="about-quote">
            <p>
              I wanted to understand how things break, so I could learn how to
              fix them and make them even better.
            </p>
          </blockquote>
          <div className="about-copy">
            <p>
              My name is Shakti Singh. I&apos;m 20. I like to understand the
              concept behind how something works and how I can break it, and
              that is how I got into the field of cybersecurity. I like all
              kinds of music, and anime and drawing are my hobbies.
            </p>
          </div>
        </div>
      </section>

      <section
        className="editorial-section projects-section section-reveal"
        id="projects"
        aria-labelledby="projects-title"
      >
        <div className="section-heading">
          <h2 id="projects-title">Projects</h2>
        </div>
        <div className="section-content">
          {projects.map((project, index) => (
            <EidolonCard key={project.name} project={project} index={index} />
          ))}
        </div>
      </section>

      <section
        className="editorial-section contact-section section-reveal"
        id="contact"
        aria-labelledby="contact-title"
      >
        <div className="section-heading">
          <h2 id="contact-title">Contact</h2>
        </div>
      </section>

      <footer className="site-footer" aria-hidden="true" />
    </main>
  );
}
