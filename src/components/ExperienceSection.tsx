"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ExperienceEntry } from "@/lib/content-queries";

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

export default function ExperienceSection({ initialEntries, heading, subheading }: { initialEntries?: ExperienceEntry[]; heading?: string; subheading?: string }) {
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
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
          {heading || 'Experience.'}<br />
          <span className="text-gray-500 dark:text-gray-400 font-normal">{subheading || "What I've built and where."}</span>
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
