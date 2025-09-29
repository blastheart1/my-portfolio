"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const experiences = [
  {
    role: "Senior IBM ODM Specialist (BRMS) & QA Team Manager",
    company: "Bell Canada Inc. (Digital Billboards)",
    description:
      "Lead QA for a large-scale, customer-facing platform. Focus on accuracy, reliability, and seamless delivery while fostering a culture of collaboration and accountability.",
    year: "10/2024 - Present",
  },
  {
    role: "Senior IBM ODM Developer",
    company: "Bell Canada Inc. (Digital Billboards)",
    description:
      "Lead end-to-end development of IBM ODM BRMS solutions aligned with business and technical requirements.",
    year: "01/2023 - 10/2024",
  },
  {
    role: "ODM Developer | BRMS Engineer (IBM ODM)",
    company: "Bell Canada Inc. (Digital Billboards)",
    description:
      "Contributed to the design and development of enterprise applications using IBM ODM BRMS.",
    year: "11/2020 - 01/2023",
  },
];

const additionalExperiences = [
  {
    role: "Subject Matter Expert (Bell Mobility)",
    company: "Bell Canada Inc.",
    description:
      "Trusted technical and process resource for Bell Mobility contact centre, driving accuracy, efficiency, and consistent service delivery.",
    year: "04/2019 - 11/2020",
  },
  {
    role: "Hello, World!",
    company: "My Personal Computer",
    description: "First line of code using C on my Pentium 4-powered PC",
    year: "2009",
  },
];

export default function ExperienceSection() {
  const [showMore, setShowMore] = useState(false);

  const toggleShowMore = () => setShowMore((prev) => !prev);

  return (
    <section id="experience" className="px-6 py-20 max-w-4xl mx-auto relative">
      <motion.h2
        className="text-3xl font-bold text-center mb-12"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        Experience
      </motion.h2>

      {/* Container for timeline items */}
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute top-0 bottom-0 left-[calc(6rem+1rem)] w-0.5 bg-gray-300 dark:bg-gray-600"></div>

        <div className="flex flex-col space-y-12">
          <AnimatePresence>
            {[...experiences, ...(showMore ? additionalExperiences : [])].map((exp, idx) => (
              <motion.div
                key={exp.year + exp.role}
                className="flex items-start"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ 
                  delay: idx < experiences.length ? idx * 0.1 : (idx - experiences.length) * 0.15,
                  type: "spring", 
                  stiffness: 120, 
                  damping: 15 
                }}
              >
                {/* Year */}
                <div className="w-27 pl-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400 break-words">
    {exp.year}
  </div>


                {/* Dot and spacer */}
                <div className="relative w-3 flex flex-col items-center">
                  {/* Dot */}
                  <div className="w-5 h-5 bg-[#0033A0] rounded-full border-2 border-white dark:border-gray-900 z-10"></div>
                </div>

                {/* Content */}
                <div className="ml-6 flex-1">
                  <h3 className="text-lg font-bold">{exp.role}</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{exp.company}</p>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">{exp.description}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <motion.div 
        className="flex justify-center mt-6"
        layout
        transition={{ type: "spring", stiffness: 130, damping: 20, delay: 0.1 }}
      >
        <motion.button
          onClick={toggleShowMore}
          className="px-6 py-2 bg-[#0033A0] text-white rounded-xl font-medium shadow-lg"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          layout
          transition={{ 
            type: "spring", 
            stiffness: 180, 
            damping: 12,
            layout: { type: "spring", stiffness: 130, damping: 20, delay: 0.1 }
          }}
        >
          {showMore ? "Hide Milestones" : "Uncover More Milestones"}
        </motion.button>
      </motion.div>
    </section>
  );
}