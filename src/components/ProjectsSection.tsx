"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import StackBadge from "./StackBadge";

const projects = [
  {
    title: "Advanced AI Chatbot",
    description:
      "Built an AI-powered chatbot for my developer portfolio using TensorFlow.js and the OpenAI API. Designed with React and TypeScript for a responsive experience, styled with Tailwind CSS, and enhanced with Framer Motion animations to deliver an engaging conversational interface.",
    tech: ["React", "TypeScript", "TensorFlow.js", "OpenAI API", "Tailwind CSS", "Framer Motion"],
    link: "https://luis-chatbot.vercel.app/"
  },
  {
    title: "ResumeAI",
    description: "A web app that analyzes resumes against job descriptions using AI, providing skill matching, missing keywords, and actionable recommendations. Highlights full-stack development, AI integration, interactive UI, and real-time insights.",
    tech: ["React", "TypeScript", "Python", "OpenAI", "Tailwind CSS", "Framer Motion", "Vercel", "Render"],
    link: "https://resume-ai-frontend-orpin.vercel.app"
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
          className={`text-sm text-gray-700 dark:text-gray-300 leading-relaxed overflow-hidden ${
            !expanded ? "line-clamp-3" : ""
          }`}
        >
          {description}
        </motion.p>
      </AnimatePresence>

      <span
        className="text-blue-600 text-sm mt-1 cursor-pointer hover:underline"
        onClick={handleToggle}
      >
        {expanded ? "See less" : "See more"}
      </span>
    </div>
  );
}

export default function ProjectsSection() {
  const [currentPage, setCurrentPage] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const handlePageChange = (newPage: number) => {
    if (newPage === currentPage || isTransitioning) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentPage(newPage);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 100);
    }, 300);
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

    if (isLeftSwipe) {
      const nextPage = Math.min(projects.length - 1, currentPage + 1);
      handlePageChange(nextPage);
    }
    
    if (isRightSwipe) {
      const prevPage = Math.max(0, currentPage - 1);
      handlePageChange(prevPage);
    }
  };

  return (
    <section id="projects" className="px-6 py-32 max-w-6xl mx-auto">
      <motion.h2
        className="text-3xl font-semibold text-center text-gray-900 dark:text-gray-100 mb-16"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        Projects
      </motion.h2>

      {/* Mobile: Single card with swipe */}
      <div className="lg:hidden">
         <div 
           className="relative overflow-hidden"
           onTouchStart={handleTouchStart}
           onTouchMove={handleTouchMove}
           onTouchEnd={handleTouchEnd}
         >
          <div className="flex transition-transform duration-300 ease-in-out" style={{ transform: `translateX(-${currentPage * 100}%)` }}>
            {projects.map((project, i) => (
              <div key={project.title} className="w-full flex-shrink-0 px-2">
                 <motion.a
                   href={project.link}
                   target="_blank"
                   rel="noopener noreferrer"
                   initial={{ opacity: 0, y: 20 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true, amount: 0.3 }}
                   transition={{ duration: 0.6, delay: i * 0.2 }}
                   className="group block h-full"
                 >
                   <Card className="rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-2 transition-transform duration-300 flex flex-col h-full p-8">
                     <div className="flex flex-col flex-grow">
                       <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                         {project.title}
                       </h3>

                       <div className="mb-6">
                         <ProjectDescription description={project.description} />
                       </div>

                       {/* Fixed height badge area - 3 lines max with natural badge sizing */}
                       <div className="mt-auto" style={{ minHeight: '96px' }}>
                         <div className="flex flex-wrap gap-2" style={{ maxHeight: '96px', overflow: 'hidden' }}>
                           {project.tech.map((tech) => (
                             <StackBadge key={tech} name={tech} />
                           ))}
                         </div>
                       </div>
                     </div>

                     {project.link && (
                       <span className="mt-6 text-[#0033A0] dark:text-white font-medium group-hover:underline self-start">
                         View Project
                       </span>
                     )}
                   </Card>
                 </motion.a>
              </div>
            ))}
          </div>
        </div>
      </div>

       {/* Desktop: Three card grid */}
       <div className="hidden lg:block relative">
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 auto-rows-fr">
          {[0, 1, 2].map((slotIndex) => {
            const projectIndex = currentPage * 3 + slotIndex;
            const project = projects[projectIndex];
            
            return (
              <div key={`${currentPage}-${slotIndex}`} className="h-full">
                {project ? (
                   <motion.a
                     href={project.link}
                     target="_blank"
                     rel="noopener noreferrer"
                     initial={{ opacity: 0, y: 20 }}
                     whileInView={{ opacity: 1, y: 0 }}
                     viewport={{ once: true, amount: 0.3 }}
                     transition={{ duration: 0.6, delay: slotIndex * 0.2 }}
                     className="group block h-full"
                   >
                     <Card className="rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-2 transition-transform duration-300 flex flex-col h-full p-8">
                       <div className="flex flex-col flex-grow">
                         <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                           {project.title}
                         </h3>

                         <div className="mb-6">
                           <ProjectDescription description={project.description} />
                         </div>

                         {/* Fixed height badge area - 3 lines max with natural badge sizing */}
                         <div className="mt-auto" style={{ minHeight: '96px' }}>
                           <div className="flex flex-wrap gap-2" style={{ maxHeight: '96px', overflow: 'hidden' }}>
                             {project.tech.map((tech) => (
                               <StackBadge key={tech} name={tech} />
                             ))}
                           </div>
                         </div>
                       </div>

                       {project.link && (
                         <span className="mt-6 text-[#0033A0] dark:text-white font-medium group-hover:underline self-start">
                           View Project
                         </span>
                       )}
                     </Card>
                   </motion.a>
                ) : (
                  <div className="h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center rounded-2xl">
                    <p className="text-gray-500 text-sm">Coming Soon</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination Controls */}
      {projects.length > 0 && (
        <div className="mt-4 text-center">
          {/* Mobile pagination */}
          <div className="lg:hidden">
            <p className="text-gray-500 text-sm mb-2">Project {currentPage + 1} of {projects.length}</p>
            
            <div className="flex items-center justify-center gap-4">
              {/* Previous button */}
              <button
                onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0 || isTransitioning}
                className={`p-2 rounded-full transition-all duration-300 ${
                  currentPage === 0 || isTransitioning
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed' 
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-500'
                }`}
                aria-label="Previous project"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Next button */}
              <button
                onClick={() => handlePageChange(Math.min(projects.length - 1, currentPage + 1))}
                disabled={currentPage === projects.length - 1 || isTransitioning}
                className={`p-2 rounded-full transition-all duration-300 ${
                  currentPage === projects.length - 1 || isTransitioning
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed' 
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-500'
                }`}
                aria-label="Next project"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Desktop pagination */}
          <div className="hidden lg:block">
            <p className="text-gray-500 text-sm mb-4">Page {currentPage + 1} of {Math.ceil(projects.length / 3)}</p>
            
            <div className="flex items-center justify-center gap-4">
              {/* Previous button */}
              <button
                onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0 || isTransitioning}
                className={`p-2 rounded-full transition-all duration-300 ${
                  currentPage === 0 || isTransitioning
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed' 
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-500'
                }`}
                aria-label="Previous page"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Pagination dots - max 5 dots */}
              <div className="flex gap-3">
                {Array.from({ length: Math.min(5, Math.ceil(projects.length / 3)) }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handlePageChange(index)}
                    disabled={isTransitioning}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      currentPage === index 
                        ? 'bg-blue-500 scale-125' 
                        : isTransitioning
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gray-400 hover:bg-gray-500'
                    }`}
                    aria-label={`Go to page ${index + 1}`}
                  />
                ))}
              </div>

              {/* Next button */}
              <button
                onClick={() => handlePageChange(Math.min(Math.ceil(projects.length / 3) - 1, currentPage + 1))}
                disabled={currentPage === Math.ceil(projects.length / 3) - 1 || isTransitioning}
                className={`p-2 rounded-full transition-all duration-300 ${
                  currentPage === Math.ceil(projects.length / 3) - 1 || isTransitioning
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed' 
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-500'
                }`}
                aria-label="Next page"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}