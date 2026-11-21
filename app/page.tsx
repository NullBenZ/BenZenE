"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const FolderFloat = dynamic(() => import("@/components/FolderFloat"), {
  ssr: false,
});

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
  const projectsRef = useRef<HTMLElement>(null);
  const [folderReady, setFolderReady] = useState(false);
  const [folderTrigger, setFolderTrigger] = useState<"hover" | "click">("click");

  useEffect(() => {
    const projects = projectsRef.current;
    if (!projects) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setFolderReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(projects);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setFolderTrigger(
      window.matchMedia("(hover: hover) and (pointer: fine)").matches
        ? "hover"
        : "click",
    );
  }, []);

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
        ref={projectsRef}
      >
        <div className="section-heading">
          <h2 id="projects-title">Projects</h2>
        </div>
        <div className="section-content">
          {projects.map((project, index) => (
            <article
              className={`project-row${index % 2 ? " project-row--reverse" : ""}`}
              key={project.name}
            >
              {project.image && (
                <figure className="project-image-frame">
                  <Image
                    src={project.image.src}
                    alt={project.image.alt}
                    width={project.image.width}
                    height={project.image.height}
                    loading="lazy"
                    sizes="(max-width: 767px) 100vw, 50vw"
                    className="project-image"
                  />
                </figure>
              )}
              <div className="project-content">
                <span className="project-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="project-name-line">
                  <h3 className="project-name">{project.name}</h3>
                  <a
                    className="project-github-link"
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${project.name} on GitHub`}
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
                <p className="project-description">{project.description}</p>
                <div className="folder-float-space">
                  {folderReady && (
                    <FolderFloat
                      items={[
                        "Edits a temporary copy first",
                        "Checks against your real machine",
                        "Shows a before and after view",
                        "Verified, likely or unknown labels",
                        "Nothing applies without your approval",
                      ]}
                      label="Eidolon"
                      sublabel="How it works"
                      closeOnSelect={false}
                      physics={true}
                      drift={0.5}
                      trigger={folderTrigger}
                      folderColor="#26211D"
                      frontColor="#8E2419"
                      paperColor="#E6D7BE"
                      itemColor="#26211D"
                      itemTextColor="#E6D7BE"
                      labelColor="#E6D7BE"
                      width={220}
                      height={160}
                      radius={14}
                      spread={240}
                    />
                  )}
                </div>
              </div>
            </article>
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
