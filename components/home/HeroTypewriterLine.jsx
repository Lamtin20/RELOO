"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { HERO_DEFAULT_LINE } from "@/lib/hero-rotating-lines";

const TYPE_MS = 48;
const DELETE_MS = 24;
const PAUSE_TYPED_MS = 2800;
const PAUSE_EMPTY_MS = 320;
const FADE_ROTATE_MS = 4200;

export function HeroTypewriterLine({ lines, className = "", inline = false }) {
  const pool = useMemo(() => {
    const next = (lines ?? []).filter(Boolean);
    return next.length ? next : [HERO_DEFAULT_LINE];
  }, [lines]);

  const [lineIndex, setLineIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [active, setActive] = useState(false);
  const reducedMotionRef = useRef(false);
  const poolKeyRef = useRef("");

  const currentLine = pool[lineIndex % pool.length];

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setText(reducedMotionRef.current ? pool[0] : "");
    setActive(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ kích hoạt animation sau mount
  }, []);

  useEffect(() => {
    const key = pool.join("|");
    if (poolKeyRef.current && poolKeyRef.current !== key) {
      setLineIndex(0);
      setText(reducedMotionRef.current ? pool[0] : "");
      setDeleting(false);
    }
    poolKeyRef.current = key;
  }, [pool]);

  useEffect(() => {
    if (!active) return undefined;

    if (reducedMotionRef.current) {
      setText(currentLine);
      const timer = window.setInterval(() => {
        setLineIndex((prev) => (prev + 1) % pool.length);
      }, FADE_ROTATE_MS);
      return () => window.clearInterval(timer);
    }

    if (!deleting && text === currentLine) {
      const timer = window.setTimeout(() => setDeleting(true), PAUSE_TYPED_MS);
      return () => window.clearTimeout(timer);
    }

    if (deleting && text === "") {
      const timer = window.setTimeout(() => {
        setDeleting(false);
        setLineIndex((prev) => (prev + 1) % pool.length);
      }, PAUSE_EMPTY_MS);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      if (deleting) {
        setText(currentLine.slice(0, Math.max(0, text.length - 1)));
        return;
      }
      setText(currentLine.slice(0, text.length + 1));
    }, deleting ? DELETE_MS : TYPE_MS);

    return () => window.clearTimeout(timer);
  }, [active, text, deleting, currentLine, pool.length]);

  const reducedMotion=useSyncExternalStore(callback=>{const m=window.matchMedia("(prefers-reduced-motion: reduce)");m.addEventListener("change",callback);return()=>m.removeEventListener("change",callback)},()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches,()=>true);
  const rootClass = [
    "hero-typewriter",
    inline ? "hero-typewriter--inline" : "",
    !active ? "hero-typewriter--static" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (!active) {
    return <span className={rootClass}>{pool[0]}</span>;
  }

  if (inline) {
    return (
      <span className={rootClass} aria-live="polite" aria-atomic="true">
        <span className="hero-typewriter__text">{text}</span>
        <span
          className={[
            "hero-typewriter__cursor",
            !reducedMotion ? "is-active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-hidden="true"
        />
      </span>
    );
  }

  const reserveLine = pool.reduce(
    (a, b) => (a.length >= b.length ? a : b),
    pool[0] ?? HERO_DEFAULT_LINE,
  );

  return (
    <span className={rootClass} aria-live="polite" aria-atomic="true">
      <span className="hero-typewriter__reserve" aria-hidden="true">
        {reserveLine}
      </span>
      <span className="hero-typewriter__content">
        <span className="hero-typewriter__text">{text}</span>
        <span
          className={[
            "hero-typewriter__cursor",
            !reducedMotion ? "is-active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-hidden="true"
        />
      </span>
    </span>
  );
}
