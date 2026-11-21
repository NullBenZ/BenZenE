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
const PAGE_END_SNAP_DISTANCE = 72;
const SHOW_PETAL_COUNTER = false;
const PETAL_SPRITE_WIDTH = 100;
const PETAL_SPRITE_HEIGHT = 70;
const PALETTE_STEP_SECONDS = 30;
const MAX_PETAL_SPRITES = 120;
const PETAL_PALETTE = [
  "#7A1730",
  "#8E2419",
  "#A63A4A",
  "#B34A66",
  "#C77088",
  "#D9A08A",
];
type PetalShape =
  | "broad"
  | "narrow"
  | "curve-down"
  | "curve-up"
  | "crescent-down"
  | "crescent-up"
  | "notched"
  | "pointed"
  | "folded";

const SHAPE_CONFIG: Record<
  PetalShape,
  {
    bend: number;
    widthRatio: number;
    tip: "round" | "notched" | "pointed";
    folded?: boolean;
  }
> = {
  broad: { bend: 0, widthRatio: 0.7, tip: "round" },
  narrow: { bend: 0, widthRatio: 0.46, tip: "round" },
  "curve-down": { bend: 0.3, widthRatio: 0.7, tip: "round" },
  "curve-up": { bend: -0.3, widthRatio: 0.7, tip: "round" },
  "crescent-down": { bend: 0.5, widthRatio: 0.5, tip: "round" },
  "crescent-up": { bend: -0.5, widthRatio: 0.5, tip: "round" },
  notched: { bend: 0, widthRatio: 0.7, tip: "notched" },
  pointed: { bend: 0, widthRatio: 0.62, tip: "pointed" },
  folded: { bend: 0, widthRatio: 0.7, tip: "round", folded: true },
};
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
  shape: PetalShape;
  tipColor: string;
  flipX: boolean;
};

type StoredPetal = {
  x: number;
  y: number;
  rotation: number;
  shape: PetalShape;
  tipColor: string;
  flipX: boolean;
  size: number;
};

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

const spriteCache = new Map<string, HTMLCanvasElement>();

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;
  const lightness = (max + min) / 2;
  let saturation = 0;
  if (delta) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return { h: hue, s: saturation, l: lightness };
}

function hslToHex(h: number, s: number, l: number) {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const section = h / 60;
  const x = chroma * (1 - Math.abs((section % 2) - 1));
  const [r, g, b] =
    section < 1
      ? [chroma, x, 0]
      : section < 2
        ? [x, chroma, 0]
        : section < 3
          ? [0, chroma, x]
          : section < 4
            ? [0, x, chroma]
            : section < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];
  const offset = l - chroma / 2;
  return `#${[r, g, b]
    .map((channel) => Math.round((channel + offset) * 255))
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function interpolateColor(from: string, to: string, amount: number) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const channel = (start: number, end: number) =>
    Math.round(start + (end - start) * amount)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(a.r, b.r)}${channel(a.g, b.g)}${channel(a.b, b.b)}`;
}

function currentPaletteColor(elapsedSeconds: number) {
  const lastIndex = PETAL_PALETTE.length - 1;
  const cycleLength = lastIndex * 2;
  const cycle = (elapsedSeconds / PALETTE_STEP_SECONDS) % cycleLength;
  const position = cycle <= lastIndex ? cycle : cycleLength - cycle;
  const lower = Math.floor(position);
  const upper = Math.min(lastIndex, lower + 1);
  return interpolateColor(
    PETAL_PALETTE[lower],
    PETAL_PALETTE[upper],
    position - lower,
  );
}

function jitterLightness(color: string) {
  const { h, s, l } = rgbToHsl(hexToRgb(color));
  const quantizedLightness = Math.round(
    clamp(l + randomBetween(-0.06, 0.06), 0.08, 0.82) * 100,
  );
  return hslToHex(h, s, quantizedLightness / 100);
}

function chooseShape(): PetalShape {
  const pick = Math.random();
  const family =
    pick < 0.35
      ? (["broad", "narrow"] as const)
      : pick < 0.75
        ? (["curve-down", "curve-up"] as const)
        : ([
            "crescent-down",
            "crescent-up",
            "notched",
            "pointed",
            "folded",
          ] as const);
  return family[Math.floor(Math.random() * family.length)];
}

function createPetalSprite(shape: PetalShape, tipColor: string, dpr: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(PETAL_SPRITE_WIDTH * dpr);
  canvas.height = Math.ceil(PETAL_SPRITE_HEIGHT * dpr);
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.scale(dpr, dpr);

  const config = SHAPE_CONFIG[shape];
  const halfWidth = 28 * (config.widthRatio / 0.7);
  const tipY = 35 + config.bend * 24;
  const shapePath = new Path2D();
  shapePath.moveTo(4, 35);
  shapePath.bezierCurveTo(
    18,
    35 - halfWidth * 0.78 + config.bend * 2,
    49,
    35 - halfWidth + config.bend * 9,
    76,
    35 - halfWidth * 0.62 + config.bend * 15,
  );
  shapePath.bezierCurveTo(
    86,
    tipY - halfWidth * 0.56,
    92,
    tipY - halfWidth * 0.42,
    96,
    tipY - (config.tip === "pointed" ? 2 : 4),
  );
  if (config.tip === "pointed") {
    shapePath.lineTo(100, tipY);
  } else if (config.tip === "notched") {
    shapePath.bezierCurveTo(98, tipY - 1, 96, tipY - 1, 94, tipY + 2);
    shapePath.bezierCurveTo(96, tipY + 1, 98, tipY + 2, 100, tipY + 5);
  } else {
    shapePath.bezierCurveTo(101, tipY - 1, 99, tipY + 1, 100, tipY + 4);
  }
  shapePath.bezierCurveTo(
    92,
    tipY + halfWidth * 0.44,
    84,
    tipY + halfWidth * 0.58,
    76,
    35 + halfWidth * 0.62 + config.bend * 15,
  );
  shapePath.bezierCurveTo(
    49,
    35 + halfWidth - config.bend * 9,
    18,
    35 + halfWidth * 0.78 - config.bend * 2,
    4,
    35,
  );
  shapePath.closePath();

  const { h, s, l } = rgbToHsl(hexToRgb(tipColor));
  const baseColor = hslToHex(h, s, l * 0.65);
  const veinColor = hslToHex(h, Math.min(1, s * 0.35), Math.min(0.9, l + 0.34));
  const edgeColor = hslToHex(h, Math.min(1, s * 0.25), Math.min(0.94, l + 0.4));
  const gradient = context.createLinearGradient(4, 35, 98, tipY);
  gradient.addColorStop(0, baseColor);
  gradient.addColorStop(1, tipColor);
  context.save();
  context.shadowColor = "rgb(20 0 8 / 55%)";
  context.shadowBlur = 3;
  context.shadowOffsetY = 1;
  context.fillStyle = gradient;
  context.fill(shapePath);
  context.restore();

  context.save();
  context.clip(shapePath);
  const innerShade = context.createLinearGradient(0, 0, 0, PETAL_SPRITE_HEIGHT);
  innerShade.addColorStop(0, "rgb(255 235 239 / 13%)");
  innerShade.addColorStop(0.52, "rgb(35 0 12 / 0%)");
  innerShade.addColorStop(1, "rgb(24 0 8 / 28%)");
  context.fillStyle = innerShade;
  context.fillRect(0, 0, PETAL_SPRITE_WIDTH, PETAL_SPRITE_HEIGHT);

  context.lineCap = "round";
  context.lineWidth = 0.7;
  context.strokeStyle = `${veinColor}4d`;
  for (let vein = 0; vein < 5; vein += 1) {
    const startY = 35 + ((vein - 2) / 2) * halfWidth * 0.32;
    const endY = tipY + (vein - 2) * halfWidth * 0.1;
    context.beginPath();
    context.moveTo(7, 35);
    context.quadraticCurveTo(48, (startY + endY) / 2, 91, endY);
    context.stroke();
  }

  if (config.folded) {
    context.save();
    context.globalAlpha = 0.14;
    context.fillStyle = "#180008";
    context.fillRect(0, 35, PETAL_SPRITE_WIDTH, PETAL_SPRITE_HEIGHT / 2);
    context.restore();
    context.beginPath();
    context.moveTo(7, 35);
    context.quadraticCurveTo(50, 35 + config.bend * 10, 93, tipY);
    context.lineWidth = 0.65;
    context.strokeStyle = `${edgeColor}66`;
    context.stroke();
  }

  context.lineWidth = 0.8;
  context.strokeStyle = `${edgeColor}59`;
  context.stroke(shapePath);
  context.restore();
  return canvas;
}

function getPetalSprite(shape: PetalShape, tipColor: string, dpr: number) {
  const key = `${shape}:${tipColor}:${dpr}`;
  const cached = spriteCache.get(key);
  if (cached) {
    spriteCache.delete(key);
    spriteCache.set(key, cached);
    return cached;
  }
  const sprite = createPetalSprite(shape, tipColor, dpr);
  spriteCache.set(key, sprite);
  if (spriteCache.size > MAX_PETAL_SPRITES) {
    const oldest = spriteCache.keys().next().value;
    if (oldest) spriteCache.delete(oldest);
  }
  return sprite;
}

function drawPetal(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  rotation: number,
  shape: PetalShape,
  tipColor: string,
  flipX: boolean,
  dpr: number,
  verticalScale = 1,
  edgeDarkening = 0,
) {
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  if (flipX) context.scale(-1, 1);
  context.filter = `brightness(${1 - edgeDarkening * 0.2})`;
  context.drawImage(
    getPetalSprite(shape, tipColor, dpr),
    -length / 2,
    (-length * 0.7 * verticalScale) / 2,
    length,
    length * 0.7 * verticalScale,
  );
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
      const rootBottom =
        pageRoot.getBoundingClientRect().bottom + window.scrollY;
      const viewportBottom = window.scrollY + window.innerHeight;
      const snapToViewport =
        rootBottom - viewportBottom <= PAGE_END_SNAP_DISTANCE;
      pageRoot.dataset.atPageEnd = String(snapToViewport);
      pageBottom = snapToViewport
        ? Math.min(rootBottom, viewportBottom)
        : rootBottom;
    };

    const drawStoredPile = () => {
      const canvasWidth = pileCanvas.width / dpr;
      pileContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      pileContext.clearRect(0, 0, canvasWidth, pileCanvasHeight);
      landed.forEach((petal) => {
        drawPetal(
          pileContext,
          petal.x,
          petal.y,
          petal.size,
          petal.rotation,
          petal.shape,
          petal.tipColor,
          petal.flipX,
          dpr,
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
      const nextDpr = Math.max(1, window.devicePixelRatio || 1);
      if (nextDpr !== dpr) spriteCache.clear();
      dpr = nextDpr;
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
      source: FallingPetal,
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
        shape: source.shape,
        tipColor: source.tipColor,
        flipX: source.flipX,
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
      const paletteColor = currentPaletteColor(performance.now() / 1000);
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
            (window.innerWidth < 640
              ? randomBetween(14, 22)
              : randomBetween(18, 28)) * randomBetween(0.85, 1.25),
          shape: chooseShape(),
          tipColor: jitterLightness(paletteColor),
          flipX: Math.random() < 0.5,
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
          storeLanding(drawX, petal.length, petal, column);
          falling.splice(index, 1);
          continue;
        }

        drawPetal(
          airContext,
          drawX,
          petal.y - window.scrollY,
          petal.length,
          petal.rotation,
          petal.shape,
          petal.tipColor,
          petal.flipX,
          dpr,
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
