"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download } from "lucide-react";
import MarkdownBody from "@/components/ui/MarkdownBody";

const FALLBACK_BODY = `A Full-Stack Software Engineer specializing in generative AI, skilled in ReactJS, Next.js, TailwindCSS, Supabase, Python, FastAPI, and TensorFlow, with hands-on experience integrating AI APIs such as OpenAI. Work includes building websites, chatbots, and intelligent applications that merge modern development practices with scalable, future-ready AI solutions. Professional background also spans roles as a Lead QA Manager and IBM ODM developer, delivering enterprise-grade platforms and decision management systems that align technology with business strategy.`;

export default function AboutSection({ initialContent }: { initialContent?: Record<string, string> }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const heading    = initialContent?.heading    ?? 'About me.';
  const subheading = initialContent?.subheading ?? 'The person behind the code.';
  const body       = initialContent?.body       ?? FALLBACK_BODY;

  return (
    <section id="about" className="py-0 max-w-4xl mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
          {heading}<br />
          <span className="text-gray-400 dark:text-gray-500 font-normal">{subheading}</span>
        </h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <MarkdownBody>{body}</MarkdownBody>
      </motion.div>


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
          className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus:ring-offset-2 transition"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onTouchStart={() => setShowTooltip((prev) => !prev)} // toggle tooltip on mobile tap
          aria-label="Download Antonio Luis Santos resume"
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
