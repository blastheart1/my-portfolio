"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Code, Briefcase, Zap, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

interface ServiceTier {
  name: string;
  tagline: string;
  outcome: string;
  pricePHP: number;
  priceUSD: number;
  features: string[];
  icon: React.ReactNode;
  popular?: boolean;
}

const services: ServiceTier[] = [
  {
    name: "Starter",
    tagline: "Launch fast, look sharp",
    outcome: "Get a professional web presence up in days, not months.",
    pricePHP: 22000,
    priceUSD: 599,
    icon: <Code className="w-5 h-5" />,
    features: [
      "Up to 5 pages",
      "Responsive + mobile-first",
      "Contact form",
      "SEO basics + Analytics",
      "Hosting & domain setup",
      "7-day email support",
    ],
  },
  {
    name: "Professional",
    tagline: "Built to grow with you",
    outcome: "A full-featured platform that drives leads, sales, and credibility.",
    pricePHP: 45000,
    priceUSD: 1199,
    icon: <Briefcase className="w-5 h-5" />,
    popular: true,
    features: [
      "Up to 15 pages",
      "E-commerce + payment gateways",
      "Advanced SEO & schema markup",
      "Analytics dashboard",
      "Social media integration",
      "14-day priority support",
    ],
  },
  {
    name: "Enterprise",
    tagline: "No limits, full control",
    outcome: "Custom-built systems engineered for scale and long-term performance.",
    pricePHP: 100000,
    priceUSD: 2999,
    icon: <Zap className="w-5 h-5" />,
    features: [
      "Unlimited pages",
      "Custom backend + APIs",
      "Enterprise SEO strategy",
      "Dedicated project manager",
      "Weekly progress reports",
      "30-day phone/chat/email support",
    ],
  },
];

export default function ServicesSection() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleContactClick = () => {
    if (window.Calendly?.showPopupWidget) {
      window.Calendly.showPopupWidget('https://calendly.com/antonioluis-santos1/30min');
    } else {
      window.open('https://calendly.com/antonioluis-santos1/30min', '_blank', 'noopener,noreferrer');
    }
  };

  // Touch handling for mobile carousel
  let touchStartX: number | null = null;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (diff > 50 && currentSlide < services.length - 1) setCurrentSlide(s => s + 1);
    if (diff < -50 && currentSlide > 0) setCurrentSlide(s => s - 1);
    touchStartX = null;
  };

  return (
    <section id="services" className="py-20 px-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        className="mb-16"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
          Pick your scope.<br />
          <span className="text-gray-600 dark:text-gray-300 font-normal">I handle the rest.</span>
        </h2>
      </motion.div>

      {/* Desktop — Asymmetric Bento Grid */}
      <div className="hidden lg:grid lg:grid-cols-7 gap-5 items-stretch">
        {services.map((service, index) => {
          const isPopular = service.popular;
          const colSpan = isPopular ? 'col-span-3' : 'col-span-2';

          return (
            <motion.div
              key={service.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className={`${colSpan} flex flex-col rounded-2xl overflow-hidden border transition-all duration-300 ${
                isPopular
                  ? 'border-amber-400/40 bg-gray-950 dark:bg-gray-900 shadow-2xl shadow-amber-900/10 -mt-4'
                  : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              {/* Popular badge */}
              {isPopular && (
                <div className="bg-amber-400 px-4 py-1.5 flex items-center justify-center gap-2">
                  <span className="text-xs font-bold tracking-widest uppercase text-gray-950">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="flex flex-col flex-1 p-7">
                {/* Icon + Name */}
                <div className={`flex items-center gap-3 mb-5 ${isPopular ? 'text-amber-400' : 'text-[var(--color-brand)] dark:text-green-400'}`}>
                  {service.icon}
                  <span className={`text-xs font-bold tracking-widest uppercase ${isPopular ? 'text-amber-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    {service.name}
                  </span>
                </div>

                {/* Tagline */}
                <h3 className={`text-xl font-bold mb-2 leading-snug ${isPopular ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                  {service.tagline}
                </h3>

                {/* Outcome */}
                <p className={`text-sm leading-relaxed mb-7 ${isPopular ? 'text-gray-400' : 'text-gray-600 dark:text-gray-300'}`}>
                  {service.outcome}
                </p>

                {/* Price */}
                <div className="mb-7">
                  <div className={`text-4xl font-black tracking-tight ${isPopular ? 'text-amber-400' : 'text-gray-900 dark:text-gray-100'}`}>
                    ₱{service.pricePHP.toLocaleString()}
                  </div>
                  <div className={`text-sm mt-1 ${isPopular ? 'text-gray-500' : 'text-gray-400'}`}>
                    ${service.priceUSD.toLocaleString()} overseas
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2.5 mb-8 flex-1">
                  {service.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className={`mt-0.5 text-xs ${isPopular ? 'text-amber-400' : 'text-[var(--color-brand)] dark:text-green-400'}`}>
                        ✦
                      </span>
                      <span className={`text-sm ${isPopular ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={handleContactClick}
                  className={`w-full py-3 px-5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 group ${
                    isPopular
                      ? 'bg-amber-400 text-gray-950 hover:bg-amber-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Get started
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Mobile — CSS Carousel */}
      <div className="block lg:hidden">
        <div
          className="overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {services.map((service) => {
              const isPopular = service.popular;
              return (
                <div key={service.name} className="w-full flex-shrink-0 px-1">
                  <div className={`rounded-2xl border overflow-hidden ${
                    isPopular
                      ? 'border-amber-400/40 bg-gray-950 dark:bg-gray-900'
                      : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50'
                  }`}>
                    {isPopular && (
                      <div className="bg-amber-400 px-4 py-1.5 flex items-center justify-center">
                        <span className="text-xs font-bold tracking-widest uppercase text-gray-950">Most Popular</span>
                      </div>
                    )}
                    <div className="p-6">
                      <div className={`flex items-center gap-2 mb-4 ${isPopular ? 'text-amber-400' : 'text-[var(--color-brand)] dark:text-green-400'}`}>
                        {service.icon}
                        <span className={`text-xs font-bold tracking-widest uppercase ${isPopular ? 'text-amber-400' : 'text-gray-400'}`}>
                          {service.name}
                        </span>
                      </div>
                      <h3 className={`text-lg font-bold mb-1 ${isPopular ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                        {service.tagline}
                      </h3>
                      <p className={`text-sm mb-5 ${isPopular ? 'text-gray-400' : 'text-gray-600 dark:text-gray-300'}`}>
                        {service.outcome}
                      </p>
                      <div className="mb-5">
                        <span className={`text-3xl font-black ${isPopular ? 'text-amber-400' : 'text-gray-900 dark:text-gray-100'}`}>
                          ₱{service.pricePHP.toLocaleString()}
                        </span>
                        <span className={`text-sm ml-2 ${isPopular ? 'text-gray-500' : 'text-gray-400'}`}>
                          / ${service.priceUSD.toLocaleString()} overseas
                        </span>
                      </div>
                      <ul className="space-y-2 mb-6">
                        {service.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className={`text-xs mt-0.5 ${isPopular ? 'text-amber-400' : 'text-[var(--color-brand)] dark:text-green-400'}`}>✦</span>
                            <span className={`text-sm ${isPopular ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}`}>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={handleContactClick}
                        className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 group transition-all duration-200 ${
                          isPopular
                            ? 'bg-amber-400 text-gray-950 hover:bg-amber-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        Get started
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Carousel controls */}
        <div className="flex items-center justify-center gap-4 mt-5">
          <button
            onClick={() => setCurrentSlide(s => Math.max(0, s - 1))}
            disabled={currentSlide === 0}
            className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-500 disabled:opacity-30 hover:border-gray-500 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-2">
            {services.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                  i === currentSlide ? 'bg-[var(--color-brand)] dark:bg-green-400 w-4' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => setCurrentSlide(s => Math.min(services.length - 1, s + 1))}
            disabled={currentSlide === services.length - 1}
            className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-500 disabled:opacity-30 hover:border-gray-500 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom CTA */}
      <motion.p
        className="text-center text-sm text-gray-500 dark:text-gray-400 mt-12"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        viewport={{ once: true }}
      >
        Not sure which fits? <button onClick={handleContactClick} className="text-[var(--color-brand)] dark:text-green-400 hover:underline font-medium">Let&apos;s talk for free →</button>
      </motion.p>
    </section>
  );
}
