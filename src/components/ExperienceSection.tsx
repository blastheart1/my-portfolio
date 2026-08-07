"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ExperienceEntry } from "@/lib/content-queries";
import { useScrollY } from "@/contexts/ScrollContext";

const FALLBACK_EXPERIENCES = [
  {
    id: "fallback-0",
    role: "Senior IBM ODM Specialist (BRMS) & QA Team Manager",
    company: "Bell Canada Inc. (Digital Billboards)",
    description:
      "Lead QA for a large-scale, customer-facing platform. Focus on accuracy, reliability, and seamless delivery while fostering a culture of collaboration and accountability.",
    year: "10/2024 - Present",
  },
  {
    id: "fallback-1",
    role: "Senior IBM ODM Developer",
    company: "Bell Canada Inc. (Digital Billboards)",
    description:
      "Lead end-to-end development of IBM ODM BRMS solutions aligned with business and technical requirements.",
    year: "01/2023 - 10/2024",
  },
  {
    id: "fallback-2",
    role: "ODM Developer | BRMS Engineer (IBM ODM)",
    company: "Bell Canada Inc. (Digital Billboards)",
    description:
      "Contributed to the design and development of enterprise applications using IBM ODM BRMS.",
    year: "11/2020 - 01/2023",
  },
];

const FALLBACK_ADDITIONAL = [
  {
    id: "fallback-3",
    role: "Subject Matter Expert (Bell Mobility)",
    company: "Bell Canada Inc.",
    description:
      "Trusted technical and process resource for Bell Mobility contact centre, driving accuracy, efficiency, and consistent service delivery.",
    year: "04/2019 - 11/2020",
  },
  {
    id: "fallback-4",
    role: "Hello, World!",
    company: "My Personal Computer",
    description: "First line of code using C on my Pentium 4-powered PC",
    year: "2009",
  },
];

const DESC_LIMIT = 120;

function Description({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > DESC_LIMIT;
  const displayed = isLong && !expanded ? text.slice(0, DESC_LIMIT).trimEnd() + "…" : text;

  return (
    <p className="mt-1 text-gray-600 dark:text-gray-300">
      {displayed}
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(prev => !prev)}
          className="ml-1 text-[var(--color-brand)] text-sm font-medium hover:underline focus:outline-none"
        >
          {expanded ? "See less" : "See more"}
        </button>
      )}
    </p>
  );
}

function formatDateRange(start: string | Date, end: string | Date | null): string {
  const fmt = (d: string | Date) => {
    const date = typeof d === "string" ? new Date(d) : d;
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();
    return `${month}/${year}`;
  };
  return `${fmt(start)} - ${end ? fmt(end) : "Present"}`;
}

interface DisplayEntry { id: string; role: string; company: string; description: string; year: string }

function toDisplay(e: ExperienceEntry): DisplayEntry {
  return {
    id: String(e.id),
    role: e.role,
    company: e.company,
    description: e.description ?? "",
    year: formatDateRange(e.start_date as string | Date, e.end_date as string | Date | null),
  };
}

/**
 * Experience.
 *
 * Two implementations, chosen by CSS rather than JavaScript:
 *
 *   < md : the original timeline — a plain list with See more/less and the
 *          "Uncover More Milestones" toggle. A pinned, blurring wheel is the
 *          wrong interaction on a phone, and filter: blur() driven from a
 *          scroll handler is expensive on mobile GPUs.
 *   >= md: the pinned wheel, where entries roll through a fixed focus window.
 *
 * Both are rendered and one is hidden with a media query. Branching in JS
 * would mean the server and client render different trees — a hydration
 * mismatch. The duplicated markup is the price of avoiding that.
 */
export default function ExperienceSection(props: {
  initialEntries?: ExperienceEntry[];
  heading?: string;
  subheading?: string;
}) {
  return (
    <>
      <div className="md:hidden">
        <MobileTimeline {...props} />
      </div>
      <div className="hidden md:block">
        <DesktopWheel {...props} />
      </div>
    </>
  );
}

function MobileTimeline({ initialEntries, heading, subheading }: {
  initialEntries?: ExperienceEntry[];
  heading?: string;
  subheading?: string;
}) {
  const [showMore, setShowMore] = useState(false);

  const hasDbData = initialEntries && initialEntries.length > 0;
  const experiences = hasDbData
    ? initialEntries.filter(e => e.track === "main").map(toDisplay)
    : FALLBACK_EXPERIENCES;
  const additionalExperiences = hasDbData
    ? initialEntries.filter(e => e.track !== "main").map(toDisplay)
    : FALLBACK_ADDITIONAL;

  const visibleEntries = showMore
    ? [...experiences, ...additionalExperiences]
    : experiences;

  return (
    <section id="experience" className="px-6 py-24 max-w-4xl mx-auto relative">
      <motion.div
        className="mb-12"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-4xl md:text-5xl font-light uppercase text-gray-900 dark:text-gray-100 tracking-[-0.02em] leading-[0.95]">
          {heading || 'Experience.'}<br />
          <span className="text-gray-500 dark:text-gray-400 block mt-2 font-display font-light normal-case text-xl md:text-2xl tracking-[0.01em] leading-snug">{subheading || "What I've built and where."}</span>
        </h2>
      </motion.div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute top-0 bottom-0 left-[calc(6rem+1rem)] w-0.5 bg-gray-300 dark:bg-gray-600"></div>

        <div className="flex flex-col space-y-12">
          <AnimatePresence initial={false}>
            {visibleEntries.map((exp, idx) => (
              <motion.div
                key={exp.id}
                className="flex items-start"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{
                  delay: idx < experiences.length ? 0 : (idx - experiences.length) * 0.15,
                  type: "spring",
                  stiffness: 120,
                  damping: 15,
                }}
              >
                {/* Year */}
                <div className="w-27 pl-4 text-left text-sm font-medium text-gray-500 dark:text-gray-300 break-words">
                  {exp.year}
                </div>

                {/* Dot */}
                <div className="relative w-3 flex flex-col items-center">
                  <div className="w-5 h-5 bg-[var(--color-brand)] rounded-full border-2 border-white dark:border-gray-900 z-10"></div>
                </div>

                {/* Content */}
                <div className="ml-6 flex-1">
                  <h3 className="text-lg font-bold">{exp.role}</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{exp.company}</p>
                  <Description text={exp.description} />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {additionalExperiences.length > 0 && (
        <motion.div
          className="flex justify-center mt-6"
          layout
          transition={{ type: "spring", stiffness: 130, damping: 20, delay: 0.1 }}
        >
          <motion.button
            onClick={() => setShowMore(prev => !prev)}
            className="px-6 py-2 bg-[var(--color-brand)] text-white rounded-xl font-medium shadow-lg"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            layout
            transition={{
              type: "spring",
              stiffness: 180,
              damping: 12,
              layout: { type: "spring", stiffness: 130, damping: 20, delay: 0.1 },
            }}
          >
            {showMore ? "Hide Milestones" : "Uncover More Milestones"}
          </motion.button>
        </motion.div>
      )}
    </section>
  );

}

function DesktopWheel({ initialEntries, heading, subheading }: {
  initialEntries?: ExperienceEntry[];
  heading?: string;
  subheading?: string;
}) {
  const hasDbData = initialEntries && initialEntries.length > 0;
  // Every entry shows: the wheel reveals them one at a time, so there is
  // nothing left for a toggle to hide.
  const entries: DisplayEntry[] = hasDbData
    ? initialEntries.map(toDisplay)
    : [...FALLBACK_EXPERIENCES, ...FALLBACK_ADDITIONAL];

  const { sectionRef, trackRef, register, focusedIndex, sceneVh } =
    useExperienceWheel(entries.length);

  return (
    <section
      id="experience"
      ref={sectionRef}
      // The tall scroll container only exists at md and up. Below that the
      // section is its natural height and the entries are a plain list —
      // a pinned, blurring wheel is the wrong interaction on a phone, and
      // filter: blur() on a scroll handler is expensive on mobile GPUs.
      className="relative h-[var(--exp-scene-h)]"
      style={{ ["--exp-scene-h" as string]: `${sceneVh}vh` }}
    >
      {/* Pinned viewport at md+; a normal block below it. */}
      <div className="sticky top-0 flex h-screen flex-col overflow-hidden">
        <div className="mx-auto w-full max-w-6xl px-6 pt-[12vh]">
          <h2 className="text-4xl md:text-5xl font-light uppercase text-gray-900 dark:text-gray-100 tracking-[-0.02em] leading-[0.95]">
            {heading || "Experience."}
            <span className="text-gray-500 dark:text-gray-400 block mt-2 font-display font-light normal-case text-xl md:text-2xl tracking-[0.01em] leading-snug">
              {subheading || "What I've built and where."}
            </span>
          </h2>
        </div>

        {/* Focus window. The track slides so the active entry sits on the
            centre line; neighbours blur back on either side. */}
        <div className="relative flex-1">
          <div
            ref={trackRef}
            // No CSS transition on this element: it is driven directly by
            // scroll position, and easing toward each frame's value would put
            // the track permanently behind the user's input.
            className="absolute inset-x-0 top-1/2 will-change-transform"
          >
            <div className="mx-auto w-full max-w-4xl px-6">
              {entries.map((exp, idx) => (
                <article
                  key={exp.id}
                  ref={register(idx)}
                  className="flex items-start gap-6 py-[3.5vh] will-change-[filter,opacity,transform]"
                  style={{
                    // Short enough not to feel detached from the scroll, long
                    // enough that the blur ramp does not look stepped.
                    transition:
                      "filter 120ms linear, opacity 120ms linear, transform 120ms linear",
                  }}
                  aria-current={focusedIndex === idx ? "true" : undefined}
                >
                  <div className="w-24 shrink-0 pt-1 text-sm font-medium text-gray-500 dark:text-gray-300">
                    {exp.year}
                  </div>

                  <div className="relative flex w-3 shrink-0 justify-center pt-2">
                    <span className="size-3.5 rounded-full bg-[var(--color-brand)] ring-4 ring-white dark:ring-gray-900" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold md:text-xl">{exp.role}</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{exp.company}</p>
                    <Description text={exp.description} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        {/* Progress: which entry of how many. Keeps the pinned section from
            feeling like the page has stopped responding. */}
        <div className="mx-auto w-full max-w-6xl px-6 pb-[6vh]">
          <div className="flex items-center gap-3">
            <span className="font-mono-ui text-xs tabular-nums text-gray-400">
              {String((focusedIndex ?? 0) + 1).padStart(2, "0")} / {String(entries.length).padStart(2, "0")}
            </span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700">
              <div
                className="h-px bg-[var(--color-brand)] transition-[width] duration-300"
                style={{
                  width: `${(((focusedIndex ?? 0) + 1) / entries.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * vh of scroll spent on the heading alone after the section pins.
 *
 * Zero on purpose. The heading is already fully visible at the moment the
 * section pins — it sits at the top of the sticky viewport — so any hold here
 * is dead scroll: the user drags, the page stays put, and the section reads as
 * unresponsive. Motion should begin on the first pixel after the pin.
 */
const HEADING_HOLD_VH = 0;
/**
 * vh of scroll per entry.
 *
 * This is the responsiveness dial — lower means a given scroll gesture
 * advances further. 62 needed most of a screen per entry and read as
 * unresponsive; 27 is roughly a quarter of a screen, which keeps each entry
 * legible while responding immediately to the wheel.
 */
const VH_PER_ENTRY = 27;

/**
 * Drives the pinned timeline.
 *
 * The section is a tall scroll container with a sticky viewport inside. The
 * first stretch is spent on the heading alone; after that, scroll progress
 * maps onto an entry index and the track slides so that entry sits on the
 * centre line — a date wheel rather than a list that scrolls past.
 *
 * The track offset is written straight onto the element from one scroll
 * subscription, so nothing re-renders per frame. Only the focused index is
 * state, and it changes once per entry.
 */
function useExperienceWheel(count: number) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLElement | null)[]>([]);
  const { subscribe } = useScrollY();

  const [focusedIndex, setFocusedIndex] = useState(0);
  const focusedRef = useRef(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  // Starts false so the server render and first client render agree; the
  // effect below corrects it after mount.
  const [isDesktop, setIsDesktop] = useState(false);

  const sceneVh = 100 + HEADING_HOLD_VH + count * VH_PER_ENTRY;

  const register = useCallback(
    (i: number) => (el: HTMLElement | null) => {
      items.current[i] = el;
    },
    []
  );

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Must match the md breakpoint used for the layout above, or the JS and
    // the CSS will disagree about which mode the section is in.
    const desktop = window.matchMedia("(min-width: 768px)");

    const sync = () => {
      setReducedMotion(motion.matches);
      setIsDesktop(desktop.matches);
    };

    sync();
    motion.addEventListener("change", sync);
    desktop.addEventListener("change", sync);
    return () => {
      motion.removeEventListener("change", sync);
      desktop.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    // Mobile and reduced-motion both get the plain list. Clearing the inline
    // styles matters on resize: a viewport dragged from desktop to mobile
    // would otherwise keep whatever blur and offset the wheel last wrote.
    if (reducedMotion || !isDesktop) {
      track.style.transform = "";
      items.current.forEach(el => {
        if (!el) return;
        el.style.filter = "";
        el.style.opacity = "";
        el.style.transform = "";
      });
      return;
    }

    const apply = () => {
      const rect = section.getBoundingClientRect();
      const travel = Math.max(1, section.offsetHeight - window.innerHeight);
      const scrolled = -rect.top;

      // Hold on the heading first, then advance through the entries.
      const holdPx = (HEADING_HOLD_VH / 100) * window.innerHeight;
      const afterHold = Math.max(0, scrolled - holdPx);
      const entryTravel = Math.max(1, travel - holdPx);
      const p = Math.max(0, Math.min(1, afterHold / entryTravel));

      // Fractional index: 0 -> first entry centred, count-1 -> last.
      const pos = p * Math.max(0, count - 1);
      const lower = Math.floor(pos);
      const upper = Math.min(count - 1, lower + 1);
      const frac = pos - lower;

      const centreOf = (i: number) => {
        const el = items.current[i];
        if (!el) return 0;
        return el.offsetTop + el.offsetHeight / 2;
      };

      // Interpolate between the two nearest entry centres so the track glides
      // rather than snapping between slots.
      const offset = centreOf(lower) + (centreOf(upper) - centreOf(lower)) * frac;
      track.style.transform = `translate3d(0, ${-offset}px, 0)`;

      const nearest = Math.round(pos);
      if (nearest !== focusedRef.current) {
        focusedRef.current = nearest;
        setFocusedIndex(nearest);
      }

      // Blur/fade by distance from the focused slot.
      items.current.forEach((el, i) => {
        if (!el) return;
        const d = Math.min(1, Math.abs(i - pos) / 1.8);
        const eased = d * d;
        el.style.filter = eased < 0.01 ? "none" : `blur(${(eased * 4).toFixed(2)}px)`;
        el.style.opacity = String(1 - eased * 0.78);
        el.style.transform = `scale(${1 - eased * 0.08})`;
      });
    };

    apply();
    return subscribe(apply);
  }, [subscribe, count, reducedMotion, isDesktop]);

  return { sectionRef, trackRef, register, focusedIndex, sceneVh };
}
