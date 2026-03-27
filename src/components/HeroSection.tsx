"use client";

import Image from "next/image";
import { motion } from "framer-motion";

interface HeroContent {
  name?: string;
  subtitle?: string;
  description?: string;
  cta_label?: string;
  cta_url?: string;
  photo_default_url?: string;
  photo_hover_url?: string;
  photo_dark_url?: string;
}


export default function HeroSection({ content = {} }: { content?: HeroContent }) {
  const name         = content.name             ?? "Antonio Luis Santos";
  const subtitle     = content.subtitle         ?? "Software Development & QA";
  const description  = content.description      ?? "Full-Stack, AI, and scalable systems – building future-ready applications that deliver results.";
  const ctaLabel     = content.cta_label        ?? "Schedule a Call";
  const ctaUrl       = content.cta_url          ?? "https://calendly.com/antonioluis-santos1/30min";
  const photoDefault = content.photo_default_url ?? "/profile-photo2.png";
  const photoHover   = content.photo_hover_url   ?? "/square-profile-photo.jpeg";
  const photoDark    = content.photo_dark_url     ?? "/profile-photo2.png";

  const handleCta = () => {
    if (window.Calendly?.showPopupWidget) {
      window.Calendly.showPopupWidget(ctaUrl);
    } else {
      window.open(ctaUrl, "_blank", "noopener,noreferrer");
    }
  };

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
          {name}<br />
          <span className="text-[var(--color-brand)] text-3xl sm:text-3xl">
            {subtitle}
          </span>
        </motion.h2>

        <motion.p
          className="mt-4 text-lg sm:text-xl text-gray-700 dark:text-gray-300"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {description}
        </motion.p>

        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <motion.button
            onClick={handleCta}
            className="px-6 py-2 bg-[var(--color-brand)] text-white rounded-xl font-medium shadow-lg"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 180, damping: 12, delay: 0.1 }}
            aria-label={`${ctaLabel} with Antonio Luis Santos`}
          >
            {ctaLabel}
          </motion.button>
        </div>
      </div>

      {/* Profile Image — 3-layer stack */}
      <motion.div
        className="w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden shadow-lg transition-all duration-500 hover:scale-110 hover:shadow-2xl hover:rotate-2 relative group"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        {/* Layer 1: Default — always visible base */}
        <Image
          src={photoDefault}
          alt={`${name} - Senior IBM ODM Specialist and QA Team Manager specializing in full-stack development, AI integration, and scalable systems`}
          width={224}
          height={224}
          className="object-cover object-center w-full h-full"
          priority
          sizes="(max-width: 768px) 192px, 224px"
          quality={90}
        />

        {/* Layer 2: Dark mode — crossfades in when dark class applies */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoDark}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-0 dark:opacity-100 transition-opacity duration-700"
        />

        {/* Layer 3: Hover — clip-path wipe reveals left→right */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoHover}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center transition-[clip-path] duration-500 ease-in-out [clip-path:inset(0_100%_0_0)] group-hover:[clip-path:inset(0_0%_0_0)]"
        />
      </motion.div>
    </section>
  );
}
