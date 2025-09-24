"use client";

import { motion } from "framer-motion";
import { HiOutlineLocationMarker } from "react-icons/hi";
import { FaLinkedin, FaInstagram, FaEnvelope } from "react-icons/fa";

export default function ContactSection() {
  return (
    <section
      id="contact"
      className="px-6 py-24 max-w-4xl mx-auto text-center text-foreground"
    >
      <motion.h2
        className="text-3xl font-semibold mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Launch a Conversation
      </motion.h2>

      <motion.p
        className="text-lg text-gray-700 dark:text-gray-300 mb-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        Whether it’s building scalable systems or exploring innovative tech, let’s connect and navigate the galaxy of software development together.
      </motion.p>

      <motion.div
        className="flex justify-center gap-6 mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <a
          href="https://www.linkedin.com/in/alasantos01/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white bg-[#0033A0] p-3 rounded-full hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0033A0] transition"
          aria-label="Connect with Antonio Luis Santos on LinkedIn"
        >
          <FaLinkedin className="text-xl" />
        </a>
        <a
          href="https://www.instagram.com/0xlv1s_/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white bg-[#0033A0] p-3 rounded-full hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0033A0] transition"
          aria-label="Follow Antonio Luis Santos on Instagram"
        >
          <FaInstagram className="text-xl" />
        </a>
        <a
          href="mailto:antonioluis.santos1@gmail.com"
          className="text-white bg-[#0033A0] p-3 rounded-full hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0033A0] transition"
          aria-label="Send email to Antonio Luis Santos"
        >
          <FaEnvelope className="text-xl" />
        </a>
      </motion.div>

      <motion.div
        className="flex items-center justify-center gap-2 text-gray-700 dark:text-gray-300 text-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <HiOutlineLocationMarker className="text-xl" />
        <span>Manila, Philippines</span>
      </motion.div>
    </section>
  );
}
