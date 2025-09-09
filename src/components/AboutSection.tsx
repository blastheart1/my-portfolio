"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download } from "lucide-react";

export default function AboutSection() {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <section id="about" className="py-0 max-w-4xl mx-auto px-6 text-center">
      <motion.h2
        className="text-3xl font-bold mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        About Me
      </motion.h2>

      <motion.p
        className="text-lg text-muted-foreground leading-relaxed"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        I am a <span className="font-semibold">Senior IBM ODM Specialist (BRMS)</span> and{" "}
        <span className="font-semibold">QA Team Manager</span> at Bell Digital Billboards,
        focusing on <span className="font-semibold">accuracy, reliability, and seamless delivery</span>.
        Leading QA for a large-scale, customer-facing platform has honed my ability to catch
        details others might miss while fostering a culture of{" "}
        <span className="font-semibold">collaboration and accountability</span>.
      </motion.p>

      <motion.p
        className="text-lg text-muted-foreground leading-relaxed mt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        My expertise spans <span className="font-semibold">Java, C++, IBM ODM, HTML, and CSS</span>,
        complemented by modern stacks such as{" "}
        <span className="font-semibold">Next.js, TailwindCSS, PostgreSQL, Sanity, and Wix</span>.
        I am also expanding into <span className="font-semibold">automation testing</span> and{" "}
        <span className="font-semibold">AI-driven workflow tools</span> like Zapier, bridging enterprise
        systems with innovative technologies to deliver reliable, future-ready solutions.
      </motion.p>

      <motion.p
        className="text-lg text-muted-foreground leading-relaxed mt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        Beyond work, I channel discipline and persistence through{" "}
        <span className="font-semibold">road cycling</span> and fuel my passion for innovation with{" "}
        <span className="font-semibold">Formula 1</span> and{" "}
        <span className="font-semibold">sim racing</span>, which inspire the precision and drive I
        bring to my career.
      </motion.p>

      {/* Download Resume Button */}
      <motion.div
        className="flex justify-center mt-8 relative"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        <a
          href="/AntonioLuisSantos-Resume.pdf"
          download
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onTouchStart={() => setShowTooltip((prev) => !prev)} // toggle tooltip on mobile tap
        >
          <Download className="w-6 h-6 text-gray-800 dark:text-gray-200" />
        </a>

        <span
          className={`
            absolute -bottom-10 left-1/2 transform -translate-x-1/2 
            px-3 py-1 text-sm text-white bg-black dark:bg-gray-800 rounded 
            transition-opacity
            ${showTooltip ? "opacity-100" : "opacity-0"}
          `}
        >
          Download Resume
        </span>
      </motion.div>
    </section>
  );
}
