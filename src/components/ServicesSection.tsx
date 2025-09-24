"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Globe, Zap } from "lucide-react";

interface ServiceFeature {
  name: string;
  included: boolean;
}

interface ServiceTier {
  name: string;
  description: string;
  pricePHP: number;
  priceUSD: number;
  features: ServiceFeature[];
  support: string;
  icon: React.ReactNode;
  popular?: boolean;
}

const services: ServiceTier[] = [
  {
    name: "Starter",
    description: "Perfect for small businesses and personal projects",
    pricePHP: 22000,
    priceUSD: 599,
    icon: <Globe className="w-6 h-6" />,
    features: [
      { name: "Responsive, Modern Website", included: true },
      { name: "Up to 5 Custom Pages", included: true },
      { name: "Contact Form for Inquiries", included: true },
      { name: "Basic SEO Setup for Visibility", included: true },
      { name: "Mobile-First Optimization", included: true },
      { name: "Scalable Hosting & Free Domain", included: true },
      { name: "Social Media Links", included: false },
      { name: "E-commerce Functionality", included: false },
      { name: "Custom Backend Development", included: false },
    ],
    support: "7-Day Standard Support",
  },
  {
    name: "Professional",
    description: "Ideal for growing businesses and professional services",
    pricePHP: 45000,
    priceUSD: 1199,
    icon: <Zap className="w-6 h-6" />,
    popular: true,
    features: [
      { name: "Responsive, Modern Website", included: true },
      { name: "Up to 15 Custom Pages", included: true },
      { name: "Contact Form with Lead Capture", included: true },
      { name: "Advanced SEO Setup", included: true },
      { name: "Mobile-First Optimization", included: true },
      { name: "Scalable Hosting & Free Domain", included: true },
      { name: "Integrated Social Media Feeds", included: true },
      { name: "Shopify E-commerce Store", included: true },
      { name: "Custom Backend Development", included: false },
    ],
    support: "14-Day Enhanced Support",
  },
  {
    name: "Enterprise",
    description: "Complete solution for large organizations and complex projects",
    pricePHP: 100000,
    priceUSD: 2999,
    icon: <Zap className="w-6 h-6" />,
    features: [
      { name: "Fully Responsive, Tailored Website", included: true },
      { name: "Unlimited Pages & Layouts", included: true },
      { name: "Custom Inquiry & Lead Forms", included: true },
      { name: "Enterprise-Grade SEO Setup", included: true },
      { name: "Advanced Mobile Performance", included: true },
      { name: "Scalable Hosting & Free Domain", included: true },
      { name: "Full Social Media Integration", included: true },
      { name: "E-commerce with Advanced Features", included: true },
      { name: "Custom Backend & API Integrations", included: true },
    ],
    support: "30-Day Priority Support",
  },
];

export default function ServicesSection() {
  return (
    <section id="services" className="py-16 px-6 max-w-7xl mx-auto">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
        Build Your Website, Your Way
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose the perfect package for your business needs. All plans include modern design, 
          mobile optimization, and professional support.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8 mb-12">
        {services.map((service, index) => (
          <motion.div
            key={service.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <motion.div
              className={`cursor-pointer transition-all duration-300 ${
                service.popular 
                  ? 'transform scale-105' 
                  : 'hover:scale-102'
              }`}
              whileHover={{ y: -5 }}
              onClick={() => {
                if (window.Calendly?.showPopupWidget) {
                  window.Calendly.showPopupWidget('https://calendly.com/antonioluis-santos1/30min');
                } else {
                  window.open('https://calendly.com/antonioluis-santos1/30min', '_blank', 'noopener,noreferrer');
                }
              }}
            >
              {service.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10 flex justify-center">
                  <span className="bg-[#0033A0] text-white px-4 py-1 rounded-full text-sm font-medium shadow-lg">
                    Most Popular
                  </span>
                </div>
              )}
              <Card className={`h-full transition-all duration-300 hover:shadow-lg overflow-hidden ${
                service.popular 
                  ? 'border-[#0033A0] shadow-lg' 
                  : 'hover:border-[#0033A0]/50'
              }`}>
                <CardHeader className="text-center pb-3">
                  <div className="flex justify-center mb-3">
                    <div className={`p-2 rounded-full ${
                      service.popular 
                        ? 'bg-[#0033A0] text-white' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      {service.icon}
                    </div>
                  </div>
                  <CardTitle className="text-xl">{service.name}</CardTitle>
                  <p className="text-muted-foreground text-xs">
                    {service.description}
                  </p>
                </CardHeader>
                
                <CardContent className="pt-0 flex flex-col h-full">
                  <div className="text-center mb-4">
                    <div className="text-2xl font-bold mb-1">
                      Starts at ₱{service.pricePHP.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground mb-1">
                      ${service.priceUSD.toLocaleString()} (Overseas)
                    </div>
                    <div className="text-xs text-muted-foreground">
                      One-time payment
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 flex-grow">
                    {service.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center justify-between">
                        <span className="text-xs">{feature.name}</span>
                        {feature.included ? (
                          <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                        ) : (
                          <X className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="bg-green-50 dark:bg-green-950/20 p-2 rounded">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-xs font-medium text-green-800 dark:text-green-200">
                          Support
                        </span>
                      </div>
                      <p className="text-xs text-green-700 dark:text-green-300">
                        {service.support}
                      </p>
                    </div>
                    
                  </div>

                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Call to Action */}
      <motion.div
        className="text-center mt-16"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        viewport={{ once: true }}
      >
        <div className="bg-gradient-to-r from-[#0033A0] to-[#002A8A] rounded-lg p-6 max-w-4xl mx-auto text-white">
          <h3 className="text-xl font-bold mb-2">Ready to Get Started?</h3>
          <p className="text-sm opacity-90">
            Click any tier above to schedule a consultation. All packages include 30-day support.
          </p>
        </div>
      </motion.div>
    </section>
  );
}
