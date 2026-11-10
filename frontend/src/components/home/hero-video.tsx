"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type Clip = { video: string; poster: string };

function useMedia(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", onChange);
      return () => m.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

const noop = () => () => {};
type Connection = { saveData?: boolean; effectiveType?: string };
// Data saver on, or a 2G/3G connection: keep the still image and skip the video entirely.
const lowDataConnection = () => {
  const c = (navigator as Navigator & { connection?: Connection }).connection;
  return Boolean(c?.saveData || (c?.effectiveType && ["slow-2g", "2g", "3g"].includes(c.effectiveType)));
};

/**
 * Full-bleed background: the poster shows instantly (and is all that loads for reduced-motion or data-saver
 * visitors); the clip for this screen shape loads after hydration and fades in once it's actually playing.
 */
export function HeroVideo({ wide, tall }: { wide: Clip; tall: Clip }) {
  const narrow = useMedia("(max-width: 767px)");
  const reduceMotion = useMedia("(prefers-reduced-motion: reduce)");
  const lowData = useSyncExternalStore(noop, lowDataConnection, () => true);
  const [idle, setIdle] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  const clip = narrow ? tall : wide;
  const showVideo = idle && !reduceMotion && !lowData;

  // Start fetching the clip only after the page has fully loaded and the browser is idle, so it never
  // competes with the poster, fonts or scripts that make up the first paint.
  useEffect(() => {
    const hasIdle = typeof window.requestIdleCallback === "function"; // not in older Safari
    let id = 0;
    const start = () => {
      id = hasIdle ? window.requestIdleCallback(() => setIdle(true), { timeout: 2500 }) : window.setTimeout(() => setIdle(true), 300);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      if (hasIdle) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, []);

  // The button follows the element's real state: the browser may also pause it (background tab, low-power mode).
  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => {});
    else v.pause();
  };

  return (
    <>
      <picture>
        <source media="(max-width: 767px)" srcSet={tall.poster} />
        <img src={wide.poster} alt="" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
      </picture>
      {showVideo && (
        <video
          key={clip.video}
          ref={video}
          src={clip.video}
          poster={clip.poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          onPlaying={() => setPlaying(true)}
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${playing ? "opacity-100" : "opacity-0"}`}
        />
      )}
      {showVideo && playing && (
        <button
          type="button"
          onClick={toggle}
          aria-label={paused ? "Play background video" : "Pause background video"}
          className="absolute right-4 bottom-4 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/70 text-ink backdrop-blur transition-colors hover:bg-white md:right-8 md:bottom-8"
        >
          {paused ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 4l14 8-14 8z" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
            </svg>
          )}
        </button>
      )}
    </>
  );
}
