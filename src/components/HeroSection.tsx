"use client";

import Image from "next/image";
import { motion } from "framer-motion";


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

        <div className="flex flex-col sm:flex-row gap-4 mt-6">
        <motion.button
          onClick={() => {
            if (window.Calendly?.showPopupWidget) {
              window.Calendly.showPopupWidget('https://calendly.com/antonioluis-santos1/30min');
            } else {
              // Fallback: open in new tab if Calendly isn't loaded
              window.open('https://calendly.com/antonioluis-santos1/30min', '_blank', 'noopener,noreferrer');
            }
          }}
          className="inline-block px-6 py-3 rounded-xl bg-[#0033A0] text-white font-medium shadow-lg hover:bg-[#002A8A] focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:ring-offset-2 transition-colors"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          transition={{ 
            type: "spring", 
            stiffness: 180, 
            damping: 12,
            delay: 0.1 
          }}
          aria-label="Schedule a 30-minute consultation call with Antonio Luis Santos"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (window.Calendly?.showPopupWidget) {
                window.Calendly.showPopupWidget('https://calendly.com/antonioluis-santos1/30min');
              } else {
                window.open('https://calendly.com/antonioluis-santos1/30min', '_blank', 'noopener,noreferrer');
              }
            }
          }}
        >
          Schedule a Call
        </motion.button>

          <motion.button
            onClick={() => {
              const servicesSection = document.getElementById('services');
              if (servicesSection) {
                servicesSection.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="inline-block px-6 py-3 rounded-xl border-2 border-[#0033A0] text-[#0033A0] dark:bg-white dark:text-black dark:border-white font-medium shadow-lg hover:bg-[#0033A0] hover:text-white dark:hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:ring-offset-2 transition-colors"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ 
              type: "spring", 
              stiffness: 180, 
              damping: 12,
              delay: 0.2 
            }}
            aria-label="View services and pricing packages"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const servicesSection = document.getElementById('services');
                if (servicesSection) {
                  servicesSection.scrollIntoView({ behavior: 'smooth' });
                }
              }
            }}
          >
            View Services
          </motion.button>
        </div>

      </div>

      {/* Profile Image */}
      <motion.div
        className="w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden shadow-lg transform transition-all duration-500 hover:scale-110 hover:shadow-2xl hover:rotate-2 relative group"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        whileHover={{ 
          scale: 1.1, 
          rotate: 2,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
        }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Default Image */}
        <Image
          src="/profile-photo2.png"
          alt="Antonio Luis Santos - Senior IBM ODM Specialist and QA Team Manager specializing in full-stack development, AI integration, and scalable systems"
          width={224}
          height={224}
          className="object-cover object-center w-full h-full transition-all duration-500 group-hover:opacity-0 group-hover:scale-110"
          priority
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
          sizes="(max-width: 768px) 192px, 224px"
          quality={90}
        />
        
        {/* Hover Image */}
        <Image
          src="/square-profile-photo.jpeg"
          alt="Antonio Luis Santos - Professional headshot showing expertise in software development and quality assurance"
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
