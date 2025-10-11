"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import StackBadge from "./StackBadge";

const projects = [
  {
    title: "Advanced Chatbot",
    description:
      "Built a chatbot for my developer portfolio using TensorFlow.js and the OpenAI API. Designed with React and TypeScript for a responsive experience, styled with Tailwind CSS, and enhanced with Framer Motion animations to deliver an engaging conversational interface.",
    tech: ["React", "TypeScript", "TensorFlow.js", "OpenAI API", "Tailwind CSS", "Framer Motion"],
    link: "https://luis-chatbot.vercel.app/"
  },
  {
    title: "Resume Analyzer",
    description: "A web app that analyzes resumes against job descriptions, providing skill matching, missing keywords, and actionable recommendations. Highlights full-stack development, interactive UI, and real-time insights.",
    tech: ["React", "TypeScript", "Python", "OpenAI", "Tailwind CSS", "Framer Motion", "Vercel", "Render"],
    link: "https://resume-ai-frontend-orpin.vercel.app"
  },
  { 
    title: "Voice Assistant", 
    description: "Real-time voice conversation application with streaming speech synthesis and natural language processing. Features live audio streaming, WebRTC communication, and intelligent speech recognition with seamless browser compatibility.", 
    tech: ["React", "TypeScript", "Python FastAPI", "LiveKit", "OpenAI Whisper", "WebRTC", "WebSocket", "Vercel", "Render"], 
    link: "https://voice-ai-braincx.vercel.app/"
  },
  { 
    title: "Pilates With Bee", 
    description: "Built an online Pilates clinic platform for scheduling sessions, managing content, and providing virtual consultations. Integrated headless CMS and automation tools for streamlined client management.", 
    tech: ["Next.js", "React", "Tailwind CSS", "Sanity CMS", "Zapier", "Vercel"], 
    link: "https://pilates-w-bee.vercel.app/"
  },
  { 
    title: "VA Portfolio Sample", 
    description: "Professional virtual assistant portfolio website with functional contact form, email automation, and modern UI. Features responsive design, interactive animations, and automated email notifications for client inquiries.", 
    tech: ["Next.js 15", "TypeScript", "Tailwind CSS", "Framer Motion", "Resend API", "GSAP", "Swiper", "Vercel"], 
    link: "https://va-portfolio-sample.vercel.app/"
  },
];

// Fill tile component for the 6th slot
function FillTile({ hasMoreProjects }: { hasMoreProjects: boolean }) {
  return (
    <div
      className="group"
    >
      <Card className="rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col h-full overflow-hidden border border-gray-200 dark:border-gray-700">
        <div 
          className="flex flex-col items-center justify-center text-center flex-grow relative p-6"
          style={{
            backgroundImage: 'linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.6) 100%), url(/projects-bg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          
          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            <h3 className="text-lg font-semibold text-white mb-2 font-sf-pro drop-shadow-md">
              {hasMoreProjects ? "Show All" : "More Projects Coming Soon"}
            </h3>
            <p className="text-sm text-white drop-shadow-sm">
              {hasMoreProjects ? "View all projects" : "Stay tuned for more exciting projects"}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ProjectDescription({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = (event: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
    event.preventDefault();
    event.stopPropagation();
    setExpanded((prev) => !prev);
  };

  return (
    <div className="flex flex-col">
      <AnimatePresence initial={false}>
        <motion.p
          key={expanded ? "expanded" : "collapsed"}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className={`text-sm text-gray-600 dark:text-gray-400 leading-relaxed overflow-hidden ${
            !expanded ? "line-clamp-3" : ""
          }`}
        >
          {description}
        </motion.p>
      </AnimatePresence>

      <span
        className="text-gray-700 dark:text-gray-300 text-sm mt-2 cursor-pointer hover:underline font-medium"
        onClick={handleToggle}
      >
        {expanded ? "See less" : "See more"}
      </span>
    </div>
  );
}

function ProjectCard({ project }: { project: typeof projects[0] }) {
  return (
    <div className="group block h-full">
      <Card className="rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col h-full p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <div className="flex flex-col flex-grow">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 leading-tight font-sf-pro mb-4">
            {project.title}
          </h3>

          <div className="mb-6 flex-grow">
            <ProjectDescription description={project.description} />
          </div>

          <div className="mt-auto">
            <div className="flex flex-wrap gap-2 mb-4">
              {project.tech.map((tech) => (
                <StackBadge key={tech} name={tech} />
              ))}
            </div>

            <a
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-gray-700 dark:text-gray-300 font-medium hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <span>View Project</span>
              <svg className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function ProjectsSection() {
  const [showAll, setShowAll] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  const displayedProjects = showAll ? projects : projects.slice(0, 5);
  const hasMoreProjects = projects.length >= 7;
  
  // Mobile carousel logic
  const allItems = [...displayedProjects.map(p => ({ ...p, isFillTile: false }))];
  if (!showAll && hasMoreProjects) {
    allItems.push({ title: "Show All", description: "View all projects", tech: [], link: "", isFillTile: true });
  }

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

    if (isLeftSwipe && currentSlide < allItems.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
    
    if (isRightSwipe && currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const nextSlide = () => {
    if (currentSlide < allItems.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <section id="projects" className="px-4 md:px-6 py-20 md:py-32 max-w-6xl mx-auto">
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-4xl md:text-5xl font-semibold text-gray-900 dark:text-gray-100 mb-4 tracking-tight font-sf-pro">
          Projects
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          A showcase of my latest work, featuring modern web applications built with cutting-edge technologies.
        </p>
      </motion.div>

      {/* Mobile Carousel */}
      <div className="block md:hidden">
        <div 
          className="relative overflow-hidden rounded-2xl"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div 
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {allItems.map((item) => {
              if (item.isFillTile) {
                return (
                  <div key="fill-tile" className="w-full flex-shrink-0 px-4">
                    <FillTile 
                      hasMoreProjects={hasMoreProjects}
                    />
                  </div>
                );
              }
              return (
                <div key={item.title} className="w-full flex-shrink-0 px-4">
                  <ProjectCard project={item} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="flex items-center justify-center mt-6 gap-4">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className={`p-2 rounded-full transition-all duration-300 ${
              currentSlide === 0
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed' 
                : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Dots indicator */}
          <div className="flex gap-2">
            {allItems.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  currentSlide === index 
                    ? 'bg-gray-600 dark:bg-gray-400 scale-125' 
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>

          <button
            onClick={nextSlide}
            disabled={currentSlide === allItems.length - 1}
            className={`p-2 rounded-full transition-all duration-300 ${
              currentSlide === allItems.length - 1
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed' 
                : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Slide counter */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
          {currentSlide + 1} of {allItems.length}
        </p>
      </div>

      {/* Desktop Grid Layout */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedProjects.map((project) => (
          <ProjectCard key={project.title} project={project} />
        ))}
        
        {/* Show fill tile only when not showing all projects */}
        {!showAll && (
          <FillTile 
            hasMoreProjects={hasMoreProjects}
          />
        )}
      </div>

      {/* Desktop View All Button - only show if projects >= 7 */}
      {hasMoreProjects && (
        <motion.div
          className="hidden md:block text-center mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <button
            onClick={() => setShowAll(!showAll)}
            className="px-8 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-full transition-all duration-300 hover:scale-105 font-sf-pro"
          >
            {showAll ? "Show Less" : "View All Projects"}
          </button>
        </motion.div>
      )}
    </section>
  );
}