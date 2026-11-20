"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useRef } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function Home() {
  const pageRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const brandRef = useRef<HTMLAnchorElement>(null);
  const slotRef = useRef<HTMLSpanElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleLinkRef = useRef<HTMLAnchorElement>(null);
  const titleNameRef = useRef<HTMLSpanElement>(null);
  const titlePeriodRef = useRef<HTMLSpanElement>(null);
  const dockStripRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const page = pageRef.current;
      const header = headerRef.current;
      const brand = brandRef.current;
      const slot = slotRef.current;
      const hero = heroRef.current;
      const heading = headingRef.current;
      const titleLink = titleLinkRef.current;
      const titleName = titleNameRef.current;
      const titlePeriod = titlePeriodRef.current;
      const dockStrip = dockStripRef.current;

      if (
        !page ||
        !header ||
        !brand ||
        !slot ||
        !hero ||
        !heading ||
        !titleLink ||
        !titleName ||
        !titlePeriod ||
        !dockStrip
      ) {
        return;
      }

      let scrollTimeline: gsap.core.Timeline | undefined;
      let reducedScrollTrigger: ScrollTrigger | undefined;
      let resizeObserver: ResizeObserver | undefined;
      let refreshFrame = 0;
      let brandIsFixed = false;
      let titleIsFixed = false;
      let disposed = false;

      const measure = () => {
        const headingRect = heading.getBoundingClientRect();
        const slotRect = slot.getBoundingClientRect();
        const brandRect = brand.getBoundingClientRect();
        const heroRect = hero.getBoundingClientRect();
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;
        const nameWidth = titleName.offsetWidth;
        const endScroll = heroRect.top + scrollY + heroRect.height * 0.6;
        const sourceDocumentTop = headingRect.top + scrollY;
        const targetViewportTop = brandIsFixed
          ? slotRect.top
          : slotRect.top + scrollY;
        const targetScale = nameWidth > 0 ? slotRect.width / nameWidth : 1;

        return {
          brandTop: brandIsFixed ? brandRect.top : brandRect.top + scrollY,
          brandLeft: brandIsFixed ? brandRect.left : brandRect.left + scrollX,
          sourceDocumentTop,
          sourceDocumentLeft: headingRect.left + scrollX,
          targetViewportTop,
          targetScale,
          endY: targetViewportTop - (sourceDocumentTop - endScroll),
          currentY: targetViewportTop - (sourceDocumentTop - scrollY),
        };
      };

      const clearTitlePosition = () => {
        titleLink.style.position = "";
        titleLink.style.top = "";
        titleLink.style.left = "";
        titleLink.style.zIndex = "";
        titleIsFixed = false;
      };

      const clearBrandPosition = () => {
        brand.style.position = "";
        brand.style.top = "";
        brand.style.left = "";
        brand.style.zIndex = "";
        brand.classList.remove("wordmark-docked");
        brandIsFixed = false;
      };

      const fixBrand = (metrics: ReturnType<typeof measure>) => {
        brand.style.position = "fixed";
        brand.style.top = `${metrics.brandTop}px`;
        brand.style.left = `${metrics.brandLeft}px`;
        brand.style.zIndex = "12";
        brand.classList.add("wordmark-docked");
        brandIsFixed = true;
      };

      const fixTitle = (metrics: ReturnType<typeof measure>) => {
        titleLink.style.position = "fixed";
        titleLink.style.top = `${metrics.sourceDocumentTop - window.scrollY}px`;
        titleLink.style.left = `${metrics.sourceDocumentLeft}px`;
        titleLink.style.zIndex = "13";
        titleIsFixed = true;
      };

      const dockTitle = () => {
        if (!brandIsFixed) fixBrand(measure());
        if (!titleIsFixed) fixTitle(measure());
      };

      const undockTitle = () => {
        if (titleIsFixed) clearTitlePosition();
      };

      const undockEverything = () => {
        clearTitlePosition();
        clearBrandPosition();
        gsap.set(titleLink, { clearProps: "transform" });
        gsap.set(titlePeriod, { opacity: 1 });
        gsap.set(dockStrip, { opacity: 0 });
      };

      const refreshMeasurements = () => {
        const restoreBrand = brandIsFixed;
        const restoreTitle = titleIsFixed;

        if (restoreTitle) clearTitlePosition();
        if (restoreBrand) clearBrandPosition();
        ScrollTrigger.refresh();

        if (restoreBrand) fixBrand(measure());
        if (restoreTitle) fixTitle(measure());
      };

      const measureHeaderSlot = () => {
        const styles = window.getComputedStyle(slot);
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (context) {
          context.font = window.getComputedStyle(brand).font;
          slot.style.width = `${context.measureText("Shakti").width}px`;
        }
        slot.style.height = styles.fontSize;
      };

      const installAnimations = () => {
        scrollTimeline?.scrollTrigger?.kill();
        scrollTimeline?.kill();
        reducedScrollTrigger?.kill();
        undockEverything();

        const reduceMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;

        if (reduceMotion) {
          reducedScrollTrigger = ScrollTrigger.create({
            trigger: hero,
            start: "bottom top",
            onEnter: () => {
              const metrics = measure();
              gsap.set(titleLink, {
                y: metrics.currentY,
                scale: metrics.targetScale,
                transformOrigin: "top left",
              });
              gsap.set(titlePeriod, { opacity: 0 });
              gsap.set(dockStrip, { opacity: 1 });
              dockTitle();
            },
            onLeaveBack: undockEverything,
          });
          return;
        }

        gsap.fromTo(
          ".hero-reveal",
          { opacity: 0, y: 18 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.12,
            ease: "power2.out",
            delay: 0.12,
          },
        );
        gsap.fromTo(
          ".hero-art-image",
          { opacity: 0 },
          { opacity: 1, duration: 1.2, ease: "sine.out", delay: 0.35 },
        );

        scrollTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: () =>
              `+=${Math.round(hero.getBoundingClientRect().height * 0.6)}`,
            scrub: true,
            invalidateOnRefresh: true,
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
          .to(dockStrip, { opacity: 1, duration: 0.28, ease: "none" }, 0.72);
      };

      const onMotionPreferenceChange = () => {
        installAnimations();
        ScrollTrigger.refresh();
      };

      const onResize = () => {
        if (refreshFrame) window.cancelAnimationFrame(refreshFrame);
        refreshFrame = window.requestAnimationFrame(refreshMeasurements);
      };

      const initialize = async () => {
        await document.fonts.ready;
        if (disposed) return;

        measureHeaderSlot();
        installAnimations();
        ScrollTrigger.refresh();

        resizeObserver = new ResizeObserver(onResize);
        resizeObserver.observe(header);
        resizeObserver.observe(heading);
        resizeObserver.observe(slot);
        window.addEventListener("resize", onResize);
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
        window
          .matchMedia("(prefers-reduced-motion: reduce)")
          .removeEventListener("change", onMotionPreferenceChange);
        document.fonts.removeEventListener("loadingdone", onResize);
        scrollTimeline?.scrollTrigger?.kill();
        scrollTimeline?.kill();
        reducedScrollTrigger?.kill();
        undockEverything();
      };
    },
    { scope: pageRef },
  );

  return (
    <main className="home-screen" ref={pageRef}>
      <div className="dock-strip" aria-hidden="true" ref={dockStripRef} />
      <header className="site-header" ref={headerRef}>
        <a
          className="wordmark"
          href="#top"
          aria-label="Back to top"
          ref={brandRef}
        >
          <Image
            src="/art/shakti-icon.png"
            alt=""
            width={42}
            height={42}
            className="wordmark-icon"
            priority
          />
          <span className="wordmark-slot" aria-hidden="true" ref={slotRef} />
        </a>
        <nav className="site-nav" aria-label="Main navigation">
          <a href="#work">WORK</a>
          <a href="#about">ABOUT</a>
          <a href="#contact">CONTACT</a>
          <button
            type="button"
            aria-disabled="true"
            title="CHAOS Mode will be added later"
          >
            CHAOS Mode <span aria-hidden="true">↗</span>
          </button>
        </nav>
        <span className="header-note">PORTFOLIO&nbsp; / &nbsp;2026</span>
      </header>

      <section
        className="hero"
        id="top"
        aria-labelledby="hero-title"
        ref={heroRef}
      >
        <div className="hero-copy">
          <h1 id="hero-title" ref={headingRef}>
            <a className="hero-title-link" href="#top" ref={titleLinkRef}>
              <span className="hero-title-name" ref={titleNameRef}>
                Shakti
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
          <p className="hero-intro hero-reveal">
            Somewhere between building and breaking things.
          </p>
          <a className="hero-link hero-reveal" href="#work">
            EXPLORE PROJECTS <span aria-hidden="true">↘</span>
          </a>
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

        <div className="hero-foot">
          <span>LINUX&nbsp; · &nbsp;C/C++&nbsp; · &nbsp;NETWORKS</span>
          <a href="#work" aria-label="Explore work section, to be added later">
            SCROLL TO EXPLORE <span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>
    </main>
  );
}
