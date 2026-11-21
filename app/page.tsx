"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type WindowPosition = { left: number; top: number };
type DragOffset = { pointerId: number; x: number; y: number };
type Project = {
  name: string;
  description?: string;
  tech?: string[];
  summary?: string;
  link?: string;
  screenshot?: string;
};

const projects: Project[] = [{ name: "Eidolon" }];

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

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
  const projectTriggerRef = useRef<HTMLButtonElement>(null);
  const projectDialogRef = useRef<HTMLDialogElement>(null);
  const dialogCloseRef = useRef<HTMLButtonElement>(null);
  const dragOffsetRef = useRef<DragOffset | null>(null);
  const [projectOpen, setProjectOpen] = useState(false);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [dialogPosition, setDialogPosition] = useState<WindowPosition>({
    left: 32,
    top: 32,
  });
  const [dialogLayer, setDialogLayer] = useState(20);

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

  useEffect(() => {
    if (!projectOpen) return;
    const dialog = projectDialogRef.current;
    if (!dialog) return;

    if (!dialog.open) dialog.showModal();
    dialogCloseRef.current?.focus();

    const placeDialog = () => {
      if (window.innerWidth < 640) return;
      const rect = dialog.getBoundingClientRect();
      setDialogPosition({
        left: clamp(
          (window.innerWidth - rect.width) / 2,
          12,
          window.innerWidth - rect.width - 12,
        ),
        top: clamp(
          (window.innerHeight - rect.height) / 2,
          12,
          window.innerHeight - rect.height - 12,
        ),
      });
    };
    const onResize = () => {
      if (window.innerWidth < 640) return;
      const rect = dialog.getBoundingClientRect();
      setDialogPosition((position) => ({
        left: clamp(position.left, 12, window.innerWidth - rect.width - 12),
        top: clamp(position.top, 12, window.innerHeight - rect.height - 12),
      }));
    };

    window.requestAnimationFrame(placeDialog);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (dialog.open) dialog.close();
    };
  }, [projectOpen]);

  const closeProject = () => {
    setProjectOpen(false);
    window.requestAnimationFrame(() => projectTriggerRef.current?.focus());
  };

  const startWindowDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (
      window.innerWidth < 640 ||
      (event.target as HTMLElement).closest("button")
    ) {
      return;
    }
    const rect = projectDialogRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOffsetRef.current = {
      pointerId: event.pointerId,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDialogLayer((layer) => layer + 1);
  };

  const moveWindow = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragOffsetRef.current;
    const dialog = projectDialogRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !dialog) return;
    const rect = dialog.getBoundingClientRect();
    setDialogPosition({
      left: clamp(
        event.clientX - drag.x,
        8,
        window.innerWidth - rect.width - 8,
      ),
      top: clamp(
        event.clientY - drag.y,
        8,
        window.innerHeight - rect.height - 8,
      ),
    });
  };

  const endWindowDrag = () => {
    dragOffsetRef.current = null;
  };

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
            <button
              className={`project-row${index % 2 ? " project-row--reverse" : ""}`}
              key={project.name}
              type="button"
              aria-haspopup="dialog"
              aria-label={`Open ${project.name} project window`}
              onClick={() => {
                const width = Math.min(560, window.innerWidth - 24);
                setDialogPosition({
                  left: Math.max(12, (window.innerWidth - width) / 2),
                  top: Math.max(12, (window.innerHeight - 360) / 2),
                });
                setActiveProject(project);
                setProjectOpen(true);
              }}
              ref={projectTriggerRef}
            >
              <span className="project-index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="project-content">
                <span className="project-overview">
                  <span className="project-name">{project.name}</span>
                  {project.description && (
                    <span className="project-description">
                      {project.description}
                    </span>
                  )}
                  {project.tech && project.tech.length > 0 && (
                    <span className="project-tech">
                      {project.tech.join(" · ")}
                    </span>
                  )}
                </span>
                {project.screenshot ? (
                  <span className="project-image-frame">
                    <Image
                      src={project.screenshot}
                      alt={`${project.name} screenshot`}
                      fill
                      sizes="(max-width: 767px) 100vw, 50vw"
                    />
                  </span>
                ) : (
                  <span
                    className="project-image-placeholder"
                    role="img"
                    aria-label={`${project.name} screenshot placeholder`}
                  />
                )}
              </span>
            </button>
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

      {projectOpen && (
        <dialog
          className="project-window"
          ref={projectDialogRef}
          style={{
            left: `${dialogPosition.left}px`,
            top: `${dialogPosition.top}px`,
            zIndex: dialogLayer,
          }}
          aria-labelledby="project-window-title"
          onClick={() => setDialogLayer((layer) => layer + 1)}
          onCancel={(event) => {
            event.preventDefault();
            closeProject();
          }}
        >
          <div
            className="project-window-bar"
            onPointerDown={startWindowDrag}
            onPointerMove={moveWindow}
            onPointerUp={endWindowDrag}
            onPointerCancel={endWindowDrag}
            onLostPointerCapture={endWindowDrag}
          >
            <span id="project-window-title">
              {activeProject?.name ?? "Eidolon"}
            </span>
            <button
              className="project-window-close"
              type="button"
              aria-label="Close Eidolon window"
              onClick={closeProject}
              ref={dialogCloseRef}
            >
              ×
            </button>
          </div>
          {activeProject?.summary && (
            <p className="project-window-summary">{activeProject.summary}</p>
          )}
          {activeProject?.tech && activeProject.tech.length > 0 && (
            <p className="project-window-tech">
              {activeProject.tech.join(" · ")}
            </p>
          )}
          {activeProject?.link && (
            <a
              className="project-window-link"
              href={activeProject.link}
              target="_blank"
              rel="noreferrer"
            >
              {activeProject.link}
            </a>
          )}
          {activeProject?.screenshot ? (
            <div className="project-image-frame project-window-image">
              <Image
                src={activeProject.screenshot}
                alt={`${activeProject.name} screenshot`}
                fill
                sizes="560px"
              />
            </div>
          ) : (
            <div
              className="project-image-placeholder project-window-image"
              role="img"
              aria-label={`${activeProject?.name ?? "Project"} screenshot placeholder`}
            />
          )}
        </dialog>
      )}
    </main>
  );
}
