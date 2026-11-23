"use client";

import gsap from "gsap";
import { useLayoutEffect, useRef } from "react";

export const PLAY_EVERY_TIME = true;

const BLACK_HOLD = 0.3;
const HAND_IN = 1.2;
const HAND_PUSH = 1.2;
const HAND_TO_FIST_GAP = 0.4;
const HAND_TO_FIST_FADE = 0.5;
const FIST_POKE_IN = 0.5;
const CAMERA_SHAKE = 0.35;
const FIRST_FIST_HOLD = 0.8;
const FIRST_FIST_BACK = 0.6;
const LUFFY_IN = 0.7;
const LUFFY_HOLD = 0.5;
const DOCK_DURATION = 0.9;
const OVERLAY_FADE_DURATION = 0.9;
const OVERLAY_FADE_DELAY = 0.2;
const SKIP_APPEARS_AT = 0.5;
const SKIP_FADE_DURATION = 0.25;
const SKIP_DOCK_DURATION = 0.5;
export const IDLE_PRELOAD_TIMEOUT_MS = 2500;

const CUTSCENE_ASSETS = [
  "/art/dark/hand.png",
  "/art/dark/fist.png",
  "/art/dark/luffy.png",
];
const preloadedImages = new Map<string, HTMLImageElement>();
const SESSION_PLAYED_KEY = "dark-cutscene-played";

export function preloadDarkCutsceneAssets() {
  CUTSCENE_ASSETS.forEach((src) => {
    if (preloadedImages.has(src)) return;
    const image = new Image();
    image.decoding = "async";
    image.src = src;
    preloadedImages.set(src, image);
  });
}

export function shouldPlayDarkCutscene() {
  if (PLAY_EVERY_TIME) return true;
  try {
    return sessionStorage.getItem(SESSION_PLAYED_KEY) !== "true";
  } catch {
    return true;
  }
}

function markDarkCutscenePlayed() {
  if (PLAY_EVERY_TIME) return;
  try {
    sessionStorage.setItem(SESSION_PLAYED_KEY, "true");
  } catch {
    // The cutscene still works when session storage is unavailable.
  }
}

type DarkCutsceneProps = {
  active: boolean;
  onBegin: () => void;
  onComplete: () => void;
};

export default function DarkCutscene({
  active,
  onBegin,
  onComplete,
}: DarkCutsceneProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLImageElement>(null);
  const fistRef = useRef<HTMLImageElement>(null);
  const luffyRef = useRef<HTMLDivElement>(null);
  const luffyImageRef = useRef<HTMLImageElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const skipActionRef = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    if (!active) return;

    const overlay = overlayRef.current;
    const stage = stageRef.current;
    const hand = handRef.current;
    const fist = fistRef.current;
    const luffy = luffyRef.current;
    const luffyImage = luffyImageRef.current;
    const skip = skipRef.current;
    const slot = document.getElementById("hero-art-slot");
    if (!overlay || !stage || !hand || !fist || !luffy || !luffyImage || !skip || !slot) return;

    let disposed = false;
    let skipped = false;
    let timeline: gsap.core.Timeline | undefined;

    const dockValues = () => {
      const slotRect = slot.getBoundingClientRect();
      const luffyRect = luffy.getBoundingClientRect();
      const currentScale = Number(gsap.getProperty(luffy, "scale")) || 1;
      return {
        x: slotRect.left + slotRect.width / 2 - (luffyRect.left + luffyRect.width / 2),
        y: slotRect.top + slotRect.height / 2 - (luffyRect.top + luffyRect.height / 2),
        scale: slotRect.width / (luffyRect.width / currentScale),
      };
    };

    const logDockBounds = () => {
      const slotRect = slot.getBoundingClientRect();
      const luffyRect = luffy.getBoundingClientRect();
      const delta = {
        x: Math.abs(slotRect.left - luffyRect.left),
        y: Math.abs(slotRect.top - luffyRect.top),
        width: Math.abs(slotRect.width - luffyRect.width),
        height: Math.abs(slotRect.height - luffyRect.height),
      };
      console.info(`[DarkCutscene] dock bounds delta: ${JSON.stringify(delta)}`);
    };

    const complete = () => {
      if (disposed) return;
      onComplete();
    };

    const skipToDock = () => {
      if (skipped || disposed || !timeline) return;
      skipped = true;
      timeline.pause().clear();
      gsap.set(stage, { x: 0, y: 0 });
      gsap.set(hand, { autoAlpha: 0 });
      gsap.set(fist, { autoAlpha: 0 });
      gsap.set(luffy, {
        x: 0,
        y: 0,
        scale: 1.12,
        autoAlpha: 0,
        filter: "blur(0px) brightness(0.4)",
        transformOrigin: "center center",
      });
      const target = dockValues();
      gsap.set(overlay, { opacity: 1 });
      timeline
        .fromTo(
          luffy,
          {
            x: 0,
            y: 0,
            scale: 1.12,
            autoAlpha: 0,
            filter: "blur(0px) brightness(0.4)",
          },
          {
            ...target,
            autoAlpha: 1,
            filter: "blur(0px) brightness(1)",
            duration: SKIP_DOCK_DURATION,
            ease: "power3.inOut",
            onComplete: logDockBounds,
          },
          0,
        )
        .to(overlay, { opacity: 0, duration: SKIP_DOCK_DURATION }, 0)
        .play(0);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      skipToDock();
    };
    skipActionRef.current = skipToDock;

    const run = async () => {
      await Promise.all(
        [hand, fist, luffyImage].map((image) => image.decode().catch(() => undefined)),
      );
      if (disposed) return;

      markDarkCutscenePlayed();
      gsap.set(overlay, { opacity: 1, x: 0, y: 0 });
      gsap.set(stage, { x: 0, y: 0 });
      gsap.set(hand, {
        autoAlpha: 0,
        scale: 0.55,
        filter: "blur(10px)",
        transformOrigin: "center center",
      });
      gsap.set(fist, {
        autoAlpha: 0,
        scale: 0.7,
        filter: "blur(0px)",
        transformOrigin: "center center",
      });
      gsap.set(luffy, {
        autoAlpha: 0,
        scale: 1.12,
        filter: "blur(0px) brightness(0.4)",
        transformOrigin: "center center",
        x: 0,
        y: 0,
      });

      const handStart = BLACK_HOLD;
      const handEnd = handStart + HAND_IN;
      const handFadeStart = handEnd + HAND_TO_FIST_GAP;
      const fistStart = handFadeStart + HAND_TO_FIST_FADE;
      const fistVisible = fistStart + FIST_POKE_IN;
      const firstFistBack = fistVisible + FIRST_FIST_HOLD;
      const luffyStart = firstFistBack + FIRST_FIST_BACK;
      const dockStart = luffyStart + LUFFY_IN + LUFFY_HOLD;

      timeline = gsap.timeline({ onComplete: complete });
      timeline.set(skip, { visibility: "visible", opacity: 0 }, SKIP_APPEARS_AT);
      timeline.call(
        () => skip.focus({ preventScroll: true }),
        [],
        SKIP_APPEARS_AT,
      );
      timeline.to(skip, {
        opacity: 1,
        duration: SKIP_FADE_DURATION,
        ease: "none",
      }, SKIP_APPEARS_AT);
      timeline.to(hand, {
        autoAlpha: 1,
        scale: 1,
        filter: "blur(0px)",
        duration: HAND_IN,
        ease: "power3.out",
      }, handStart);
      timeline.to(hand, { scale: 1.05, duration: HAND_PUSH, ease: "sine.inOut" }, handEnd);
      timeline.to(hand, {
        autoAlpha: 0,
        scale: 1.15,
        duration: HAND_TO_FIST_FADE,
        ease: "power2.inOut",
      }, handFadeStart);
      timeline.to(fist, {
        autoAlpha: 1,
        scale: 1,
        duration: FIST_POKE_IN,
        ease: "power4.out",
      }, fistStart);
      timeline.to(stage, {
        x: 7,
        y: -6,
        duration: CAMERA_SHAKE / 7,
        repeat: 6,
        yoyo: true,
        ease: "sine.inOut",
      }, fistStart);
      timeline.to(fist, {
        autoAlpha: 0,
        scale: 0.6,
        duration: FIRST_FIST_BACK,
        ease: "power2.in",
      }, firstFistBack);
      timeline.to(luffy, {
        autoAlpha: 1,
        scale: 1,
        filter: "blur(0px) brightness(1)",
        duration: LUFFY_IN,
        ease: "power2.out",
      }, luffyStart);
      timeline.set(fist, { autoAlpha: 0 }, luffyStart);
      timeline.to(luffy, { duration: LUFFY_HOLD }, luffyStart + LUFFY_IN);
      timeline.addLabel("dock", dockStart);
      timeline.to(luffy, {
        x: () => dockValues().x,
        y: () => dockValues().y,
        scale: () => dockValues().scale,
        duration: DOCK_DURATION,
        ease: "power3.inOut",
        onComplete: logDockBounds,
      }, dockStart);
      timeline.to(overlay, {
        opacity: 0,
        duration: OVERLAY_FADE_DURATION,
        ease: "none",
      }, dockStart + OVERLAY_FADE_DELAY);

      console.info(`[DarkCutscene] timeline duration: ${timeline.duration().toFixed(2)}s`);
      timeline.play(0);
    };

    window.addEventListener("keydown", onKeyDown);
    onBegin();
    void run();

    return () => {
      disposed = true;
      window.removeEventListener("keydown", onKeyDown);
      skipActionRef.current = null;
      timeline?.kill();
      gsap.killTweensOf([overlay, stage, hand, fist, luffy, skip]);
    };
  }, [active, onBegin, onComplete]);

  if (!active) return null;

  return (
    <div className="dark-cutscene" ref={overlayRef}>
      <div className="dark-cutscene-stage" ref={stageRef} aria-hidden="true">
        <img className="dark-cutscene-image dark-cutscene-hand" ref={handRef} src="/art/dark/hand.png" alt="" />
        <img className="dark-cutscene-image dark-cutscene-fist" ref={fistRef} src="/art/dark/fist.png" alt="" />
        <div className="dark-cutscene-luffy-frame" ref={luffyRef}>
          <img className="dark-cutscene-luffy" ref={luffyImageRef} src="/art/dark/luffy.png" alt="" />
        </div>
      </div>
      <button className="dark-cutscene-skip" ref={skipRef} type="button" onClick={() => skipActionRef.current?.()}>
        Skip
      </button>
    </div>
  );
}
