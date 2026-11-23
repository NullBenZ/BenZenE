"use client";

import gsap from "gsap";
import { useEffect, useRef, useState } from "react";

const BURST_DESKTOP = 9;
const BURST_PHONE = 6;
const MAX_ALIVE_DESKTOP = 160;
const MAX_ALIVE_PHONE = 80;
const MAX_PILE_DESKTOP = 44;
const MAX_PILE_PHONE = 32;
const MAX_STORED_PETALS = 500;
const PILE_COLUMN_WIDTH = 6;
const PILE_BASE_INSET = 0;
const PAGE_END_SNAP_DISTANCE = 72;
const SHOW_PETAL_COUNTER = false;
const PETAL_SPRITE_WIDTH = 72;
const PETAL_SPRITE_HEIGHT = 62;
const PETAL_SPRITE_SCALE = 0.72;
const PALETTE_STEP_SECONDS = 30;
const MAX_PETAL_SPRITES = 12 * 9;
let PETAL_COLOR_STEPS: string[] = [];
let PETAL_SHADES = { light: "", mid: "", dark: "", fold: "" };
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
  broad: { bend: 0, widthRatio: 0.85, tip: "round" },
  narrow: { bend: 0, widthRatio: 0.38, tip: "round" },
  "curve-down": { bend: 0.35, widthRatio: 0.7, tip: "round" },
  "curve-up": { bend: -0.35, widthRatio: 0.7, tip: "round" },
  "crescent-down": { bend: 0.6, widthRatio: 0.5, tip: "round" },
  "crescent-up": { bend: -0.6, widthRatio: 0.5, tip: "round" },
  notched: { bend: 0, widthRatio: 0.7, tip: "notched" },
  pointed: { bend: 0, widthRatio: 0.62, tip: "pointed" },
  folded: { bend: 0, widthRatio: 0.7, tip: "round", folded: true },
};
const PETAL_SHAPES = Object.keys(SHAPE_CONFIG) as PetalShape[];
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
  colorStep: number;
  flipX: boolean;
  previousBounds?: { x: number; y: number; width: number; height: number };
};

type StoredPetal = {
  x: number;
  y: number;
  rotation: number;
  shape: PetalShape;
  colorStep: number;
  flipX: boolean;
  size: number;
};

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

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

function currentPaletteStep(elapsedSeconds: number) {
  const cycleLength = (PETAL_COLOR_STEPS.length - 1) * 2;
  const phase = Math.floor(elapsedSeconds / PALETTE_STEP_SECONDS) % cycleLength;
  return phase <= PETAL_COLOR_STEPS.length - 1
    ? phase
    : cycleLength - phase;
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

function createPetalSprite(shape: PetalShape, colorStep: number, dpr: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(PETAL_SPRITE_WIDTH * dpr);
  canvas.height = Math.ceil(PETAL_SPRITE_HEIGHT * dpr);
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.scale(dpr * PETAL_SPRITE_SCALE, dpr * PETAL_SPRITE_SCALE);

  const config = SHAPE_CONFIG[shape];
  const halfWidth = 48 * config.widthRatio;
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

  const tipColor = PETAL_COLOR_STEPS[colorStep];
  const { h, s, l } = rgbToHsl(hexToRgb(tipColor));
  const baseColor = hslToHex(h, s, l * 0.65);
  const veinColor = hslToHex(h, Math.min(1, s * 0.35), Math.min(0.9, l + 0.34));
  const edgeColor = hslToHex(h, Math.min(1, s * 0.25), Math.min(0.94, l + 0.4));
  context.translate(0, (PETAL_SPRITE_HEIGHT / PETAL_SPRITE_SCALE - 70) / 2);
  const gradient = context.createLinearGradient(4, 35, 98, tipY);
  gradient.addColorStop(0, baseColor);
  gradient.addColorStop(1, tipColor);
  context.save();
  context.fillStyle = gradient;
  context.fill(shapePath);
  context.restore();

  context.save();
  context.clip(shapePath);
  const innerShade = context.createLinearGradient(0, 0, 0, PETAL_SPRITE_HEIGHT);
  innerShade.addColorStop(0, PETAL_SHADES.light);
  innerShade.addColorStop(0.52, PETAL_SHADES.mid);
  innerShade.addColorStop(1, PETAL_SHADES.dark);
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
    context.fillStyle = PETAL_SHADES.fold;
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

function drawPetal(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  rotation: number,
  shape: PetalShape,
  colorStep: number,
  sprites: Map<string, HTMLCanvasElement>,
  flipX: boolean,
  dpr: number,
  verticalScale = 1,
  edgeDarkening = 0,
  opacity = 1,
) {
  const sprite = sprites.get(`${shape}:${colorStep}`);
  if (!sprite) return;
  const cosine = Math.cos(rotation) * (flipX ? -1 : 1);
  const sine = Math.sin(rotation) * (flipX ? -1 : 1);
  context.globalAlpha = opacity * (1 - edgeDarkening * 0.2);
  context.setTransform(
    dpr * cosine * (length / PETAL_SPRITE_WIDTH),
    dpr * sine * (length / PETAL_SPRITE_WIDTH),
    -dpr * sine * (length / PETAL_SPRITE_WIDTH),
    dpr * cosine * (length / PETAL_SPRITE_WIDTH) * verticalScale,
    dpr * x,
    dpr * y,
  );
  context.drawImage(
    sprite,
    0,
    0,
    sprite.width,
    sprite.height,
    -PETAL_SPRITE_WIDTH / 2,
    -PETAL_SPRITE_HEIGHT / 2,
    PETAL_SPRITE_WIDTH,
    PETAL_SPRITE_HEIGHT,
  );
  context.globalAlpha = 1;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export default function PetalClicks() {
  const airCanvasRef = useRef<HTMLCanvasElement>(null);
  const pileCanvasRef = useRef<HTMLCanvasElement>(null);
  const noteRef = useRef<HTMLParagraphElement>(null);
  const countTextRef = useRef<HTMLSpanElement>(null);
  const petalWordRef = useRef<HTMLSpanElement>(null);
  const displayedCountRef = useRef(0);
  const spawnedCountRef = useRef(0);
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
    const pileDrawQueue: StoredPetal[] = [];
    const sprites = new Map<string, HTMLCanvasElement>();
    const pendingBursts: Array<{ x: number; y: number }> = [];
    let pileHeights: number[] = [];
    let width = 0;
    let height = 0;
    const pageRoot = pileCanvas.closest<HTMLElement>(".home-screen");
    if (!pageRoot) return;
    let pageBottom = 0;
    let pageRootBottom = 0;
    let maxPileHeight = MAX_PILE_DESKTOP;
    let pileCanvasHeight = maxPileHeight;
    let dpr = 1;
    let frame = 0;
    let lastFrame = 0;
    let lastBurstAt = Number.NEGATIVE_INFINITY;
    let tabVisible = !document.hidden;
    let disposed = false;
    let spritesReady = false;
    let pendingSpriteRebuild = false;
    let idleHandle: number | ReturnType<typeof setTimeout> | null = null;
    let usingIdleCallback = false;
    let reducedQuality = false;
    let darkTheme = document.documentElement.dataset.theme === "dark";
    let smoothedFrameMs = 0;
    let slowFrameDuration = 0;
    let recoveryDuration = 0;
    let previousAirBounds: Array<{ x: number; y: number; width: number; height: number }> = [];

    const readThemeColors = () => {
      const styles = getComputedStyle(document.documentElement);
      const palette = styles.getPropertyValue("--petal-palette").split(",").map((color) => color.trim()).filter(Boolean);
      PETAL_COLOR_STEPS = Array.from({ length: 12 }, (_, step) => {
        const position = (step / 11) * (palette.length - 1);
        const lower = Math.floor(position);
        const upper = Math.min(palette.length - 1, lower + 1);
        return interpolateColor(palette[lower], palette[upper], position - lower);
      });
      PETAL_SHADES = {
        light: styles.getPropertyValue("--petal-shade-light").trim(),
        mid: styles.getPropertyValue("--petal-shade-mid").trim(),
        dark: styles.getPropertyValue("--petal-shade-dark").trim(),
        fold: styles.getPropertyValue("--petal-fold").trim(),
      };
    };

    const positionPileAtDocumentBottom = () => {
      const viewportBottom = window.scrollY + window.innerHeight;
      const snapToViewport =
        pageRootBottom - viewportBottom <= PAGE_END_SNAP_DISTANCE;
      pageRoot.dataset.atPageEnd = String(snapToViewport);
      pageBottom = snapToViewport
        ? Math.min(pageRootBottom, viewportBottom)
        : pageRootBottom;
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
          petal.colorStep,
          sprites,
          petal.flipX,
          dpr,
          0.55,
          0,
          0.85,
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
      pileCanvasHeight = maxPileHeight;
      const nextDpr = Math.max(
        1,
        Math.min(width > 1600 ? 1 : 2, window.devicePixelRatio || 1),
      );
      if (nextDpr !== dpr) {
        dpr = nextDpr;
        if (falling.length) {
          pendingSpriteRebuild = true;
        } else {
          if (idleHandle !== null) {
            if (usingIdleCallback) window.cancelIdleCallback(idleHandle as number);
            else globalThis.clearTimeout(idleHandle as ReturnType<typeof setTimeout>);
            idleHandle = null;
          }
          sprites.clear();
          spritesReady = false;
        }
      }
      pageRootBottom = pageRoot.getBoundingClientRect().bottom + window.scrollY;
      positionPileAtDocumentBottom();

      airCanvas.width = Math.round(width * dpr);
      airCanvas.height = Math.round(height * dpr);
      airCanvas.style.width = `${width}px`;
      airCanvas.style.height = `${height}px`;
      airContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      previousAirBounds = [];
      falling.forEach((petal) => { petal.previousBounds = undefined; });

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
      pileDrawQueue.length = 0;
      if (!spritesReady && !falling.length) scheduleSpriteChunk();
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
        colorStep: source.colorStep,
        flipX: source.flipX,
        size: length,
      };

      landed.push(stored);
      if (landed.length > MAX_STORED_PETALS) landed.shift();
      pileDrawQueue.push(stored);

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
    };

    const scheduleFrame = () => {
      if (
        frame ||
        !tabVisible ||
        (!falling.length && !pileDrawQueue.length) ||
        disposed
      ) return;
      lastFrame = 0;
      frame = window.requestAnimationFrame(tick);
    };

    const scheduleSpriteChunk = () => {
      if (disposed || spritesReady || idleHandle !== null) return;
      if ("requestIdleCallback" in window) {
        usingIdleCallback = true;
        idleHandle = window.requestIdleCallback((deadline) => {
          idleHandle = null;
          buildSpriteChunk(deadline);
        }, { timeout: 500 });
      } else {
        usingIdleCallback = false;
        idleHandle = globalThis.setTimeout(() => {
          idleHandle = null;
          buildSpriteChunk({ timeRemaining: () => 8, didTimeout: true } as IdleDeadline);
        }, 16);
      }
    };

    const buildSpriteChunk = (deadline?: IdleDeadline) => {
      if (disposed || spritesReady) return;
      let built = 0;
      while (built < 12 && sprites.size < MAX_PETAL_SPRITES &&
        (!deadline || deadline.timeRemaining() > 2 || deadline.didTimeout)) {
        const index = sprites.size;
        const shape = PETAL_SHAPES[Math.floor(index / PETAL_COLOR_STEPS.length)];
        const colorStep = index % PETAL_COLOR_STEPS.length;
        sprites.set(`${shape}:${colorStep}`, createPetalSprite(shape, colorStep, dpr));
        built += 1;
      }
      if (sprites.size >= MAX_PETAL_SPRITES) {
        spritesReady = true;
        if (landed.length) drawStoredPile();
        pendingBursts.splice(0).forEach(({ x, y }) => spawnBurst(x, y));
      } else scheduleSpriteChunk();
    };

    const spawnBurst = (x: number, y: number) => {
      const baseAmount = window.innerWidth < 640 ? BURST_PHONE : BURST_DESKTOP;
      const amount = reducedQuality ? Math.max(1, Math.floor(baseAmount * 0.6)) : baseAmount;
      const baseLimit = window.innerWidth < 640 ? MAX_ALIVE_PHONE : MAX_ALIVE_DESKTOP;
      const aliveLimit = reducedQuality ? Math.floor(baseLimit * 0.6) : baseLimit;
      const spawnCount = Math.min(amount, Math.max(0, aliveLimit - falling.length));
      const clockStep = currentPaletteStep(performance.now() / 1000);
      for (let index = 0; index < spawnCount; index += 1) {
        const direction = randomBetween(0, Math.PI * 2);
        const speed = randomBetween(2, 5);
        falling.push({
          x,
          y: y + window.scrollY,
          vx: Math.cos(direction) * speed,
          vy: darkTheme ? -randomBetween(1.2, 3.2) : Math.sin(direction) * speed - randomBetween(0.4, 1.1),
          age: 0,
          swayAmplitude: randomBetween(15, 25),
          swayFrequency: randomBetween(0.8, 1.8),
          phase: randomBetween(0, Math.PI * 2),
          rotation: randomBetween(-Math.PI, Math.PI),
          spin: randomBetween(-0.025, 0.025),
          flutterFrequency: randomBetween(5, 9),
          length: window.innerWidth < 640
            ? randomBetween(18, 28)
            : randomBetween(24, 36),
          shape: chooseShape(),
          colorStep: clamp(clockStep + Math.floor(randomBetween(-2, 3)), 0, 11),
          flipX: Math.random() < 0.5,
        });
      }
      spawnedCountRef.current += spawnCount;
      if (SHOW_PETAL_COUNTER) setSpawnedCount(spawnedCountRef.current);
      scheduleFrame();
    };

    const onDocumentClick = (event: MouseEvent) => {
      if (document.documentElement.dataset.themeTransitioning === "true") return;
      const now = performance.now();
      if (now - lastBurstAt < 150) return;
      lastBurstAt = now;
      if (spritesReady) spawnBurst(event.clientX, event.clientY);
      else pendingBursts.push({ x: event.clientX, y: event.clientY });
    };

    const tick = (now: number) => {
      frame = 0;
      if (!tabVisible || disposed) return;
      const delta = lastFrame ? Math.min(48, now - lastFrame) : FRAME_DURATION;
      const frameFactor = delta / FRAME_DURATION;
      const seconds = delta / 1000;
      lastFrame = now;
      smoothedFrameMs = smoothedFrameMs ? smoothedFrameMs * 0.9 + delta * 0.1 : delta;
      if (smoothedFrameMs > 22) {
        slowFrameDuration += delta;
        recoveryDuration = 0;
        if (slowFrameDuration >= 1000 && !reducedQuality) {
          reducedQuality = true;
          const aliveLimit = Math.floor((width < 640 ? MAX_ALIVE_PHONE : MAX_ALIVE_DESKTOP) * 0.6);
          falling.splice(aliveLimit);
        }
      } else {
        slowFrameDuration = 0;
        recoveryDuration += delta;
        if (recoveryDuration >= 1000) reducedQuality = false;
      }
      airContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      previousAirBounds.forEach(({ x, y, width: boundsWidth, height: boundsHeight }) => {
        airContext.clearRect(x, y, boundsWidth, boundsHeight);
      });
      previousAirBounds = [];

      for (let index = falling.length - 1; index >= 0; index -= 1) {
        const petal = falling[index];
        petal.age += seconds;
        petal.vx *= DRAG_PER_FRAME ** frameFactor;
        petal.vy = darkTheme
          ? Math.max(-TERMINAL_FALL_PER_FRAME, petal.vy * DRAG_PER_FRAME ** frameFactor - GRAVITY_PER_FRAME * frameFactor)
          : Math.min(TERMINAL_FALL_PER_FRAME, petal.vy * DRAG_PER_FRAME ** frameFactor + GRAVITY_PER_FRAME * frameFactor);
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
          0.55,
          Math.abs(Math.cos(petal.age * petal.flutterFrequency + petal.phase)),
        );
        const halfHeight = petal.length * 0.35 * flip;

        if (darkTheme && petal.age >= 2.5) {
          falling.splice(index, 1);
          continue;
        }

        if (!darkTheme && petal.y + halfHeight >= pileTop) {
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
          petal.colorStep,
          sprites,
          petal.flipX,
          dpr,
          flip,
          1 - flip,
          darkTheme ? Math.max(0, 1 - petal.age / 2.5) : 1,
        );
        const extent = petal.length * 0.8 + 2;
        const bounds = {
          x: Math.max(0, drawX - extent),
          y: Math.max(0, petal.y - window.scrollY - extent),
          width: Math.min(width, extent * 2),
          height: Math.min(height, extent * 2),
        };
        petal.previousBounds = bounds;
        previousAirBounds.push(bounds);
      }

      for (let count = 0; count < 6 && pileDrawQueue.length; count += 1) {
        const petal = pileDrawQueue.shift();
        if (!petal) break;
        drawPetal(
          pileContext,
          petal.x,
          petal.y,
          petal.size,
          petal.rotation,
          petal.shape,
          petal.colorStep,
          sprites,
          petal.flipX,
          dpr,
          0.55,
          0,
          0.85,
        );
      }

      if (falling.length || pileDrawQueue.length) scheduleFrame();
      else {
        lastFrame = 0;
        if (pendingSpriteRebuild) {
          pendingSpriteRebuild = false;
          sprites.clear();
          spritesReady = false;
          scheduleSpriteChunk();
        }
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

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeTimer = undefined;
        resize();
      }, 150);
    };

    const updatePageGeometry = () => {
      pageRootBottom = pageRoot.getBoundingClientRect().bottom + window.scrollY;
      positionPileAtDocumentBottom();
    };
    readThemeColors();
    const themeObserver = new MutationObserver(() => {
      const nextDark = document.documentElement.dataset.theme === "dark";
      if (nextDark === darkTheme) return;
      darkTheme = nextDark;
      readThemeColors();
      falling.length = 0;
      landed.length = 0;
      pileDrawQueue.length = 0;
      pileHeights = [];
      sprites.clear();
      spritesReady = false;
      airContext.clearRect(0, 0, width, height);
      pileContext.clearRect(0, 0, pileCanvas.width, pileCanvas.height);
      scheduleSpriteChunk();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const pageSizeObserver = new ResizeObserver(updatePageGeometry);
    pageSizeObserver.observe(document.body);
    pageSizeObserver.observe(pageRoot);

    resize();
    document.addEventListener("click", onDocumentClick, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      disposed = true;
      if (frame) window.cancelAnimationFrame(frame);
      if (idleHandle !== null) {
        if (usingIdleCallback) window.cancelIdleCallback(idleHandle as number);
        else globalThis.clearTimeout(idleHandle as ReturnType<typeof setTimeout>);
      }
      if (resizeTimer) clearTimeout(resizeTimer);
      document.removeEventListener("click", onDocumentClick);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      pageSizeObserver.disconnect();
      themeObserver.disconnect();
      falling.length = 0;
      landed.length = 0;
      pileDrawQueue.length = 0;
      sprites.clear();
      pendingBursts.length = 0;
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
