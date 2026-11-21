"use client";

import gsap from "gsap";
import { useEffect, useRef, useState } from "react";

const BURST_DESKTOP = 9;
const BURST_PHONE = 6;
const MAX_PILE_DESKTOP = 44;
const MAX_PILE_PHONE = 32;
const MAX_STORED_PETALS = 500;
const PILE_COLUMN_WIDTH = 6;
const PILE_BASE_INSET = 0;
const PILE_CANVAS_EXTRA = 8;
const SHOW_PETAL_COUNTER = false;
const PETAL_SPRITE_WIDTH = 100;
const PETAL_SPRITE_HEIGHT = 70;
const PETAL_SPRITE_COLORS = [
  "#5E0C22",
  "#6E0F2A",
  "#8C1D3A",
  "#5E0C22",
  "#6E0F2A",
  "#8C1D3A",
  "#B34A66",
  "#C77088",
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
  sprite: number;
};

type StoredPetal = {
  x: number;
  y: number;
  rotation: number;
  sprite: number;
  size: number;
};

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function drawPetal(
  context: CanvasRenderingContext2D,
  sprites: HTMLCanvasElement[],
  x: number,
  y: number,
  length: number,
  rotation: number,
  sprite: number,
  verticalScale = 1,
  edgeDarkening = 0,
) {
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.filter = `brightness(${1 - edgeDarkening * 0.2})`;
  context.drawImage(
    sprites[sprite],
    -length / 2,
    (-length * 0.7 * verticalScale) / 2,
    length,
    length * 0.7 * verticalScale,
  );
  context.restore();
}

function createPetalSprites(dpr: number) {
  return PETAL_SPRITE_COLORS.map((tipColor, variant) => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(PETAL_SPRITE_WIDTH * dpr);
    canvas.height = Math.ceil(PETAL_SPRITE_HEIGHT * dpr);
    const context = canvas.getContext("2d");
    if (!context) return canvas;
    context.scale(dpr, dpr);

    const bend = (variant % 4) * 1.3 - 1.95;
    const path = new Path2D(
      `M4,35 C18,${9 + bend} 52,${1 + bend} 77,10 C88,13 94,17 97,23 C101,28 94,31 99,35 C96,40 101,44 96,49 C92,58 81,61 74,62 C48,70 18,59 4,35 Z`,
    );
    const gradient = context.createLinearGradient(4, 35, 98, 35);
    gradient.addColorStop(0, "#4E0A1C");
    gradient.addColorStop(1, tipColor);
    context.save();
    context.shadowColor = "rgb(20 0 8 / 55%)";
    context.shadowBlur = 3;
    context.shadowOffsetY = 1;
    context.fillStyle = gradient;
    context.fill(path);
    context.restore();

    context.save();
    context.clip(path);
    const innerShade = context.createLinearGradient(
      0,
      0,
      0,
      PETAL_SPRITE_HEIGHT,
    );
    innerShade.addColorStop(0, "rgb(255 235 239 / 13%)");
    innerShade.addColorStop(0.52, "rgb(35 0 12 / 0%)");
    innerShade.addColorStop(1, "rgb(24 0 8 / 28%)");
    context.fillStyle = innerShade;
    context.fillRect(0, 0, PETAL_SPRITE_WIDTH, PETAL_SPRITE_HEIGHT);

    context.lineCap = "round";
    context.lineWidth = 0.7;
    context.strokeStyle = "rgb(217 168 180 / 30%)";
    const veinCount = 4 + (variant % 3);
    for (let vein = 0; vein < veinCount; vein += 1) {
      const endY = 17 + (vein / (veinCount - 1)) * 36;
      context.beginPath();
      context.moveTo(7, 35);
      context.quadraticCurveTo(45, 35 + (endY - 35) * 0.3, 91, endY);
      context.stroke();
    }
    context.lineWidth = 0.8;
    context.strokeStyle = "rgb(232 196 204 / 35%)";
    context.stroke(path);
    context.restore();
    return canvas;
  });
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

    let sprites: HTMLCanvasElement[] = [];
    const falling: FallingPetal[] = [];
    const landed: StoredPetal[] = [];
    let pileHeights: number[] = [];
    let width = 0;
    let height = 0;
    const pageRoot = pileCanvas.closest<HTMLElement>(".home-screen");
    if (!pageRoot) return;
    let pageBottom = 0;
    let maxPileHeight = MAX_PILE_DESKTOP;
    let pileCanvasHeight = maxPileHeight + PILE_CANVAS_EXTRA;
    let dpr = 1;
    let frame = 0;
    let lastFrame = 0;
    let lastBurstAt = Number.NEGATIVE_INFINITY;
    let tabVisible = !document.hidden;
    let disposed = false;

    const positionPileAtDocumentBottom = () => {
      pageBottom = pageRoot.getBoundingClientRect().bottom + window.scrollY;
    };

    const drawStoredPile = () => {
      const canvasWidth = pileCanvas.width / dpr;
      pileContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      pileContext.clearRect(0, 0, canvasWidth, pileCanvasHeight);
      landed.forEach((petal) => {
        drawPetal(
          pileContext,
          sprites,
          petal.x,
          petal.y,
          petal.size,
          petal.rotation,
          petal.sprite,
          0.55,
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
          Math.min(maxPileHeight, baseline - (petal.y - petal.size * 0.19)),
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
      pileCanvasHeight = maxPileHeight + PILE_CANVAS_EXTRA;
      dpr = Math.max(1, window.devicePixelRatio || 1);
      sprites = createPetalSprites(dpr);
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
      sprite: number,
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
        sprite,
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
          length:
            window.innerWidth < 640
              ? randomBetween(14, 22)
              : randomBetween(18, 28),
          sprite: Math.floor(Math.random() * sprites.length),
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
          0.4,
          Math.abs(Math.cos(petal.age * petal.flutterFrequency + petal.phase)),
        );
        const halfHeight = petal.length * 0.35 * flip;

        if (petal.y + halfHeight >= pileTop) {
          storeLanding(drawX, petal.length, petal.sprite, column);
          falling.splice(index, 1);
          continue;
        }

        drawPetal(
          airContext,
          sprites,
          drawX,
          petal.y - window.scrollY,
          petal.length,
          petal.rotation,
          petal.sprite,
          flip,
          1 - flip,
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
    pageSizeObserver.observe(pageRoot);

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
    if (!SHOW_PETAL_COUNTER) return;
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
    if (!SHOW_PETAL_COUNTER) return;
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
      {SHOW_PETAL_COUNTER && spawnedCount > 0 && (
        <p className="petal-clicks-counter" ref={noteRef}>
          You made <span ref={countTextRef}>0</span> flower{" "}
          <span ref={petalWordRef}>petals</span> fall during your journey
          through this site.
        </p>
      )}
    </>
  );
}
