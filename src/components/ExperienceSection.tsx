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
    <section id="experience" className="px-6 py-24 max-w-4xl mx-auto">
      <h2 className="text-3xl font-semibold text-center mb-12">
        Experience
      </h2>

      <div className="relative border-l-2 border-gray-300 dark:border-gray-600 ml-12">
        {/* Initial Experiences */}
        {experiences.map((exp, idx) => (
          <motion.div
            key={exp.year + exp.role}
            className="mb-12 flex items-start relative"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1, type: "spring", stiffness: 70, damping: 20 }}
          >
            <div className="absolute -left-36 w-32 text-right text-sm font-medium text-gray-500 dark:text-gray-400 break-words">
              {exp.year}
            </div>
            <div className="w-4 h-4 bg-[#0033A0] rounded-full mt-1.5 -left-2 absolute"></div>
            <div className="ml-6">
              <h3 className="text-lg font-bold">{exp.role}</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">{exp.company}</p>
              <p className="mt-1 text-gray-600 dark:text-gray-400">{exp.description}</p>
            </div>
          </motion.div>
        ))}

        {/* Additional Experiences */}
        <AnimatePresence>
          {showMore &&
            additionalExperiences.map((exp, idx) => (
              <motion.div
                key={exp.year + exp.role}
                className="mb-12 flex items-start relative"
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  height: "auto",
                  transition: { type: "spring", stiffness: 90, damping: 20 },
                }}
                exit={{
                  opacity: 0,
                  y: -20,
                  height: 0,
                  transition: { type: "spring", stiffness: 70, damping: 20 },
                }}
              >
                <div className="absolute -left-36 w-32 text-right text-sm font-medium text-gray-500 dark:text-gray-400 break-words">
                  {exp.year}
                </div>
                <div className="w-4 h-4 bg-[#0033A0] rounded-full mt-1.5 -left-2 absolute"></div>
                <div className="ml-6">
                  <h3 className="text-lg font-bold">{exp.role}</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{exp.company}</p>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">{exp.description}</p>
                </div>
              </motion.div>
            ))}
        </AnimatePresence>
      </div>

      <div className="flex justify-center mt-6">
        <button
          onClick={toggleShowMore}
          className="px-6 py-2 bg-[#0033A0] text-white rounded-xl font-medium hover:opacity-90 transition"
        >
          {showMore ? "Hide Milestones" : "Uncover More Milestones"}
        </button>
      </div>
    </section>
  );
}
