"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  SiReact, SiNextdotjs, SiTailwindcss, SiTypescript, SiJavascript,
  SiNodedotjs, SiExpress, SiPostgresql, SiPython, SiSanity,
  SiDocker, SiAmazon, SiVercel, SiGit, SiHtml5, SiCss3, SiPhp,
  SiMysql, SiGithub, SiZapier, SiNetlify, SiGooglecloud,
  SiTensorflow, SiFastapi, SiSupabase
} from "react-icons/si";

// Type definitions
interface TechStack {
  name: string;
  icon?: React.ComponentType<{ className?: string }>;
  category: string;
}

// Flatten all tech stacks into a single array for scrolling rows
const allTechStacks: TechStack[] = [
  { name: "React", icon: SiReact, category: "Frontend" },
  { name: "Next.js", icon: SiNextdotjs, category: "Frontend" },
  { name: "TypeScript", icon: SiTypescript, category: "Frontend" },
  { name: "JavaScript", icon: SiJavascript, category: "Frontend" },
  { name: "TailwindCSS", icon: SiTailwindcss, category: "Frontend" },
  { name: "HTML5", icon: SiHtml5, category: "Frontend" },
  { name: "CSS3", icon: SiCss3, category: "Frontend" },
  { name: "Python", icon: SiPython, category: "Backend" },
  { name: "FastAPI", icon: SiFastapi, category: "Backend" },
  { name: "Node.js", icon: SiNodedotjs, category: "Backend" },
  { name: "Express", icon: SiExpress, category: "Backend" },
  { name: "PostgreSQL", icon: SiPostgresql, category: "Backend" },
  { name: "Supabase", icon: SiSupabase, category: "Backend" },
  { name: "Sanity", icon: SiSanity, category: "Backend" },
  { name: "PHP", icon: SiPhp, category: "Backend" },
  { name: "MySQL", icon: SiMysql, category: "Backend" },
  { name: "TensorFlow", icon: SiTensorflow, category: "AI & ML" },
  { name: "Docker", icon: SiDocker, category: "DevOps & Cloud" },
  { name: "AWS", icon: SiAmazon, category: "DevOps & Cloud" },
  { name: "Vercel", icon: SiVercel, category: "DevOps & Cloud" },
  { name: "Git", icon: SiGit, category: "DevOps & Cloud" },
  { name: "GitHub", icon: SiGithub, category: "DevOps & Cloud" },
  { name: "Zapier", icon: SiZapier, category: "DevOps & Cloud" },
  { name: "Netlify", icon: SiNetlify, category: "DevOps & Cloud" },
  { name: "Google Cloud", icon: SiGooglecloud, category: "DevOps & Cloud" },
  // Add text-only fallbacks
  { name: "Java", category: "Backend" },
  { name: "C++", category: "Backend" },
  { name: "Wix", category: "Frontend" },
  { name: "Postman", category: "DevOps & Cloud" },
  { name: "ngrok", category: "DevOps & Cloud" },
];

export default function TechStacks() {
  // Split tech stacks into 3 rows
  const getRowTech = (startIndex: number): TechStack[] => {
    const rowSize = 10;
    return allTechStacks.slice(startIndex, startIndex + rowSize);
  };

  const row1 = getRowTech(0);
  const row2 = getRowTech(10);
  const row3 = getRowTech(20);

  // Duplicate arrays for seamless scrolling
  const createScrollingRow = (tech: TechStack[]): TechStack[] => [...tech, ...tech, ...tech];

  const TechItem = ({ tech }: { tech: TechStack }) => (
    <div className="flex-shrink-0 mx-4 flex flex-col items-center justify-center group cursor-pointer">
      <Card className="w-20 h-20 bg-white/20 dark:bg-white/10 backdrop-blur-md rounded-xl shadow-lg flex items-center justify-center group-hover:shadow-2xl group-hover:scale-110 transition-all duration-300 border border-white/30 dark:border-white/20 group-hover:border-white/50 dark:group-hover:border-white/40">
        <CardContent className="flex flex-col items-center justify-center p-2 h-full">
          {tech.icon ? (
            <tech.icon className="text-2xl mb-1 text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300" />
          ) : (
            <div className="w-8 h-8 border-2 border-gray-300 dark:border-white/40 rounded-lg flex items-center justify-center text-gray-600 dark:text-white font-bold text-sm mb-1 group-hover:border-blue-500 dark:group-hover:border-blue-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:scale-110 transition-all duration-300">
              {tech.name.charAt(0)}
            </div>
          )}
          <span className="text-xs font-medium text-gray-700 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 whitespace-nowrap text-center">
            {tech.name}
          </span>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <section id="tech-stacks" className="w-full py-16 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Tech Stacks
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Technologies and tools I use to build exceptional digital experiences
          </p>
        </motion.div>

        {/* Scrolling Rows Container */}
        <div className="relative space-y-0">
          
          {/* Row 1 - Left to Right */}
          <div className="relative overflow-hidden py-8 fade-container">
            <div className="flex animate-scroll-left">
              {createScrollingRow(row1).map((tech, index) => (
                <TechItem key={`row1-${index}`} tech={tech} />
              ))}
            </div>
          </div>

          {/* Row 2 - Right to Left */}
          <div className="relative overflow-hidden py-8 fade-container">
            <div className="flex animate-scroll-right">
              {createScrollingRow(row2).map((tech, index) => (
                <TechItem key={`row2-${index}`} tech={tech} />
              ))}
            </div>
          </div>

          {/* Row 3 - Left to Right (Slower) */}
          <div className="relative overflow-hidden py-8 fade-container">
            <div className="flex animate-scroll-left-slow">
              {createScrollingRow(row3).map((tech, index) => (
                <TechItem key={`row3-${index}`} tech={tech} />
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Custom CSS for smooth scrolling animations and fade effect */}
      <style jsx>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }

        @keyframes scroll-right {
          0% {
            transform: translateX(-33.333%);
          }
          100% {
            transform: translateX(0);
          }
        }

        @keyframes scroll-left-slow {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }

        .animate-scroll-left {
          animation: scroll-left 20s linear infinite;
        }

        .animate-scroll-right {
          animation: scroll-right 25s linear infinite;
        }

        .animate-scroll-left-slow {
          animation: scroll-left-slow 30s linear infinite;
        }

        /* Faster animations on mobile */
        @media (max-width: 768px) {
          .animate-scroll-left {
            animation: scroll-left 12s linear infinite;
          }

          .animate-scroll-right {
            animation: scroll-right 15s linear infinite;
          }

          .animate-scroll-left-slow {
            animation: scroll-left-slow 18s linear infinite;
          }
        }

        /* Pause animation on hover */
        .animate-scroll-left:hover,
        .animate-scroll-right:hover,
        .animate-scroll-left-slow:hover {
          animation-play-state: paused;
        }

        /* Fade effect for left and right edges using CSS masks */
        .fade-container {
          mask: linear-gradient(
            to right,
            transparent 0%,
            rgba(0, 0, 0, 0.1) 2%,
            rgba(0, 0, 0, 0.3) 5%,
            rgba(0, 0, 0, 0.6) 8%,
            rgba(0, 0, 0, 0.8) 12%,
            black 15%,
            black 85%,
            rgba(0, 0, 0, 0.8) 88%,
            rgba(0, 0, 0, 0.6) 92%,
            rgba(0, 0, 0, 0.3) 95%,
            rgba(0, 0, 0, 0.1) 98%,
            transparent 100%
          );
          -webkit-mask: linear-gradient(
            to right,
            transparent 0%,
            rgba(0, 0, 0, 0.1) 2%,
            rgba(0, 0, 0, 0.3) 5%,
            rgba(0, 0, 0, 0.6) 8%,
            rgba(0, 0, 0, 0.8) 12%,
            black 15%,
            black 85%,
            rgba(0, 0, 0, 0.8) 88%,
            rgba(0, 0, 0, 0.6) 92%,
            rgba(0, 0, 0, 0.3) 95%,
            rgba(0, 0, 0, 0.1) 98%,
            transparent 100%
          );
        }
      `}</style>
    </section>
  );
}