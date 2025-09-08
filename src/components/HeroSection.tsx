"use client";

import Image from "next/image";
import { motion } from "framer-motion";

// Extend the Window interface to include Calendly
declare global {
  interface Window {
    Calendly?: {
      showPopupWidget: (url: string) => void;
      closePopupWidget?: () => void;
    };
  }
}

export default function HeroSection() {
  return (
    <section className="flex flex-col lg:flex-row items-center justify-center px-6 py-16 gap-12 max-w-5xl mx-auto">
      
      {/* Text Content */}
      <div className="text-center lg:text-left max-w-xl">
        <motion.h2
          className="text-4xl sm:text-5xl font-bold"
          style={{ color: "var(--hero-name)" }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Antonio Luis Santos{" "}
          <span className="text-[#0033A0] text-3xl sm:text-3xl">
            Software Development & QA
          </span>
        </motion.h2>

        <motion.p
          className="mt-4 text-lg sm:text-xl text-gray-700 dark:text-gray-300"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <span className="font-semibold">Full-Stack</span>,{" "}
          <span className="font-semibold">AI</span>, and{" "}
          <span className="font-semibold">scalable systems</span> – building future-ready applications that deliver results.
        </motion.p>

        <motion.button
  onClick={() => window.Calendly?.showPopupWidget('https://calendly.com/antonioluis-santos1/30min')}
  className="inline-block mt-6 px-6 py-3 rounded-xl bg-[#0033A0] text-white font-medium shadow-lg"
  initial={{ opacity: 0, y: 20, scale: 0.9 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  whileHover={{ scale: 1.05, y: -2 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: "spring", stiffness: 130, damping: 20, delay: 0.1 }}
>
  Schedule a Call
</motion.button>

      </div>

      {/* Profile Image */}
      <motion.div
        className="w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden shadow-lg transform transition duration-500 hover:scale-105 hover:shadow-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Image
          src="/profile-photo2.png"
          alt="Antonio Luis Santos"
          width={224}
          height={224}
          className="object-cover object-center w-full h-full"
          priority
        />
      </motion.div>
    </section>
  );
}
