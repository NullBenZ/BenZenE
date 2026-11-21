"use client";

import gsap from "gsap";
import { useEffect, useRef, useState } from "react";

const BURST_DESKTOP = 9;
const BURST_PHONE = 6;
const MAX_PILE_DESKTOP = 44;
const MAX_PILE_PHONE = 32;
const MAX_STORED_PETALS = 500;
const PILE_COLUMN_WIDTH = 6;
const PILE_BASE_INSET = 8;
const PETAL_PATH_DATA =
  "M0,50 C20,10 90,0 150,22 C195,40 195,60 150,78 C90,100 20,90 0,50 Z";
const PETAL_COLORS = [
  "#8E2419",
  "#8E2419",
  "#A63A2B",
  "#A63A2B",
  "#C83E28",
  "#C7AE8B",
];
const FRAME_DURATION = 1000 / 60;
const DRAG_PER_FRAME = 0.96;
const GRAVITY_PER_FRAME = 0.16;
const TERMINAL_FALL_PER_FRAME = 1.2;

type FallingPetal = {
  x: number;
  // Vertical position in document coordinates so every petal falls to the
  // page's actual bottom even when it was clicked far above it.
  y: number;
  vx: number;
  vy: number;
  age: number;
  swayAmplitude: number;
  swayFrequency: number;
  phase: number;
  rotation: number;
  spin: number;
  flutterFrequency: number;
  length: number;
  color: string;
};

type StoredPetal = {
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
};

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function chooseColor() {
  const pick = Math.random();
  if (pick < 0.34) return PETAL_COLORS[0];
  if (pick < 0.64) return PETAL_COLORS[2];
  if (pick < 0.86) return PETAL_COLORS[4];
  return PETAL_COLORS[5];
}

function drawPetal(
  context: CanvasRenderingContext2D,
  path: Path2D,
  x: number,
  y: number,
  length: number,
  rotation: number,
  color: string,
  verticalScale = 1,
) {
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.scale(length / 200, (length * 0.5 * verticalScale) / 100);
  context.translate(-100, -50);
  context.fillStyle = color;
  context.fill(path);
  context.restore();
}

export default function PetalClicks() {
  const airCanvasRef = useRef<HTMLCanvasElement>(null);
  const pileCanvasRef = useRef<HTMLCanvasElement>(null);
  const noteRef = useRef<HTMLParagraphElement>(null);
  const countTextRef = useRef<HTMLSpanElement>(null);
  const petalWordRef = useRef<HTMLSpanElement>(null);
  const displayedCountRef = useRef(0);
  const counterVisibleRef = useRef(false);
  const noteTweenRef = useRef<gsap.core.Tween | null>(null);
  const countTweenRef = useRef<gsap.core.Tween | null>(null);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [spawnedCount, setSpawnedCount] = useState(0);
  const [atBottom, setAtBottom] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setReducedMotion(motionQuery.matches);
    syncPreference();
    motionQuery.addEventListener("change", syncPreference);
    return () => motionQuery.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    const airCanvas = airCanvasRef.current;
    const pileCanvas = pileCanvasRef.current;
    const airContext = airCanvas?.getContext("2d");
    const pileContext = pileCanvas?.getContext("2d");
    if (!airCanvas || !pileCanvas || !airContext || !pileContext) return;

    const path = new Path2D(PETAL_PATH_DATA);
    const falling: FallingPetal[] = [];
    const landed: StoredPetal[] = [];
    let pileHeights: number[] = [];
    let width = 0;
    let height = 0;
    const footer = pileCanvas.closest<HTMLElement>(".site-footer");
    if (!footer) return;
    let pageBottom = 0;
    let maxPileHeight = MAX_PILE_DESKTOP;
    let pileCanvasHeight = maxPileHeight + PILE_BASE_INSET;
    let dpr = 1;
    let frame = 0;
    let lastFrame = 0;
    let lastBurstAt = Number.NEGATIVE_INFINITY;
    let tabVisible = !document.hidden;
    let disposed = false;

    const positionPileAtDocumentBottom = () => {
      pageBottom = footer.getBoundingClientRect().bottom + window.scrollY;
    };

    const drawStoredPile = () => {
      const canvasWidth = pileCanvas.width / dpr;
      pileContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      pileContext.clearRect(0, 0, canvasWidth, pileCanvasHeight);
      landed.forEach((petal) => {
        drawPetal(
          pileContext,
          path,
          petal.x,
          petal.y,
          petal.size,
          petal.rotation,
          petal.color,
          0.5,
        );
      });
    };

    const rebuildHeightMap = () => {
      const columns = Math.ceil(width / PILE_COLUMN_WIDTH);
      pileHeights = Array.from({ length: columns }, () => 0);
      const baseline = pileCanvasHeight - PILE_BASE_INSET;
      landed.forEach((petal) => {
        const centerColumn = Math.floor(petal.x / PILE_COLUMN_WIDTH);
        const heightAtPetal = Math.max(
          0,
          Math.min(maxPileHeight, baseline - (petal.y + petal.size * 0.12)),
        );
        [-1, 0, 1].forEach((offset) => {
          const column = centerColumn + offset;
          if (column < 0 || column >= pileHeights.length) return;
          pileHeights[column] = Math.max(
            pileHeights[column],
            heightAtPetal * (offset === 0 ? 1 : 0.5),
          );
        });
      });
    };

    const resize = () => {
      const previousWidth = width || window.innerWidth;
      const previousPileCanvasHeight = pileCanvasHeight;
      width = window.innerWidth;
      height = window.innerHeight;
      maxPileHeight = width < 640 ? MAX_PILE_PHONE : MAX_PILE_DESKTOP;
      pileCanvasHeight = maxPileHeight + PILE_BASE_INSET;
      dpr = Math.max(1, window.devicePixelRatio || 1);
      positionPileAtDocumentBottom();

      airCanvas.width = Math.round(width * dpr);
      airCanvas.height = Math.round(height * dpr);
      airCanvas.style.width = `${width}px`;
      airCanvas.style.height = `${height}px`;
      airContext.setTransform(dpr, 0, 0, dpr, 0, 0);

      pileCanvas.width = Math.round(width * dpr);
      pileCanvas.height = Math.round(pileCanvasHeight * dpr);
      pileCanvas.style.width = `${width}px`;
      pileCanvas.style.height = `${pileCanvasHeight}px`;
      pileCanvas.style.setProperty("--petal-pile-height", `${maxPileHeight}px`);
      landed.forEach((petal) => {
        petal.x *= width / previousWidth;
        petal.y += pileCanvasHeight - previousPileCanvasHeight;
      });
      rebuildHeightMap();
      drawStoredPile();
    };

    const storeLanding = (
      x: number,
      length: number,
      color: string,
      column: number,
    ) => {
      const baseY = pileCanvasHeight - PILE_BASE_INSET;
      const currentHeight = Math.min(maxPileHeight, pileHeights[column] ?? 0);
      const remainingAtCap =
        currentHeight >= maxPileHeight ? randomBetween(0, 6) : 0;
      const landY = baseY - currentHeight + remainingAtCap;
      const stored: StoredPetal = {
        x,
        y: landY,
        rotation: randomBetween(-25, 25) * (Math.PI / 180),
        color,
        size: length,
      };

      landed.push(stored);
      if (landed.length > MAX_STORED_PETALS) landed.shift();

      if (currentHeight < maxPileHeight) {
        const neighbors = [
          { index: column - 1, increment: 0.8 },
          { index: column, increment: 1.6 },
          { index: column + 1, increment: 0.8 },
        ];
        neighbors.forEach(({ index, increment }) => {
          if (index < 0 || index >= pileHeights.length) return;
          pileHeights[index] = Math.min(
            maxPileHeight,
            (pileHeights[index] ?? 0) + increment,
          );
        });
      }
      drawStoredPile();
    };

    const scheduleFrame = () => {
      if (frame || !tabVisible || !falling.length || disposed) return;
      lastFrame = 0;
      frame = window.requestAnimationFrame(tick);
    };

    const spawnBurst = (x: number, y: number) => {
      const amount = window.innerWidth < 640 ? BURST_PHONE : BURST_DESKTOP;
      for (let index = 0; index < amount; index += 1) {
        const direction = randomBetween(0, Math.PI * 2);
        const speed = randomBetween(2, 5);
        falling.push({
          x,
          y: y + window.scrollY,
          vx: Math.cos(direction) * speed,
          vy: Math.sin(direction) * speed - randomBetween(0.4, 1.1),
          age: 0,
          swayAmplitude: randomBetween(15, 25),
          swayFrequency: randomBetween(0.8, 1.8),
          phase: randomBetween(0, Math.PI * 2),
          rotation: randomBetween(-Math.PI, Math.PI),
          spin: randomBetween(-0.025, 0.025),
          flutterFrequency: randomBetween(5, 9),
          length: randomBetween(9, 16),
          color: chooseColor(),
        });
      }
      setSpawnedCount((count) => count + amount);
      scheduleFrame();
    };

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(".eidolon-flower-orb, .eidolon-flower-petal")
      ) {
        return;
      }
      const now = performance.now();
      if (now - lastBurstAt < 150) return;
      lastBurstAt = now;
      spawnBurst(event.clientX, event.clientY);
    };

    const tick = (now: number) => {
      frame = 0;
      if (!tabVisible || disposed) return;
      const delta = lastFrame ? Math.min(48, now - lastFrame) : FRAME_DURATION;
      const frameFactor = delta / FRAME_DURATION;
      const seconds = delta / 1000;
      lastFrame = now;
      airContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      airContext.clearRect(0, 0, width, height);

      for (let index = falling.length - 1; index >= 0; index -= 1) {
        const petal = falling[index];
        petal.age += seconds;
        petal.vx *= DRAG_PER_FRAME ** frameFactor;
        petal.vy = Math.min(
          TERMINAL_FALL_PER_FRAME,
          petal.vy * DRAG_PER_FRAME ** frameFactor +
            GRAVITY_PER_FRAME * frameFactor,
        );
        petal.x += petal.vx * frameFactor;
        petal.y += petal.vy * frameFactor;
        petal.rotation += petal.spin * frameFactor;

        if (petal.x < -petal.length || petal.x > width + petal.length) {
          falling.splice(index, 1);
          continue;
        }

        const column = Math.max(
          0,
          Math.min(
            pileHeights.length - 1,
            Math.floor(petal.x / PILE_COLUMN_WIDTH),
          ),
        );
        const pileHeight = Math.min(maxPileHeight, pileHeights[column] ?? 0);
        const pileTop = pageBottom - PILE_BASE_INSET - pileHeight;
        const sway =
          Math.sin(petal.age * petal.swayFrequency + petal.phase) *
          petal.swayAmplitude;
        const drawX = petal.x + sway;
        const flip = Math.max(
          0.12,
          Math.abs(Math.cos(petal.age * petal.flutterFrequency + petal.phase)),
        );
        const halfHeight = petal.length * 0.25 * flip;

        if (petal.y + halfHeight >= pileTop) {
          storeLanding(drawX, petal.length, petal.color, column);
          falling.splice(index, 1);
          continue;
        }

        drawPetal(
          airContext,
          path,
          drawX,
          petal.y - window.scrollY,
          petal.length,
          petal.rotation,
          petal.color,
          flip,
        );
      }

      if (falling.length) scheduleFrame();
      else {
        lastFrame = 0;
        airContext.clearRect(0, 0, width, height);
      }
    };

    const onVisibilityChange = () => {
      tabVisible = !document.hidden;
      if (!tabVisible && frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
        lastFrame = 0;
      } else if (tabVisible) {
        scheduleFrame();
      }
    };

    const onScroll = () => {
      positionPileAtDocumentBottom();
      scheduleFrame();
    };

    const pageSizeObserver = new ResizeObserver(positionPileAtDocumentBottom);
    pageSizeObserver.observe(document.body);
    pageSizeObserver.observe(footer);

    resize();
    document.addEventListener("click", onDocumentClick, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      disposed = true;
      if (frame) window.cancelAnimationFrame(frame);
      document.removeEventListener("click", onDocumentClick);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      pageSizeObserver.disconnect();
      falling.length = 0;
      landed.length = 0;
    };
  }, [reducedMotion]);

  useEffect(() => {
    const note = noteRef.current;
    const countText = countTextRef.current;
    const petalWord = petalWordRef.current;
    if (!note || !countText || !petalWord) return;

    const countValue = { value: displayedCountRef.current };

    const setVisibility = () => {
      const shouldShow = !reducedMotion && atBottom && spawnedCount > 0;
      noteTweenRef.current?.kill();
      countTweenRef.current?.kill();

      if (!shouldShow) {
        const wasVisible = counterVisibleRef.current;
        counterVisibleRef.current = false;
        displayedCountRef.current = 0;
        countText.textContent = "0";
        if (wasVisible) {
          noteTweenRef.current = gsap.to(note, {
            autoAlpha: 0,
            y: 8,
            duration: 0.24,
            ease: "power1.out",
          });
        } else {
          gsap.set(note, { autoAlpha: 0, y: 8 });
        }
        return;
      }

      if (!counterVisibleRef.current) {
        displayedCountRef.current = 0;
        countText.textContent = "0";
        counterVisibleRef.current = true;
        noteTweenRef.current = gsap.to(note, {
          autoAlpha: 1,
          y: 0,
          duration: 0.28,
          ease: "power2.out",
        });
      }
      countValue.value = displayedCountRef.current;
      countTweenRef.current = gsap.to(countValue, {
        value: spawnedCount,
        duration: 1,
        ease: "power1.out",
        onUpdate: () => {
          displayedCountRef.current = Math.round(countValue.value);
          countText.textContent = String(displayedCountRef.current);
          petalWord.textContent =
            displayedCountRef.current === 1 ? "petal" : "petals";
        },
      });
    };

    setVisibility();
    return () => {
      noteTweenRef.current?.kill();
      countTweenRef.current?.kill();
    };
  }, [atBottom, reducedMotion, spawnedCount]);

  useEffect(() => {
    if (reducedMotion) return;
    let frame = 0;
    const checkBottom = () => {
      frame = 0;
      const distanceToEnd =
        document.documentElement.scrollHeight -
        (window.scrollY + window.innerHeight);
      setAtBottom(distanceToEnd <= 120);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(checkBottom);
    };
    checkBottom();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <>
      <canvas
        ref={pileCanvasRef}
        className="petal-clicks-pile"
        aria-hidden="true"
      />
      <canvas
        ref={airCanvasRef}
        className="petal-clicks-air"
        aria-hidden="true"
      />
      {spawnedCount > 0 && (
        <p className="petal-clicks-counter" ref={noteRef}>
          You made <span ref={countTextRef}>0</span> flower{" "}
          <span ref={petalWordRef}>petals</span> fall during your journey
          through this site.
        </p>
      )}
    </>
  );
}
