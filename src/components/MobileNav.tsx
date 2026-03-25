"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Home, User, Briefcase, Code, FolderOpen, FlaskConical, DollarSign, BookOpen, Mail } from "lucide-react";
import { useScrollY } from "@/contexts/ScrollContext";

const navItems = [
  { id: "home",       label: "Home",       icon: Home },
  { id: "about",      label: "About",      icon: User },
  { id: "experience", label: "Experience", icon: Briefcase },
  { id: "skills",     label: "Skills",     icon: Code },
  { id: "projects",   label: "Projects",   icon: FolderOpen },
  { id: "lab",        label: "Lab",        icon: FlaskConical },
  { id: "services",   label: "Services",   icon: DollarSign },
  { id: "blog",       label: "Blog",       icon: BookOpen },
  { id: "contact",    label: "Contact",    icon: Mail },
];

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const { subscribe } = useScrollY();

  useEffect(() => {
    const unsubscribe = subscribe((scrollY) => {
      const sections = navItems.map(item => document.getElementById(item.id));
      const scrollPosition = scrollY + 100;
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(navItems[i].id);
          break;
        }
      }
    });
    return unsubscribe;
  }, [subscribe]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Bottom bar — mobile only */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 safe-area-pb">
        <div className="flex items-center justify-between px-6 h-14">
          {/* Show first 4 nav items as quick icons */}
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
                  isActive
                    ? "text-[var(--color-brand)]"
                    : "text-gray-600 dark:text-gray-300"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}

          {/* Menu button */}
          <button
            onClick={() => setIsOpen(true)}
            className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-gray-600 dark:text-gray-300"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </div>

      {/* Bottom sheet overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-50 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 dark:border-gray-800">
                <span className="font-semibold text-gray-900 dark:text-gray-100">Navigate</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Close navigation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Nav items grid */}
              <div className="grid grid-cols-3 gap-2 p-4 pb-8">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${
                        isActive
                          ? "bg-[var(--color-brand)] text-white"
                          : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
