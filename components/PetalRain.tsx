"use client";

import { useEffect, useRef } from "react";

type Petal = {
  x: number;
  y: number;
  speed: number;
  sway: number;
  frequency: number;
  phase: number;
  drift: number;
  spin: number;
  rotation: number;
  length: number;
  width: number;
  colors: [string, string];
  age: number;
};

const colorPairs: [string, string][] = [
  ["rgba(200,62,40,0.95)", "rgba(166,58,43,0.95)"],
  ["rgba(200,62,40,0.95)", "rgba(142,36,25,0.95)"],
  ["rgba(200,62,40,0.9)", "rgba(214,90,66,0.9)"],
  ["rgba(166,58,43,0.95)", "rgba(200,62,40,0.95)"],
];

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export default function PetalRain({ active }: { active: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  const syncRef = useRef<() => void>(() => {});

  useEffect(() => {
    activeRef.current = active;
    syncRef.current();
  }, [active]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const card = container?.closest<HTMLElement>(".eidolon-card");
    const context = canvas?.getContext("2d");
    if (!container || !canvas || !card || !context) return;
    const petalPath = new Path2D(
      "M0,50 C20,10 90,0 150,22 C195,40 195,60 150,78 C90,100 20,90 0,50 Z",
    );

    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let frame = 0;
    let lastFrame = 0;
    let spawnTimer: ReturnType<typeof setInterval> | undefined;
    let inView = false;
    let tabVisible = !document.hidden;
    let reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let burstReleased = false;
    let maxAlive = window.innerWidth < 640 ? 12 : 24;
    let spawnDelay = window.innerWidth < 640 ? 750 : 450;
    const petals: Petal[] = [];
    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const resizeQuery = window.matchMedia("(max-width: 639px)");

    const resize = () => {
      const bounds = container.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
    };

    const spawn = () => {
      if (petals.length >= maxAlive) return;

      const flower = card.querySelector<HTMLElement>(".eidolon-flower");
      const areaBounds = container.getBoundingClientRect();
      const flowerBounds = flower?.getBoundingClientRect();
      const flowerY = flowerBounds
        ? flowerBounds.top - areaBounds.top
        : height * 0.5;
      const x = randomBetween(4, Math.max(4, width - 4));
      const y = Math.max(
        0,
        Math.min(height - 48, flowerY + randomBetween(-76, 76)),
      );
      const length = randomBetween(6, 12);

      petals.push({
        x,
        y,
        speed: randomBetween(30, 60),
        sway: randomBetween(10, 20),
        frequency: randomBetween(0.55, 1.1),
        phase: randomBetween(0, Math.PI * 2),
        drift: randomBetween(-5, -1),
        spin: randomBetween(-0.55, 0.55),
        rotation: randomBetween(0, Math.PI * 2),
        length,
        width: length * randomBetween(0.42, 0.62),
        colors: colorPairs[Math.floor(Math.random() * colorPairs.length)],
        age: 0,
      });
      ensureFrame();
    };

    const animationFrame = (now: number) => {
      frame = 0;
      if (!width || !height) return;
      const delta = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0;
      lastFrame = now;
      context.clearRect(0, 0, width, height);

      for (let index = petals.length - 1; index >= 0; index -= 1) {
        const petal = petals[index];
        petal.age += delta;
        petal.y += petal.speed * delta;
        petal.rotation += petal.spin * delta;

        if (petal.y >= height) {
          petals.splice(index, 1);
          continue;
        }

        const fade =
          petal.y > height - 40 ? Math.max(0, (height - petal.y) / 40) : 1;
        const sway =
          Math.sin(petal.age * petal.frequency + petal.phase) * petal.sway;
        const x = petal.x + sway + petal.drift * petal.age;
        const gradient = context.createLinearGradient(
          -petal.length / 2,
          0,
          petal.length / 2,
          0,
        );
        gradient.addColorStop(0, petal.colors[0]);
        gradient.addColorStop(1, petal.colors[1]);
        context.save();
        context.globalAlpha = fade;
        context.translate(x, petal.y);
        context.rotate(petal.rotation);
        context.scale(petal.length / 200, petal.width / 100);
        context.translate(-100, -50);
        context.fillStyle = gradient;
        context.fill(petalPath);
        context.restore();
      }

      if (petals.length && inView && tabVisible && !reducedMotion) {
        frame = window.requestAnimationFrame(animationFrame);
      }
    };

    const ensureFrame = () => {
      if (!frame && petals.length && inView && tabVisible && !reducedMotion) {
        lastFrame = 0;
        frame = window.requestAnimationFrame(animationFrame);
      }
    };

    const stopFrame = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      lastFrame = 0;
    };

    const clearSpawner = () => {
      if (spawnTimer) clearInterval(spawnTimer);
      spawnTimer = undefined;
    };

    const sync = () => {
      const canSpawn =
        activeRef.current && inView && tabVisible && !reducedMotion;
      if (canSpawn) {
        if (!burstReleased) {
          burstReleased = true;
          for (let count = 0; count < 6; count += 1) spawn();
        }
        if (!spawnTimer) spawnTimer = setInterval(spawn, spawnDelay);
      } else {
        clearSpawner();
        if (!activeRef.current) burstReleased = false;
      }

      if (inView && tabVisible && !reducedMotion && petals.length) {
        ensureFrame();
      } else {
        stopFrame();
      }
    };

    const updateMotionPreference = () => {
      reducedMotion = reduceQuery.matches;
      if (reducedMotion) {
        petals.length = 0;
        context.clearRect(0, 0, width, height);
      }
      sync();
    };

    const updateViewportSize = () => {
      maxAlive = resizeQuery.matches ? 12 : 24;
      spawnDelay = resizeQuery.matches ? 750 : 450;
      clearSpawner();
      resize();
      sync();
    };

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    observer.observe(card);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const onVisibilityChange = () => {
      tabVisible = !document.hidden;
      sync();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    reduceQuery.addEventListener("change", updateMotionPreference);
    resizeQuery.addEventListener("change", updateViewportSize);
    window.addEventListener("resize", updateViewportSize);
    resize();
    syncRef.current = sync;

    return () => {
      clearSpawner();
      stopFrame();
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reduceQuery.removeEventListener("change", updateMotionPreference);
      resizeQuery.removeEventListener("change", updateViewportSize);
      window.removeEventListener("resize", updateViewportSize);
      petals.length = 0;
      context.clearRect(0, 0, width, height);
      syncRef.current = () => {};
    };
  }, []);

  return (
    <div className="eidolon-rain-area" ref={containerRef} aria-hidden="true">
      <canvas className="eidolon-rain-canvas" ref={canvasRef} />
    </div>
  );
}
