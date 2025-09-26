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
  className="text-lg text-muted-foreground leading-relaxed indent-8 text-justify"
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, delay: 0.2 }}
>
  A <span className="font-semibold">Full-Stack Software Engineer</span> specializing in 
  <span className="font-semibold"> generative AI</span>, skilled in 
  <span className="font-semibold"> ReactJS, Next.js, TailwindCSS, Supabase, Python, FastAPI, and TensorFlow</span>, 
  with hands-on experience integrating <span className="font-semibold">AI APIs such as OpenAI</span>. 
  Work includes building <span className="font-semibold">websites, chatbots, and intelligent applications</span> 
  that merge modern development practices with 
  <span className="font-semibold"> scalable, future-ready AI solutions</span>. 
  Professional background also spans roles as a 
  <span className="font-semibold"> Lead QA Manager</span> and 
  <span className="font-semibold"> IBM ODM developer</span>, delivering 
  <span className="font-semibold"> enterprise-grade platforms</span> and 
  <span className="font-semibold"> decision management systems</span> that align technology with business strategy.
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
          className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:ring-offset-2 transition"
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
