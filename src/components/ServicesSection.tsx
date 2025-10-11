"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Code, Briefcase, Zap } from "lucide-react";

interface ServiceTier {
  name: string;
  description: string;
  pricePHP: number;
  priceUSD: number;
  commonFeatures: string[];
  exclusiveFeatures: string[];
  icon: React.ReactNode;
  popular?: boolean;
}

const services: ServiceTier[] = [
  {
    name: "Starter",
    description: "Perfect for small businesses",
    pricePHP: 22000,
    priceUSD: 599,
    icon: <Code className="w-5 h-5 sm:w-7 sm:h-7" />,
    commonFeatures: [
      "Responsive Modern Website",
      "Contact Form Integration",
      "SEO Setup",
      "Mobile Optimization",
      "Hosting & Domain Setup"
    ],
    exclusiveFeatures: [
      "Up to 5 Custom Pages",
      "Basic Design Customization",
      "Standard Performance Optimization",
      "Basic SEO: Meta tags, sitemap, Google Analytics setup",
      "7-Day Standard Support via email",
      "Basic documentation and handover"
    ],
  },
  {
    name: "Professional",
    description: "Ideal for growing businesses",
    pricePHP: 45000,
    priceUSD: 1199,
    icon: <Briefcase className="w-5 h-5 sm:w-7 sm:h-7" />,
    commonFeatures: [
      "Responsive Modern Website",
      "Contact Form Integration",
      "SEO Setup",
      "Mobile Optimization",
      "Hosting & Domain Setup"
    ],
    exclusiveFeatures: [
      "Up to 15 Custom Pages",
      "Advanced SEO Setup",
      "E-commerce Integration with payment gateways",
      "Advanced Design Customization",
      "Performance Analytics Dashboard",
      "Social Media Integration",
      "Advanced SEO: Keyword research, content optimization, schema markup",
      "14-Day Enhanced Support via email and chat",
      "Priority response time (24-48 hours)",
      "Detailed documentation and training session"
    ],
  },
  {
    name: "Enterprise",
    description: "Complete enterprise solutions",
    pricePHP: 100000,
    priceUSD: 2999,
    icon: <Zap className="w-5 h-5 sm:w-7 sm:h-7" />,
    commonFeatures: [
      "Responsive Modern Website",
      "Contact Form Integration",
      "SEO Setup",
      "Mobile Optimization",
      "Hosting & Domain Setup"
    ],
    exclusiveFeatures: [
      "Unlimited Custom Pages",
      "Enterprise SEO Setup",
      "Custom Backend Development",
      "Advanced E-commerce Features",
      "API Integrations",
      "Custom Analytics Dashboard",
      "Enterprise SEO: Complete strategy, technical SEO audit, ongoing optimization",
      "30-Day Priority Support via email, chat, and phone",
      "Dedicated project manager",
      "Weekly progress reports",
      "Full documentation, training, and ongoing consultation"
    ],
  },
];

export default function ServicesSection() {
  const [selectedTier, setSelectedTier] = useState<string | null>(services[0].name);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right'>('right');

  const handleTierClick = (tierName: string) => {
    setSelectedTier(tierName);
  };

  const handleContactClick = () => {
    if (window.Calendly?.showPopupWidget) {
      window.Calendly.showPopupWidget('https://calendly.com/antonioluis-santos1/30min');
    } else {
      window.open('https://calendly.com/antonioluis-santos1/30min', '_blank', 'noopener,noreferrer');
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentSlide < services.length - 1) {
      setSwipeDirection('left');
      const newSlide = currentSlide + 1;
      setCurrentSlide(newSlide);
      setSelectedTier(services[newSlide].name);
    }
    
    if (isRightSwipe && currentSlide > 0) {
      setSwipeDirection('right');
      const newSlide = currentSlide - 1;
      setCurrentSlide(newSlide);
      setSelectedTier(services[newSlide].name);
    }
  };

  const handleArrowClick = (direction: 'left' | 'right') => {
    setSwipeDirection(direction);
    if (direction === 'left' && currentSlide < services.length - 1) {
      const newSlide = currentSlide + 1;
      setCurrentSlide(newSlide);
      setSelectedTier(services[newSlide].name);
    }
    if (direction === 'right' && currentSlide > 0) {
      const newSlide = currentSlide - 1;
      setCurrentSlide(newSlide);
      setSelectedTier(services[newSlide].name);
    }
  };

  const currentService = services.find(service => service.name === selectedTier) || services[0];

  return (
    <section id="services" className="py-16 px-6 max-w-6xl mx-auto">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 dark:text-gray-100 mb-4 tracking-tight font-sf-pro">
          Services & Pricing
        </h2>
        <p className="max-w-2xl mx-auto text-gray-600 dark:text-gray-400">
          Choose the perfect solution for your business needs. All packages include modern design, 
          mobile optimization, and professional support.
        </p>
      </motion.div>

      {/* Service Tiers */}
      <div className="mb-8">
        {/* Mobile Carousel */}
        <div className="block lg:hidden">
          <div 
            className="relative px-4 md:px-6"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <motion.div
              key={currentSlide}
              initial={{ 
                opacity: 0, 
                x: swipeDirection === 'left' ? 50 : -50 
              }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ 
                opacity: 0, 
                x: swipeDirection === 'left' ? -50 : 50 
              }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-full relative"
            >
              <div
                className={`flex items-center justify-between px-8 py-6 border cursor-pointer rounded-xl transition-all duration-300 hover:shadow-lg h-full border-blue-500 bg-blue-50 dark:bg-blue-950/20`}
              >
                <div className="flex flex-col items-center space-y-1">
                  <motion.div 
                    className="text-blue-600 dark:text-blue-500"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    {services[currentSlide].icon}
                  </motion.div>
                  <motion.h3 
                    className="text-lg font-medium text-gray-900 dark:text-gray-100"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                  >
                    {services[currentSlide].name}
                  </motion.h3>
                  <motion.p 
                    className="text-xs text-gray-500 dark:text-gray-400 text-center"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    {services[currentSlide].description}
                  </motion.p>
                </div>

                <div className="flex flex-col items-center space-y-1">
                  <motion.h4 
                    className="text-xl font-semibold text-blue-600 dark:text-blue-500"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    ₱{services[currentSlide].pricePHP.toLocaleString()}
                  </motion.h4>
                  <motion.p 
                    className="text-xs text-gray-500 dark:text-gray-400"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                  >
                    ${services[currentSlide].priceUSD.toLocaleString()} (Overseas)
                  </motion.p>
                </div>
              </div>
            </motion.div>

            {/* Left Overlay Arrow */}
            {currentSlide > 0 && (
              <button
                onClick={() => handleArrowClick('right')}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white/70 dark:bg-gray-800/70 rounded-full shadow-lg border border-gray-200/50 dark:border-gray-600/50 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200 z-20"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Right Overlay Arrow */}
            {currentSlide < services.length - 1 && (
              <button
                onClick={() => handleArrowClick('left')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white/70 dark:bg-gray-800/70 rounded-full shadow-lg border border-gray-200/50 dark:border-gray-600/50 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200 z-20"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Desktop Grid */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-6 xl:gap-8">
          {services.map((service, index) => (
            <motion.div
              key={service.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="h-full"
            >
              <div
                className={`flex items-center justify-between px-6 py-4 border cursor-pointer rounded-xl transition-all duration-300 hover:shadow-lg h-full ${
                  selectedTier === service.name
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => handleTierClick(service.name)}
              >
                <div className="flex flex-col items-center space-y-1">
                  <div className={`${
                    selectedTier === service.name
                      ? 'text-blue-600 dark:text-blue-500' 
                      : 'text-gray-400'
                  }`}>
                    {service.icon}
                  </div>
                  <h3 className={`text-lg font-medium sm:text-xl ${
                    selectedTier === service.name
                      ? 'text-gray-900 dark:text-gray-100' 
                      : 'text-gray-700 dark:text-gray-200'
                  }`}>
                    {service.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    {service.description}
                  </p>
                </div>

                <div className="flex flex-col items-center space-y-1">
                  <h4 className={`text-xl font-semibold sm:text-2xl ${
                    selectedTier === service.name
                      ? 'text-blue-600 dark:text-blue-500' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    ₱{service.pricePHP.toLocaleString()}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ${service.priceUSD.toLocaleString()} (Overseas)
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Features Comparison */}
      <motion.div
        className="p-6 md:p-8 mt-8 bg-gray-50 dark:bg-gray-800 rounded-xl"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        viewport={{ once: true }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Common Features */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 text-center md:text-left">
              Included in All Plans
            </h3>
            
            <div className="space-y-4">
              {currentService.commonFeatures.map((feature, index) => (
                <div key={index} className="flex items-center text-gray-800 dark:text-gray-200">
                  <Check className="w-5 h-5 text-blue-500 mr-4 flex-shrink-0" />
                  <p className="text-sm sm:text-base font-medium">{feature}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Exclusive Features */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 text-center md:text-left">
              What You Also Get
            </h3>
            
            <div className="space-y-3">
              {currentService.exclusiveFeatures.map((feature, featureIndex) => (
                <div key={featureIndex} className="flex items-start text-gray-800 dark:text-gray-200">
                  <Check className="w-4 h-4 text-blue-500 mr-3 flex-shrink-0 mt-1" />
                  <p className="text-sm font-medium">{feature}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Call to Action */}
      <motion.div
        className="flex justify-center mt-8"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        viewport={{ once: true }}
      >
        <button
          onClick={handleContactClick}
          className="px-8 py-3 tracking-wide text-white capitalize transition-colors duration-300 transform bg-blue-600 rounded-lg hover:bg-blue-500 focus:outline-none focus:bg-blue-500 focus:ring focus:ring-blue-300 focus:ring-opacity-80 font-medium font-sf-pro"
        >
          Schedule Consultation
        </button>
      </motion.div>
    </section>
  );
}