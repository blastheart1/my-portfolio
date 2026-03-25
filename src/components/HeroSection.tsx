"use client";

import Image from "next/image";
import { motion } from "framer-motion";

interface HeroContent {
  name?: string;
  subtitle?: string;
  description?: string;
  cta_label?: string;
  cta_url?: string;
}

declare global {
  interface Window {
    Calendly?: { showPopupWidget: (url: string) => void };
  }
}

export default function HeroSection({ content = {} }: { content?: HeroContent }) {
  const name        = content.name        ?? "Antonio Luis Santos";
  const subtitle    = content.subtitle    ?? "Software Development & QA";
  const description = content.description ?? "Full-Stack, AI, and scalable systems – building future-ready applications that deliver results.";
  const ctaLabel    = content.cta_label   ?? "Schedule a Call";
  const ctaUrl      = content.cta_url     ?? "https://calendly.com/antonioluis-santos1/30min";

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

      {/* Profile Image */}
      <motion.div
        className="w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden shadow-lg transition-all duration-500 hover:scale-110 hover:shadow-2xl hover:rotate-2 relative group"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Image
          src="/profile-photo2.png"
          alt={`${name} - Senior IBM ODM Specialist and QA Team Manager specializing in full-stack development, AI integration, and scalable systems`}
          width={224}
          height={224}
          className="object-cover object-center w-full h-full transition-all duration-500 group-hover:opacity-0 group-hover:scale-110"
          priority
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
          sizes="(max-width: 768px) 192px, 224px"
          quality={90}
        />
        <Image
          src="/square-profile-photo.jpeg"
          alt={`${name} - Professional headshot`}
          width={224}
          height={224}
          className="object-cover object-center w-full h-full transition-all duration-500 absolute inset-0 opacity-0 group-hover:opacity-100 group-hover:scale-110"
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
          sizes="(max-width: 768px) 192px, 224px"
          quality={90}
        />
      </motion.div>
    </section>
  );
}
